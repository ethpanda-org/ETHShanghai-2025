// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

interface ICTF {
    function safeTransferFrom(
        address from,
        address to,
        uint256 id,
        uint256 amount,
        bytes calldata data
    ) external;

    function getTokenId(bytes32 conditionId, uint256 index) external pure returns (uint256);

    function setApprovalForAll(address operator, bool approved) external;

    function isApprovedForAll(address account, address operator) external view returns (bool);
}

interface IStakingBribe {
    function stakePermanent(bytes32 conditionId, uint8 outcome, uint256 amount) external;
    function increaseAmount(bytes32 conditionId, uint8 outcome, uint256 additionalAmount) external;
    function claimRewards(bytes32 conditionId, uint8 outcome) external;
    function pendingBribes(bytes32 conditionId, uint8 outcome, address user) external view returns (uint256);
}

interface IBribeManager {
    function claimBribePool(uint256 bribePoolId) external;
    function pendingBribeRewards(uint256 bribePoolId, address user) external view returns (uint256);
    function getBribePoolsByMarket(bytes32 conditionId, uint8 outcome) external view returns (uint256[] memory);
}

/**
 * @title PonyProtocol
 * @notice Liquid staking wrapper for prediction market positions
 * @dev Users deposit CTF position tokens, receive tradeable ERC1155 ponyTokens
 *      Protocol permanently locks positions and auto-claims rewards
 */
contract PonyProtocol is ERC1155, ERC1155Holder, Ownable {
    using SafeERC20 for IERC20;

    ICTF public immutable ctf;
    IStakingBribe public immutable stakingBribe;
    IBribeManager public immutable bribeManager;

    // Token ID structure: conditionId hash + outcome (0 or 1)
    // tokenId = uint256(keccak256(abi.encodePacked(conditionId, outcome)))

    struct Position {
        bytes32 conditionId;
        uint8 outcome;
        uint256 totalDeposited;      // Total CTF tokens deposited
        uint256 totalPonyMinted;     // Total pony tokens minted (should equal totalDeposited)
        uint256 accBribePerShare;    // Accumulated bribe per share (StakingBribe)
        uint256 lastBribeUpdate;     // Last time bribes were harvested
    }

    struct BribePoolInfo {
        uint256 accRewardPerShare;   // Accumulated reward per share for this pool
        uint256 lastUpdate;          // Last harvest timestamp
    }

    // tokenId => Position
    mapping(uint256 => Position) public positions;

    // tokenId => user => pending rewards (from StakingBribe)
    mapping(uint256 => mapping(address => uint256)) public userPendingBribes;

    // tokenId => bribePoolId => BribePoolInfo
    mapping(uint256 => mapping(uint256 => BribePoolInfo)) public bribePoolInfo;

    // tokenId => user => bribePoolId => debt
    mapping(uint256 => mapping(address => mapping(uint256 => uint256))) public userBribeDebt;

    event Deposit(
        address indexed user,
        bytes32 indexed conditionId,
        uint8 outcome,
        uint256 amount,
        uint256 tokenId
    );

    event Withdraw(
        address indexed user,
        bytes32 indexed conditionId,
        uint8 outcome,
        uint256 amount,
        uint256 tokenId
    );

    event BribesHarvested(
        bytes32 indexed conditionId,
        uint8 outcome,
        uint256 amount
    );

    event BribesClaimed(
        address indexed user,
        uint256 indexed tokenId,
        uint256 amount
    );

    constructor(
        address _ctf,
        address _stakingBribe,
        address _bribeManager
    ) ERC1155("https://pony.xyz/api/token/{id}.json") Ownable(msg.sender) {
        ctf = ICTF(_ctf);
        stakingBribe = IStakingBribe(_stakingBribe);
        bribeManager = IBribeManager(_bribeManager);
    }

    /**
     * @notice Calculate token ID for a market position
     */
    function getTokenId(bytes32 conditionId, uint8 outcome) public pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(conditionId, outcome)));
    }

    /**
     * @notice Deposit CTF position tokens and receive pony tokens
     * @param conditionId Market condition ID
     * @param outcome 0 = NO, 1 = YES
     * @param amount Amount of CTF tokens to deposit
     */
    function deposit(bytes32 conditionId, uint8 outcome, uint256 amount) external {
        require(outcome <= 1, "Invalid outcome");
        require(amount > 0, "Amount must be positive");

        uint256 tokenId = getTokenId(conditionId, outcome);
        Position storage pos = positions[tokenId];

        // Initialize position if first deposit
        if (pos.conditionId == bytes32(0)) {
            pos.conditionId = conditionId;
            pos.outcome = outcome;
        }

        // Harvest pending bribes before changing balances
        _harvestBribes(tokenId);

        // Update user's pending bribes before minting
        _updateUserBribes(tokenId, msg.sender);

        // Transfer CTF tokens from user
        uint256 ctfTokenId = ctf.getTokenId(conditionId, outcome);
        ctf.safeTransferFrom(msg.sender, address(this), ctfTokenId, amount, "");

        // Approve StakingBribe if not already approved
        if (!ctf.isApprovedForAll(address(this), address(stakingBribe))) {
            ctf.setApprovalForAll(address(stakingBribe), true);
        }

        // Permanently lock in StakingBribe (use increaseAmount if position exists)
        if (pos.totalDeposited > 0) {
            stakingBribe.increaseAmount(conditionId, outcome, amount);
        } else {
            stakingBribe.stakePermanent(conditionId, outcome, amount);
        }

        // Mint pony tokens to user
        _mint(msg.sender, tokenId, amount, "");

        // Update position
        pos.totalDeposited += amount;
        pos.totalPonyMinted += amount;

        emit Deposit(msg.sender, conditionId, outcome, amount, tokenId);
    }

    /**
     * @notice Claim accumulated bribe rewards for a position
     * @param tokenId The pony token ID
     */
    function claimBribes(uint256 tokenId) external {
        require(balanceOf(msg.sender, tokenId) > 0, "No pony tokens");

        // Harvest protocol bribes first
        _harvestBribes(tokenId);

        // Update and transfer user bribes
        _updateUserBribes(tokenId, msg.sender);

        uint256 pending = userPendingBribes[tokenId][msg.sender];
        if (pending > 0) {
            userPendingBribes[tokenId][msg.sender] = 0;
            // Transfer USDC rewards
            // TODO: Need to track reward token address
            emit BribesClaimed(msg.sender, tokenId, pending);
        }
    }

    /**
     * @notice Harvest bribes from StakingBribe for a position
     * @dev Can be called by anyone to compound rewards
     */
    function harvestBribes(bytes32 conditionId, uint8 outcome) external {
        uint256 tokenId = getTokenId(conditionId, outcome);
        _harvestBribes(tokenId);
    }

    /**
     * @notice Harvest bribes from BribeManager pools
     * @param conditionId Market condition ID
     * @param outcome 0 = NO, 1 = YES
     */
    function harvestBribeManager(bytes32 conditionId, uint8 outcome) external {
        uint256 tokenId = getTokenId(conditionId, outcome);

        // Get all bribe pools for this market
        uint256[] memory poolIds = bribeManager.getBribePoolsByMarket(conditionId, outcome);

        Position storage pos = positions[tokenId];
        require(pos.totalDeposited > 0, "No deposits");

        for (uint256 i = 0; i < poolIds.length; i++) {
            uint256 poolId = poolIds[i];

            // Check pending rewards
            uint256 pending = bribeManager.pendingBribeRewards(poolId, address(this));

            if (pending > 0) {
                // Claim from pool
                bribeManager.claimBribePool(poolId);

                // Update accumulated rewards per share
                BribePoolInfo storage poolInfo = bribePoolInfo[tokenId][poolId];
                poolInfo.accRewardPerShare += (pending * 1e18) / pos.totalDeposited;
                poolInfo.lastUpdate = block.timestamp;
            }
        }
    }

    /**
     * @notice Claim rewards from specific BribeManager pool
     * @param tokenId The pony token ID
     * @param poolId The bribe pool ID
     */
    function claimBribePool(uint256 tokenId, uint256 poolId) external {
        uint256 userBalance = balanceOf(msg.sender, tokenId);
        require(userBalance > 0, "No pony tokens");

        BribePoolInfo storage poolInfo = bribePoolInfo[tokenId][poolId];
        uint256 userDebt = userBribeDebt[tokenId][msg.sender][poolId];

        uint256 pending = (userBalance * poolInfo.accRewardPerShare / 1e18) - userDebt;

        if (pending > 0) {
            // Update debt
            userBribeDebt[tokenId][msg.sender][poolId] = userBalance * poolInfo.accRewardPerShare / 1e18;

            // Transfer rewards (need to determine token address)
            emit BribesClaimed(msg.sender, tokenId, pending);
        }
    }

    /**
     * @notice Get pending bribe rewards for user
     */
    function pendingBribeRewards(uint256 tokenId, address user) external view returns (uint256) {
        Position storage pos = positions[tokenId];
        if (pos.totalDeposited == 0) return 0;

        uint256 userBalance = balanceOf(user, tokenId);
        if (userBalance == 0) return 0;

        // Get pending from StakingBribe
        uint256 protocolPending = stakingBribe.pendingBribes(
            pos.conditionId,
            pos.outcome,
            address(this)
        );

        // Calculate user's share
        uint256 newAccPerShare = pos.accBribePerShare;
        if (protocolPending > 0 && pos.totalDeposited > 0) {
            newAccPerShare += (protocolPending * 1e18) / pos.totalDeposited;
        }

        uint256 userShare = (userBalance * newAccPerShare) / 1e18;
        return userShare + userPendingBribes[tokenId][user];
    }

    /**
     * @dev Internal function to harvest bribes from StakingBribe
     */
    function _harvestBribes(uint256 tokenId) internal {
        Position storage pos = positions[tokenId];
        if (pos.totalDeposited == 0) return;

        // Claim from StakingBribe
        uint256 pendingAmount = stakingBribe.pendingBribes(
            pos.conditionId,
            pos.outcome,
            address(this)
        );

        if (pendingAmount > 0) {
            stakingBribe.claimRewards(pos.conditionId, pos.outcome);

            // Update accumulated per share
            pos.accBribePerShare += (pendingAmount * 1e18) / pos.totalDeposited;
            pos.lastBribeUpdate = block.timestamp;

            emit BribesHarvested(pos.conditionId, pos.outcome, pendingAmount);
        }
    }

    /**
     * @dev Update user's pending bribes based on their balance
     */
    function _updateUserBribes(uint256 tokenId, address user) internal {
        uint256 userBalance = balanceOf(user, tokenId);
        if (userBalance == 0) return;

        Position storage pos = positions[tokenId];
        uint256 userShare = (userBalance * pos.accBribePerShare) / 1e18;

        // Add to pending
        userPendingBribes[tokenId][user] += userShare;
    }

    /**
     * @dev Hook to update user bribes on transfer
     */
    function _update(
        address from,
        address to,
        uint256[] memory ids,
        uint256[] memory values
    ) internal virtual override {
        // Update bribes for both sender and receiver
        for (uint256 i = 0; i < ids.length; i++) {
            uint256 tokenId = ids[i];

            if (from != address(0)) {
                _updateUserBribes(tokenId, from);
            }
            if (to != address(0)) {
                _updateUserBribes(tokenId, to);
            }
        }

        super._update(from, to, ids, values);
    }

    /**
     * @dev Required override for ERC1155Holder
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC1155, ERC1155Holder)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

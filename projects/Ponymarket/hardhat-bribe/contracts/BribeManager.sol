// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

interface IStakingBribe {
    function getUserStake(bytes32 conditionId, uint8 outcome, address user)
        external view returns (
            uint256 amount,
            uint256 weight,
            uint256 lockUntil,
            uint256 claimedBribes,
            bool isPermanentLock
        );

    function getPoolInfo(bytes32 conditionId, uint8 outcome)
        external view returns (
            uint256 totalWeight,
            uint256 totalBribes,
            uint256 claimedBribes,
            uint256 marketEndTime,
            uint256 currentWeightFactor
        );

    function ctf() external view returns (address);
}

interface ICTF {
    function getCondition(bytes32 conditionId) external view returns (
        address oracle,
        uint256 outcomeSlotCount,
        uint256 yesPrice,
        uint256[] memory payouts,
        uint256 startTime,
        uint256 endTime
    );
}

/**
 * @title BribeManager
 * @notice Manage bribe pools with arbitrary ERC20 tokens and custom release curves
 * @dev Bribes are released using quadratic curve (early-heavy distribution)
 */
contract BribeManager {
    using SafeERC20 for IERC20;

    uint256 private constant PRECISION = 1e18;

    IStakingBribe public immutable stakingBribe;

    struct BribePool {
        uint256 id;
        address sponsor;
        address token;
        uint256 totalAmount;
        uint256 startTime;
        uint256 endTime;
        bytes32 conditionId;
        uint8 outcome;
    }

    // All bribe pools
    BribePool[] public bribePools;

    // conditionId => outcome => bribePoolId[]
    mapping(bytes32 => mapping(uint8 => uint256[])) public marketBribes;

    // bribePoolId => user => claimed amount
    mapping(uint256 => mapping(address => uint256)) public userBribeClaimed;

    event BribePoolCreated(
        uint256 indexed bribePoolId,
        address indexed sponsor,
        bytes32 indexed conditionId,
        uint8 outcome,
        address token,
        uint256 amount,
        uint256 startTime,
        uint256 endTime
    );

    event BribeClaimed(
        uint256 indexed bribePoolId,
        address indexed user,
        address token,
        uint256 amount
    );

    constructor(address _stakingBribe) {
        require(_stakingBribe != address(0), "Invalid staking address");
        stakingBribe = IStakingBribe(_stakingBribe);
    }

    /**
     * @notice Create a new bribe pool
     * @param conditionId Market condition ID
     * @param outcome 0 = NO, 1 = YES
     * @param token ERC20 token address for rewards
     * @param amount Total bribe amount
     * @param startTime Start of reward distribution
     * @param endTime End of reward distribution
     * @return bribePoolId The created bribe pool ID
     */
    function createBribePool(
        bytes32 conditionId,
        uint8 outcome,
        address token,
        uint256 amount,
        uint256 startTime,
        uint256 endTime
    ) external returns (uint256 bribePoolId) {
        require(outcome <= 1, "BribeManager: Invalid outcome (must be 0=NO or 1=YES)");
        require(token != address(0), "BribeManager: Invalid token address (cannot be zero)");
        require(amount > 0, "BribeManager: Amount must be positive");
        require(startTime >= block.timestamp, "BribeManager: Start time cannot be in the past");
        require(endTime > startTime, "BribeManager: End time must be after start time");

        // Check market exists by querying CTF contract
        address ctfAddress = stakingBribe.ctf();
        (, , , , , uint256 marketEndTime) = ICTF(ctfAddress).getCondition(conditionId);
        require(marketEndTime > 0, "BribeManager: Market does not exist in CTF");
        require(endTime <= marketEndTime, "BribeManager: Bribe end time cannot exceed market end time");

        // Transfer tokens from sponsor (requires prior approval)
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Create bribe pool
        bribePoolId = bribePools.length;
        bribePools.push(BribePool({
            id: bribePoolId,
            sponsor: msg.sender,
            token: token,
            totalAmount: amount,
            startTime: startTime,
            endTime: endTime,
            conditionId: conditionId,
            outcome: outcome
        }));

        // Add to market bribes
        marketBribes[conditionId][outcome].push(bribePoolId);

        emit BribePoolCreated(
            bribePoolId,
            msg.sender,
            conditionId,
            outcome,
            token,
            amount,
            startTime,
            endTime
        );
    }

    /**
     * @notice Claim rewards from a single bribe pool
     * @param bribePoolId The bribe pool ID to claim from
     */
    function claimBribePool(uint256 bribePoolId) public {
        require(bribePoolId < bribePools.length, "BribeManager: Invalid bribe pool ID");

        BribePool memory bribe = bribePools[bribePoolId];

        // Get user's voting weight from StakingBribe
        (, uint256 userWeight, , , ) = stakingBribe.getUserStake(
            bribe.conditionId,
            bribe.outcome,
            msg.sender
        );
        require(userWeight > 0, "BribeManager: No voting power - must stake tokens first");

        // Get total weight
        (uint256 totalWeight, , , , ) = stakingBribe.getPoolInfo(bribe.conditionId, bribe.outcome);
        require(totalWeight > 0, "BribeManager: No total weight in pool");

        // Calculate released amount (quadratic curve)
        uint256 releasedAmount = _calculateReleasedAmount(bribe);

        // Calculate user's share
        uint256 userShare = (releasedAmount * userWeight) / totalWeight;

        // Calculate pending rewards
        uint256 claimed = userBribeClaimed[bribePoolId][msg.sender];
        require(userShare > claimed, "BribeManager: No pending rewards to claim");

        uint256 pending = userShare - claimed;

        // Update claimed amount
        userBribeClaimed[bribePoolId][msg.sender] = userShare;

        // Transfer rewards
        IERC20(bribe.token).safeTransfer(msg.sender, pending);

        emit BribeClaimed(bribePoolId, msg.sender, bribe.token, pending);
    }

    /**
     * @notice Claim rewards from multiple bribe pools
     * @param bribePoolIds Array of bribe pool IDs
     */
    function claimMultipleBribes(uint256[] calldata bribePoolIds) external {
        for (uint256 i = 0; i < bribePoolIds.length; i++) {
            claimBribePool(bribePoolIds[i]);
        }
    }

    /**
     * @notice Calculate pending bribe rewards for a user
     * @param bribePoolId The bribe pool ID
     * @param user User address
     * @return Pending reward amount
     */
    function pendingBribeRewards(uint256 bribePoolId, address user)
        external view returns (uint256)
    {
        if (bribePoolId >= bribePools.length) return 0;

        BribePool memory bribe = bribePools[bribePoolId];

        // Get user's voting weight
        (, uint256 userWeight, , , ) = stakingBribe.getUserStake(
            bribe.conditionId,
            bribe.outcome,
            user
        );
        if (userWeight == 0) return 0;

        // Get total weight
        (uint256 totalWeight, , , , ) = stakingBribe.getPoolInfo(bribe.conditionId, bribe.outcome);
        if (totalWeight == 0) return 0;

        // Calculate released amount
        uint256 releasedAmount = _calculateReleasedAmount(bribe);

        // Calculate user's share
        uint256 userShare = (releasedAmount * userWeight) / totalWeight;

        // Subtract claimed
        uint256 claimed = userBribeClaimed[bribePoolId][user];
        if (userShare <= claimed) return 0;

        return userShare - claimed;
    }

    /**
     * @notice Get all bribe pool IDs for a market
     * @param conditionId Market condition ID
     * @param outcome 0 = NO, 1 = YES
     * @return Array of bribe pool IDs
     */
    function getBribePoolsByMarket(bytes32 conditionId, uint8 outcome)
        external view returns (uint256[] memory)
    {
        return marketBribes[conditionId][outcome];
    }

    /**
     * @notice Get bribe pool details
     * @param bribePoolId The bribe pool ID
     * @return Bribe pool struct
     */
    function getBribePool(uint256 bribePoolId)
        external view returns (BribePool memory)
    {
        require(bribePoolId < bribePools.length, "Invalid bribe pool ID");
        return bribePools[bribePoolId];
    }

    /**
     * @notice Get total number of bribe pools
     */
    function getBribePoolCount() external view returns (uint256) {
        return bribePools.length;
    }

    /**
     * @notice Calculate released amount using quadratic curve
     * @dev Formula: released = totalAmount * progress * (2 - progress)
     *      This creates a curve where rewards are released faster early on
     * @param bribe The bribe pool
     * @return Released amount at current timestamp
     */
    function _calculateReleasedAmount(BribePool memory bribe)
        internal view returns (uint256)
    {
        // Before start: nothing released
        if (block.timestamp < bribe.startTime) return 0;

        // After end: everything released
        if (block.timestamp >= bribe.endTime) return bribe.totalAmount;

        // During distribution period
        uint256 duration = bribe.endTime - bribe.startTime;
        uint256 elapsed = block.timestamp - bribe.startTime;

        // progress ∈ [0, PRECISION] representing [0%, 100%]
        uint256 progress = (elapsed * PRECISION) / duration;

        // Quadratic curve: released = totalAmount * progress * (2 - progress)
        // Simplified: released = totalAmount * (2*progress - progress^2) / PRECISION
        uint256 released = (bribe.totalAmount * progress * (2 * PRECISION - progress)) / (PRECISION * PRECISION);

        return released;
    }
}

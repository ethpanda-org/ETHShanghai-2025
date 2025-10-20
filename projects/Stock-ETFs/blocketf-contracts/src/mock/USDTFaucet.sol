// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MockERC20} from "./MockERC20.sol";

/**
 * @title USDTFaucet
 * @notice Simple faucet for USDT distribution on testnet
 * @dev Users only need USDT to test the ETF system via ETFRouterV1.mintWithUSDT()
 *      The router will automatically swap USDT for other assets
 */
contract USDTFaucet is Ownable {
    // USDT token address
    MockERC20 public immutable usdtToken;

    // Configurable parameters
    uint256 public faucetAmount; // Amount of USDT to distribute per claim
    uint256 public faucetCooldown; // Cooldown period between claims

    // User claim tracking
    mapping(address => uint256) public lastClaimTime;

    // Events
    event Claimed(address indexed user, uint256 amount, uint256 timestamp);
    event FaucetAmountUpdated(uint256 oldAmount, uint256 newAmount);
    event FaucetCooldownUpdated(uint256 oldCooldown, uint256 newCooldown);

    /**
     * @notice Constructor
     * @param _usdtToken USDT token address
     * @param _faucetAmount Initial amount per claim (default: 10,000 USDT)
     * @param _faucetCooldown Initial cooldown period (default: 1 day)
     */
    constructor(address _usdtToken, uint256 _faucetAmount, uint256 _faucetCooldown) Ownable(msg.sender) {
        require(_usdtToken != address(0), "Invalid USDT address");
        require(_faucetAmount > 0, "Faucet amount must be positive");

        usdtToken = MockERC20(_usdtToken);
        faucetAmount = _faucetAmount;
        faucetCooldown = _faucetCooldown;
    }

    /**
     * @notice Claim USDT from faucet
     * @dev Users can claim once per cooldown period
     */
    function claim() external {
        require(canClaim(msg.sender), "Cannot claim yet");

        lastClaimTime[msg.sender] = block.timestamp;

        // Mint USDT to user
        usdtToken.mint(msg.sender, faucetAmount);

        emit Claimed(msg.sender, faucetAmount, block.timestamp);
    }

    /**
     * @notice Check if user can claim
     * @param user User address
     * @return true if user can claim, false otherwise
     */
    function canClaim(address user) public view returns (bool) {
        return block.timestamp >= lastClaimTime[user] + faucetCooldown;
    }

    /**
     * @notice Get time remaining until next claim
     * @param user User address
     * @return seconds remaining (0 if can claim now)
     */
    function getTimeUntilNextClaim(address user) external view returns (uint256) {
        if (canClaim(user)) {
            return 0;
        }
        return (lastClaimTime[user] + faucetCooldown) - block.timestamp;
    }

    /**
     * @notice Get user's last claim timestamp
     * @param user User address
     * @return timestamp of last claim (0 if never claimed)
     */
    function getLastClaimTime(address user) external view returns (uint256) {
        return lastClaimTime[user];
    }

    // ==================== Admin Functions ====================

    /**
     * @notice Update faucet amount
     * @param newAmount New amount per claim
     */
    function setFaucetAmount(uint256 newAmount) external onlyOwner {
        require(newAmount > 0, "Amount must be positive");

        uint256 oldAmount = faucetAmount;
        faucetAmount = newAmount;

        emit FaucetAmountUpdated(oldAmount, newAmount);
    }

    /**
     * @notice Update faucet cooldown period
     * @param newCooldown New cooldown in seconds
     */
    function setFaucetCooldown(uint256 newCooldown) external onlyOwner {
        uint256 oldCooldown = faucetCooldown;
        faucetCooldown = newCooldown;

        emit FaucetCooldownUpdated(oldCooldown, newCooldown);
    }

    /**
     * @notice Batch update both parameters
     * @param newAmount New amount per claim
     * @param newCooldown New cooldown in seconds
     */
    function updateFaucetConfig(uint256 newAmount, uint256 newCooldown) external onlyOwner {
        require(newAmount > 0, "Amount must be positive");

        uint256 oldAmount = faucetAmount;
        uint256 oldCooldown = faucetCooldown;

        faucetAmount = newAmount;
        faucetCooldown = newCooldown;

        emit FaucetAmountUpdated(oldAmount, newAmount);
        emit FaucetCooldownUpdated(oldCooldown, newCooldown);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "./FocusCredit.sol";

/**
 * @title FocusBond
 * @dev Decentralized focus protocol - stake ETH to start focus sessions, pay fees to break early
 */
contract FocusBond is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant WATCHDOG_ROLE = keccak256("WATCHDOG_ROLE");

    struct Session {
        uint64 startTs;           // Session start timestamp
        uint64 lastHeartbeatTs;   // Last heartbeat timestamp
        uint96 depositWei;        // ETH deposit amount in wei
        uint16 targetMinutes;     // Target session duration in minutes
        bool isActive;            // Whether session is currently active
        bool watchdogClosed;      // Whether session was closed by watchdog
    }

    // State variables
    IERC20 public immutable usdc;            // USDC token for fee payment (legacy)
    FocusCredit public immutable focusCredit; // Non-transferable credits for fee discounts
    address public rewardTreasury;           // Address to receive fees and slashed deposits
    address public focusVault;               // ERC4626 vault for staking rewards
    
    // Fee configuration
    uint256 public baseFeeUsdc;              // Base fee in USDC (6 decimals)
    uint256 public baseFeeFocus;             // Base fee in FOCUS (18 decimals)
    uint16 public minCompleteMinutes = 15;   // Minimum minutes to complete session
    uint16 public feeStepMin = 10;           // Fee step interval in minutes
    uint32 public heartbeatGraceSecs = 120;  // Grace period for heartbeat in seconds
    uint16 public watchdogSlashBps = 10000;  // Watchdog slash rate in basis points (100% = 10000)

    // User sessions
    mapping(address => Session) public sessions;

    // Events
    event SessionStarted(address indexed user, uint256 depositWei, uint16 targetMinutes, uint64 startTs);
    event SessionCompleted(address indexed user, uint256 depositReturned, uint64 completedAt);
    event FeePaid(address indexed user, uint256 feeAmount, address feeToken, uint256 depositReturned, uint64 paidAt);
    event SessionWatchdogClosed(address indexed user, uint256 slashedAmount, uint256 depositReturned, uint64 closedAt);
    event CompletionBonusGranted(address indexed user, uint256 bonusAmount, uint64 grantedAt);
    event HeartbeatUpdated(address indexed user, uint64 timestamp);
    event ConfigUpdated(string param, uint256 value);
    event CreditsPurchased(address indexed buyer, uint256 ethAmount, uint256 creditAmount, uint64 timestamp);
    event FocusVaultUpdated(address indexed oldVault, address indexed newVault);
    event VaultRewardDistributed(uint256 amount, uint64 timestamp);

    // Errors
    error SessionAlreadyActive();
    error SessionNotActive();
    error SessionTooShort();
    error InsufficientDeposit();
    error FeeExceedsMax();
    error TransferFailed();
    error InvalidConfig();

    constructor(
        address _usdc,
        address _focusCredit,
        address _rewardTreasury,
        uint256 _baseFeeUsdc,
        uint256 _baseFeeFocus
    ) {
        usdc = IERC20(_usdc);
        focusCredit = FocusCredit(_focusCredit);
        rewardTreasury = _rewardTreasury;
        baseFeeUsdc = _baseFeeUsdc;
        baseFeeFocus = _baseFeeFocus;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(WATCHDOG_ROLE, msg.sender);
    }

    /**
     * @dev Start a new focus session with ETH deposit
     * @param targetMinutes Target duration for the session
     */
    function startSession(uint16 targetMinutes) external payable nonReentrant {
        if (sessions[msg.sender].isActive) revert SessionAlreadyActive();
        if (targetMinutes < minCompleteMinutes) revert SessionTooShort();
        if (msg.value == 0) revert InsufficientDeposit();

        uint64 currentTime = uint64(block.timestamp);
        
        sessions[msg.sender] = Session({
            startTs: currentTime,
            lastHeartbeatTs: currentTime,
            depositWei: uint96(msg.value),
            targetMinutes: targetMinutes,
            isActive: true,
            watchdogClosed: false
        });

        emit SessionStarted(msg.sender, msg.value, targetMinutes, currentTime);
    }

    /**
     * @dev Break session early by paying service fee with Focus Credits
     * @param maxFee Maximum fee amount willing to pay in credits
     */
    function breakSession(uint256 maxFee) external nonReentrant {
        _breakSession(address(focusCredit), maxFee, false);
    }


    /**
     * @dev Complete session and get full deposit back plus reward
     */
    function completeSession() external nonReentrant {
        Session storage session = sessions[msg.sender];
        if (!session.isActive) revert SessionNotActive();

        uint64 currentTime = uint64(block.timestamp);
        uint256 elapsedMinutes = (currentTime - session.startTs) / 60;
        
        if (elapsedMinutes < session.targetMinutes) revert SessionTooShort();

        uint256 depositToReturn = session.depositWei;
        
        // Calculate completion bonus in credits (based on session duration)
        uint256 creditBonus = (elapsedMinutes * baseFeeFocus) / 100; // 1% of base fee per minute
        
        // Apply staking boost from vault if user has staked
        uint256 stakingBoost = getStakingBoost(msg.sender);
        if (stakingBoost > 10000) {
            creditBonus = (creditBonus * stakingBoost) / 10000;
        }
        
        // Clear session first (CEI pattern)
        delete sessions[msg.sender];

        // Return full deposit to user
        (bool success, ) = payable(msg.sender).call{value: depositToReturn}("");
        if (!success) revert TransferFailed();

        // Grant completion bonus credits
        if (creditBonus > 0) {
            focusCredit.grantCredits(msg.sender, creditBonus, "Session completion bonus");
            emit CompletionBonusGranted(msg.sender, creditBonus, currentTime);
        }

        emit SessionCompleted(msg.sender, depositToReturn, currentTime);
    }

    /**
     * @dev Watchdog function to close inactive sessions
     * @param user User whose session to close
     */
    function watchdogBreak(address user) external onlyRole(WATCHDOG_ROLE) nonReentrant {
        Session storage session = sessions[user];
        if (!session.isActive) revert SessionNotActive();

        uint64 currentTime = uint64(block.timestamp);
        
        // Check if session is truly inactive (past grace period)
        if (currentTime <= session.lastHeartbeatTs + heartbeatGraceSecs) {
            revert InvalidConfig(); // Session is still within grace period
        }

        uint256 totalDeposit = session.depositWei;
        uint256 slashedAmount = (totalDeposit * watchdogSlashBps) / 10000;
        uint256 returnAmount = totalDeposit - slashedAmount;

        // Mark as watchdog closed
        session.watchdogClosed = true;
        delete sessions[user];

        // Send slashed amount to treasury
        if (slashedAmount > 0) {
            (bool treasurySuccess, ) = payable(rewardTreasury).call{value: slashedAmount}("");
            if (!treasurySuccess) revert TransferFailed();
        }

        // Return remaining deposit to user
        if (returnAmount > 0) {
            (bool userSuccess, ) = payable(user).call{value: returnAmount}("");
            if (!userSuccess) revert TransferFailed();
        }

        emit SessionWatchdogClosed(user, slashedAmount, returnAmount, currentTime);
    }

    /**
     * @dev Update heartbeat timestamp for active session
     */
    function updateHeartbeat() external {
        Session storage session = sessions[msg.sender];
        if (!session.isActive) revert SessionNotActive();

        uint64 currentTime = uint64(block.timestamp);
        session.lastHeartbeatTs = currentTime;

        emit HeartbeatUpdated(msg.sender, currentTime);
    }

    /**
     * @dev Calculate break fee for a user and token
     * @param user User address
     * @param token Fee token address (USDC or FOCUS)
     * @return fee Fee amount in token units
     */
    function calculateBreakFee(address user, address token) public view returns (uint256 fee) {
        Session memory session = sessions[user];
        if (!session.isActive) return 0;

        uint64 currentTime = uint64(block.timestamp);
        uint256 elapsedMinutes = (currentTime - session.startTs) / 60;
        
        // Fee formula: base * (100 + 20 * floor(elapsedMin / feeStepMin)) / 100
        uint256 feeMultiplier = 100 + (20 * (elapsedMinutes / feeStepMin));
        
        if (token == address(usdc)) {
            fee = (baseFeeUsdc * feeMultiplier) / 100;
        } else if (token == address(focusCredit)) {
            fee = (baseFeeFocus * feeMultiplier) / 100;
        }
    }

    /**
     * @dev Internal function to handle session breaking
     */
    function _breakSession(address feeToken, uint256 maxFee, bool permitUsed) internal {
        Session storage session = sessions[msg.sender];
        if (!session.isActive) revert SessionNotActive();

        uint256 fee = calculateBreakFee(msg.sender, feeToken);
        if (fee > maxFee) revert FeeExceedsMax();

        uint256 depositToReturn = session.depositWei;
        uint64 currentTime = uint64(block.timestamp);

        // Clear session first (CEI pattern)
        delete sessions[msg.sender];

        // Redeem credits as service fee
        if (fee > 0) {
            if (feeToken == address(focusCredit)) {
                focusCredit.redeemCredits(msg.sender, fee, "Session break fee");
            } else {
                // Legacy USDC support
                IERC20(feeToken).safeTransferFrom(msg.sender, rewardTreasury, fee);
            }
        }

        // Return deposit to user
        (bool success, ) = payable(msg.sender).call{value: depositToReturn}("");
        if (!success) revert TransferFailed();

        emit FeePaid(msg.sender, fee, feeToken, depositToReturn, currentTime);
    }

    // Admin functions
    function setRewardTreasury(address _rewardTreasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rewardTreasury = _rewardTreasury;
        emit ConfigUpdated("rewardTreasury", uint256(uint160(_rewardTreasury)));
    }

    /**
     * @dev Fund the contract with ETH for completion rewards
     */
    function fundRewards() external payable onlyRole(DEFAULT_ADMIN_ROLE) {
        emit ConfigUpdated("rewardFunding", msg.value);
    }

    /**
     * @dev Grant credits to user for completing sessions or achievements
     * @dev Only admin can grant credits - no purchase mechanism
     */
    function grantCredits(address user, uint256 amount, string calldata reason) external onlyRole(DEFAULT_ADMIN_ROLE) {
        focusCredit.grantCredits(user, amount, reason);
    }

    /**
     * @dev Purchase FOCUS credits with ETH
     * @dev Exchange rate: 100,000 FOCUS = 1 ETH
     */
    function buyFocusCredits() external payable nonReentrant {
        require(msg.value > 0, "Must send ETH");
        
        // Calculate FOCUS amount: 100,000 FOCUS per ETH
        // msg.value is in wei (1 ETH = 10^18 wei)
        // FOCUS has 18 decimals, so 1 FOCUS = 10^18 units
        // 100,000 FOCUS = 100,000 * 10^18 units
        // Therefore: focusAmount = (msg.value / 1 ETH) * 100,000 * 10^18
        //                        = msg.value * 100,000
        uint256 focusAmount = msg.value * 100000;
        
        // Grant FOCUS credits to buyer
        focusCredit.grantCredits(msg.sender, focusAmount, "FOCUS purchase with ETH");
        
        // Transfer ETH to reward treasury
        (bool success, ) = payable(rewardTreasury).call{value: msg.value}("");
        if (!success) revert TransferFailed();
        
        emit ConfigUpdated("focusPurchase", focusAmount);
    }

    /**
     * @dev Withdraw excess ETH from contract
     */
    function withdrawExcess(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(amount <= address(this).balance, "Insufficient balance");
        (bool success, ) = payable(rewardTreasury).call{value: amount}("");
        if (!success) revert TransferFailed();
        emit ConfigUpdated("excessWithdrawn", amount);
    }

    function setBaseFeeUsdc(uint256 _baseFeeUsdc) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseFeeUsdc = _baseFeeUsdc;
        emit ConfigUpdated("baseFeeUsdc", _baseFeeUsdc);
    }

    function setBaseFeeFocus(uint256 _baseFeeFocus) external onlyRole(DEFAULT_ADMIN_ROLE) {
        baseFeeFocus = _baseFeeFocus;
        emit ConfigUpdated("baseFeeFocus", _baseFeeFocus);
    }

    function setMinCompleteMinutes(uint16 _minCompleteMinutes) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minCompleteMinutes = _minCompleteMinutes;
        emit ConfigUpdated("minCompleteMinutes", _minCompleteMinutes);
    }

    function setHeartbeatGraceSecs(uint32 _heartbeatGraceSecs) external onlyRole(DEFAULT_ADMIN_ROLE) {
        heartbeatGraceSecs = _heartbeatGraceSecs;
        emit ConfigUpdated("heartbeatGraceSecs", _heartbeatGraceSecs);
    }

    function setWatchdogSlashBps(uint16 _watchdogSlashBps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_watchdogSlashBps > 10000) revert InvalidConfig();
        watchdogSlashBps = _watchdogSlashBps;
        emit ConfigUpdated("watchdogSlashBps", _watchdogSlashBps);
    }

    // View functions
    function getSession(address user) external view returns (Session memory) {
        return sessions[user];
    }

    function isSessionActive(address user) external view returns (bool) {
        return sessions[user].isActive;
    }

    function getSessionElapsedMinutes(address user) external view returns (uint256) {
        Session memory session = sessions[user];
        if (!session.isActive) return 0;
        return (block.timestamp - session.startTs) / 60;
    }

    /**
     * @dev Set the FocusVault address for ERC4626 staking
     * @param _focusVault Address of the FocusVault contract
     */
    function setFocusVault(address _focusVault) external onlyRole(DEFAULT_ADMIN_ROLE) {
        address oldVault = focusVault;
        focusVault = _focusVault;
        emit FocusVaultUpdated(oldVault, _focusVault);
    }

    /**
     * @dev Distribute rewards to vault stakers from completed sessions
     * @param amount Amount of ETH to distribute as rewards
     */
    function distributeVaultRewards(uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(focusVault != address(0), "Vault not set");
        require(amount <= address(this).balance, "Insufficient balance");
        
        // Call vault's distributeRewards function
        (bool success, ) = focusVault.call{value: amount}(
            abi.encodeWithSignature("distributeRewards(uint256)", amount)
        );
        require(success, "Vault distribution failed");
        
        emit VaultRewardDistributed(amount, uint64(block.timestamp));
    }

    /**
     * @dev Get staking boost multiplier for user from vault
     * @param user Address of the user
     * @return multiplier Boost multiplier in basis points (10000 = 1x, 50000 = 5x)
     */
    function getStakingBoost(address user) public view returns (uint256 multiplier) {
        if (focusVault == address(0)) return 10000; // No boost if vault not set
        
        // Call vault's getStakingBoost function
        (bool success, bytes memory data) = focusVault.staticcall(
            abi.encodeWithSignature("getStakingBoost(address)", user)
        );
        
        if (!success || data.length == 0) return 10000; // Default 1x
        
        return abi.decode(data, (uint256));
    }

    /**
     * @dev Get user's staked amount in vault
     * @param user Address of the user
     * @return amount Amount of ETH staked
     */
    function getUserStake(address user) external view returns (uint256 amount) {
        if (focusVault == address(0)) return 0;
        
        (bool success, bytes memory data) = focusVault.staticcall(
            abi.encodeWithSignature("getUserStake(address)", user)
        );
        
        if (!success || data.length == 0) return 0;
        
        return abi.decode(data, (uint256));
    }
}
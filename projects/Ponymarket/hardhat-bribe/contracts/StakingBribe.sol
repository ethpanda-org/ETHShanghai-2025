// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/ICTF.sol";

/**
 * @title StakingBribe
 * @notice Stake YES/NO tokens to earn USDC bribes (veCRV-style: weight-based proportional distribution)
 * @dev Features:
 *      1. Users stake tokens with custom lock duration
 *      2. Vote power (weight) = amount * lockDuration / marketTotalDuration
 *      3. Bribes distributed proportionally by weight
 *      4. No time-based release - instant proportional distribution
 */
contract StakingBribe is ERC1155Holder {
    // Constants
    uint256 private constant PRECISION = 1e18;
    uint256 private constant MIN_LOCK_DURATION = 1 days;
    uint256 private constant SETTLEMENT_BUFFER = 1 days; // Cannot unlock within 1 day before market end

    // Contracts
    ICTF public immutable ctf;
    IERC20 public immutable collateralToken;

    // Pool state
    struct PoolInfo {
        uint256 totalWeight;         // Total vote power (sum of all user weights)
        uint256 marketStartTime;     // When staking started for this market
        uint256 marketEndTime;       // Market resolution time (from CTF)
    }

    // User stake state
    struct StakeInfo {
        uint256 amount;              // Amount of outcome tokens staked
        uint256 weight;              // Vote power (amount * lockDuration / totalDuration)
        uint256 lockUntil;           // Unlock timestamp
        bool isPermanentLock;        // True if locked until market end (no early unlock)
    }

    // conditionId => outcome => PoolInfo
    mapping(bytes32 => mapping(uint8 => PoolInfo)) public pools;

    // conditionId => outcome => user => StakeInfo
    mapping(bytes32 => mapping(uint8 => mapping(address => StakeInfo))) public stakes;

    // Events
    event Staked(
        address indexed user,
        bytes32 indexed conditionId,
        uint8 indexed outcome,
        uint256 amount,
        uint256 weight,
        uint256 lockUntil
    );

    event Unstaked(
        address indexed user,
        bytes32 indexed conditionId,
        uint8 indexed outcome,
        uint256 amount
    );


    constructor(address _ctf, address _collateralToken) {
        ctf = ICTF(_ctf);
        collateralToken = IERC20(_collateralToken);
    }

    /**
     * @notice Stake outcome tokens (YES/NO) with permanent lock (until market end, full voting power)
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     * @param amount Amount of outcome tokens to stake
     */
    function stakePermanent(
        bytes32 conditionId,
        uint8 outcome,
        uint256 amount
    ) external {
        _stake(conditionId, outcome, amount, 0, true); // 0 duration with permanent flag
    }

    /**
     * @notice Stake outcome tokens (YES/NO) with custom lock duration (temporary lock, 50% weight penalty)
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     * @param amount Amount of outcome tokens to stake
     * @param lockDuration Lock duration in seconds (min 1 day, cannot unlock in settlement period)
     */
    function stake(
        bytes32 conditionId,
        uint8 outcome,
        uint256 amount,
        uint256 lockDuration
    ) external {
        _stake(conditionId, outcome, amount, lockDuration, false); // temporary lock with penalty
    }

    /**
     * @notice Internal stake function - only for initial stake
     * @param isPermanent True = lock until market end (full weight), False = temporary lock (50% weight penalty)
     */
    function _stake(
        bytes32 conditionId,
        uint8 outcome,
        uint256 amount,
        uint256 lockDuration,
        bool isPermanent
    ) internal {
        require(outcome <= 1, "Invalid outcome: must be 0 (NO) or 1 (YES)");
        require(amount > 0, "Amount must be positive");

        StakeInfo storage stakeInfo = stakes[conditionId][outcome][msg.sender];
        require(stakeInfo.amount == 0, "Position already exists, use increaseAmount or extendLock");

        // Get market status and check it's not resolved
        (bool isResolved, uint256 startTime, uint256 endTime) = ctf.getConditionStatus(conditionId);
        require(!isResolved, "Market already resolved");
        require(endTime > 0, "Market must have endTime");
        require(endTime > block.timestamp, "Market already ended");

        PoolInfo storage pool = pools[conditionId][outcome];

        // Initialize market times from CTF
        if (pool.marketEndTime == 0) {
            pool.marketStartTime = startTime;
            pool.marketEndTime = endTime;
        }

        uint256 lockUntil;
        uint256 newWeight;

        if (isPermanent) {
            // Permanent lock: lock until market end, 2x voting power (200% bonus)
            lockUntil = endTime;
            newWeight = (amount * PRECISION * 2); // 2x weight = amount * 2.0
        } else {
            // Temporary lock: custom duration with 50% penalty
            require(lockDuration >= MIN_LOCK_DURATION, "Lock duration too short (min 1 day)");

            lockUntil = block.timestamp + lockDuration;

            // Check not in settlement buffer period (last 1 day before market end)
            require(lockUntil < (endTime > SETTLEMENT_BUFFER ? endTime - SETTLEMENT_BUFFER : 0),
                    "Cannot unlock in settlement period (last 1 day). Use permanent lock instead.");

            // Calculate weight with 50% penalty: (amount * lockDuration / totalDuration) * 0.5
            newWeight = (amount * lockDuration * PRECISION) / ((pool.marketEndTime - pool.marketStartTime) * 2);
        }

        // Transfer outcome tokens from user to this contract
        _transferStakeTokens(conditionId, outcome, amount);

        // Update stake info
        stakeInfo.amount = amount;
        stakeInfo.weight = newWeight;
        stakeInfo.lockUntil = lockUntil;
        stakeInfo.isPermanentLock = isPermanent;

        // Update pool total weight
        pool.totalWeight += newWeight;

        emit Staked(msg.sender, conditionId, outcome, amount, newWeight, lockUntil);
    }

    /**
     * @notice Internal helper to transfer outcome tokens (extracted to reduce stack depth)
     */
    function _transferStakeTokens(bytes32 conditionId, uint8 outcome, uint256 amount) internal {
        uint256 tokenId = ctf.getTokenId(conditionId, outcome);
        IERC1155(address(ctf)).safeTransferFrom(msg.sender, address(this), tokenId, amount, "");
    }

    /**
     * @notice Increase stake amount (Curve-style: can only increase, not decrease)
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     * @param additionalAmount Additional amount to stake
     */
    function increaseAmount(
        bytes32 conditionId,
        uint8 outcome,
        uint256 additionalAmount
    ) external {
        require(outcome <= 1, "Invalid outcome: must be 0 (NO) or 1 (YES)");
        require(additionalAmount > 0, "Amount must be positive");

        StakeInfo storage stakeInfo = stakes[conditionId][outcome][msg.sender];
        require(stakeInfo.amount > 0, "No existing position");

        PoolInfo storage pool = pools[conditionId][outcome];

        // Check market is not resolved
        (,,,uint256[] memory payouts,,) = ctf.getCondition(conditionId);
        require(payouts.length == 0, "Market already resolved");

        // Transfer additional tokens
        uint256 tokenId = ctf.getTokenId(conditionId, outcome);
        IERC1155(address(ctf)).safeTransferFrom(msg.sender, address(this), tokenId, additionalAmount, "");

        // Calculate additional weight with remaining lock duration
        uint256 remainingDuration = stakeInfo.lockUntil > block.timestamp
            ? stakeInfo.lockUntil - block.timestamp
            : 0;
        require(remainingDuration > 0, "Lock period expired, please unstake first");

        uint256 totalDuration = pool.marketEndTime - pool.marketStartTime;
        uint256 additionalWeight = (additionalAmount * remainingDuration * PRECISION) / totalDuration;

        // Update stake info
        stakeInfo.amount += additionalAmount;
        stakeInfo.weight += additionalWeight;
        pool.totalWeight += additionalWeight;

        emit Staked(msg.sender, conditionId, outcome, additionalAmount, additionalWeight, stakeInfo.lockUntil);
    }

    /**
     * @notice Extend lock time (Curve-style: can only extend, not shorten)
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     * @param newLockDuration New lock duration from now (must be longer than current)
     */
    function extendLock(
        bytes32 conditionId,
        uint8 outcome,
        uint256 newLockDuration
    ) external {
        require(outcome <= 1, "Invalid outcome: must be 0 (NO) or 1 (YES)");

        StakeInfo storage stakeInfo = stakes[conditionId][outcome][msg.sender];
        require(stakeInfo.amount > 0, "No existing position");

        PoolInfo storage pool = pools[conditionId][outcome];

        // Check market is not resolved
        (,,,uint256[] memory payouts,, uint256 endTime) = ctf.getCondition(conditionId);
        require(payouts.length == 0, "Market already resolved");

        uint256 newLockUntil = block.timestamp + newLockDuration;
        require(newLockUntil > stakeInfo.lockUntil, "New lock time must be longer than current");
        require(newLockUntil <= endTime, "Cannot lock past market end");

        // Recalculate weight with new lock duration
        uint256 totalDuration = pool.marketEndTime - pool.marketStartTime;
        uint256 oldWeight = stakeInfo.weight;
        uint256 newWeight = (stakeInfo.amount * newLockDuration * PRECISION) / totalDuration;

        // Update stake info
        stakeInfo.weight = newWeight;
        stakeInfo.lockUntil = newLockUntil;

        // Update pool weight
        pool.totalWeight = pool.totalWeight - oldWeight + newWeight;

        emit Staked(msg.sender, conditionId, outcome, 0, newWeight, newLockUntil);
    }

    /**
     * @notice Unstake outcome tokens (only after lock period expires and market ended for permanent locks)
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     */
    function unstake(bytes32 conditionId, uint8 outcome) external {
        require(outcome <= 1, "Invalid outcome: must be 0 (NO) or 1 (YES)");

        StakeInfo storage stakeInfo = stakes[conditionId][outcome][msg.sender];
        require(stakeInfo.amount > 0, "No stake found");
        require(block.timestamp >= stakeInfo.lockUntil, "Still locked");

        // For permanent locks, must wait until market is resolved or ended
        if (stakeInfo.isPermanentLock) {
            (,,,uint256[] memory payouts,,) = ctf.getCondition(conditionId);
            require(payouts.length > 0, "Market not resolved yet. Permanent locks can only unstake after market settlement.");
        }

        PoolInfo storage pool = pools[conditionId][outcome];

        // Return staked tokens
        uint256 amount = stakeInfo.amount;
        uint256 weight = stakeInfo.weight;
        uint256 tokenId = ctf.getTokenId(conditionId, outcome);
        IERC1155(address(ctf)).safeTransferFrom(address(this), msg.sender, tokenId, amount, "");

        // Update pool total weight
        pool.totalWeight -= weight;

        // Clear stake info
        delete stakes[conditionId][outcome][msg.sender];

        emit Unstaked(msg.sender, conditionId, outcome, amount);
    }


    /**
     * @notice Get pool information
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     */
    function getPoolInfo(bytes32 conditionId, uint8 outcome)
        external
        view
        returns (
            uint256 totalWeight,
            uint256 marketEndTime,
            uint256 currentWeightFactor
        )
    {
        PoolInfo memory pool = pools[conditionId][outcome];

        // Calculate current weight factor (lockDuration / totalDuration) if staking now until end
        uint256 weightFactor = 0;
        if (pool.marketEndTime > 0 && pool.marketStartTime > 0 && block.timestamp < pool.marketEndTime) {
            uint256 totalDuration = pool.marketEndTime - pool.marketStartTime;
            uint256 remainingDuration = pool.marketEndTime - block.timestamp;
            weightFactor = (remainingDuration * PRECISION) / totalDuration;
        }

        return (pool.totalWeight, pool.marketEndTime, weightFactor);
    }

    /**
     * @notice Get user stake information
     * @param conditionId The market condition
     * @param outcome 0 = NO, 1 = YES
     * @param user User address
     */
    function getUserStake(
        bytes32 conditionId,
        uint8 outcome,
        address user
    )
        external
        view
        returns (
            uint256 amount,
            uint256 weight,
            uint256 lockUntil,
            bool isPermanentLock
        )
    {
        StakeInfo memory stakeInfo = stakes[conditionId][outcome][user];

        return (stakeInfo.amount, stakeInfo.weight, stakeInfo.lockUntil, stakeInfo.isPermanentLock);
    }
}

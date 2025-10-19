// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAquaFluxCore
 * @dev Interface for the main AquaFlux Registry contract
 */
interface IAquaFluxCore {
    /**
     * @dev Asset information structure
     */
    struct AssetInfo {
        address issuer;           // Asset issuer address
        address underlying;       // Underlying RWA token address
        uint256 maturity;         // Maturity timestamp
        uint256 operationDeadline; // Deadline for all operations (before maturity)
        uint256 couponRate;       // Coupon rate (in basis points)
        uint256 couponAllocationC; // Coupon allocation to C token (in basis points, 0-10000)
        uint256 couponAllocationS; // Coupon allocation to S token (in basis points, 0-10000)
        uint256 sTokenFeeAllocation; // Fee allocation to S token holders (in basis points, 0-10000)
        string name;              // Asset name in standard format (e.g., P-XYZ-31AUG2025)
        string metadataURI;       // Metadata URI for asset details
        bool verified;            // Whether asset is verified by admin
        bool paused;              // Whether asset operations are paused
        address aqToken;          // AqToken contract address
        address pToken;           // PToken contract address
        address cToken;           // CToken contract address
        address sToken;           // SToken contract address
    }

    /**
     * @dev Emitted when a new asset is registered
     * @param assetId The unique asset identifier
     * @param issuer The asset issuer
     * @param underlying The underlying token address
     * @param maturity The maturity timestamp
     * @param couponRate The coupon rate
     * @param couponAllocationC The coupon allocation to C token
     * @param couponAllocationS The coupon allocation to S token
     * @param name The asset name in standard format
     * @param metadataURI The metadata URI
     */
    event AssetRegistered(
        bytes32 indexed assetId,
        address indexed issuer,
        address underlying,
        uint256 maturity,
        uint256 couponRate,
        uint256 couponAllocationC,
        uint256 couponAllocationS,
        string name,
        string metadataURI
    );

    /**
     * @dev Emitted when an asset is verified
     * @param assetId The asset identifier
     */
    event AssetVerified(bytes32 indexed assetId);

    /**
     * @dev Emitted when assets are wrapped into AqTokens
     * @param assetId The asset identifier
     * @param user The user performing the wrap
     * @param amount The amount wrapped
     */
    event AssetWrapped(
        bytes32 indexed assetId,
        address indexed user,
        uint256 amount
    );

    /**
     * @dev Emitted when AqTokens are split into P/C/S tokens
     * @param assetId The asset identifier
     * @param user The user performing the split
     * @param amount The amount split
     */
    event AssetSplit(
        bytes32 indexed assetId,
        address indexed user,
        uint256 amount
    );

    /**
     * @dev Emitted when P/C/S tokens are merged back to AqTokens
     * @param assetId The asset identifier
     * @param user The user performing the merge
     * @param amount The amount merged
     */
    event AssetMerged(
        bytes32 indexed assetId,
        address indexed user,
        uint256 amount
    );

    /**
     * @dev Emitted when AqTokens are unwrapped to underlying assets
     * @param assetId The asset identifier
     * @param user The user performing the unwrap
     * @param amount The amount unwrapped
     */
    event AssetUnwrapped(
        bytes32 indexed assetId,
        address indexed user,
        uint256 amount
    );
    
    /**
     * @dev Emitted when the token factory is changed
     * @param oldFactory The address of the previous factory
     * @param newFactory The address of the new factory
     */
    event FactoryChanged(address indexed oldFactory, address indexed newFactory);

    /**
     * @dev Emitted when the timelock contract is updated
     * @param oldTimelock The address of the previous timelock contract
     * @param newTimelock The address of the new timelock contract
     */
    event TimelockUpdated(address indexed oldTimelock, address indexed newTimelock);

    /**
     * @dev Emitted when coupon allocation is updated
     * @param assetId The asset identifier
     * @param oldCAllocation The previous C token allocation
     * @param oldSAllocation The previous S token allocation
     * @param newCAllocation The new C token allocation
     * @param newSAllocation The new S token allocation
     * @param updatedBy The admin who updated the allocation
     */
    event CouponAllocationUpdated(
        bytes32 indexed assetId,
        uint256 oldCAllocation,
        uint256 oldSAllocation,
        uint256 newCAllocation,
        uint256 newSAllocation,
        address indexed updatedBy
    );

    /**
     * @dev Emitted when metadata URI is updated
     * @param assetId The asset identifier
     * @param oldMetadataURI The previous metadata URI
     * @param newMetadataURI The new metadata URI
     * @param updatedBy The admin who updated the metadata URI
     */
    event MetadataURIUpdated(
        bytes32 indexed assetId,
        string oldMetadataURI,
        string newMetadataURI,
        address indexed updatedBy
    );

    /**
     * @dev Registers a new asset
     * @param underlying The underlying RWA token address
     * @param maturity The maturity timestamp
     * @param operationDeadline The deadline for all operations (must be before maturity)
     * @param couponRate The coupon rate in basis points
     * @param couponAllocationC The coupon allocation to C token (in basis points, 0-10000)
     * @param couponAllocationS The coupon allocation to S token (in basis points, 0-10000)
     * @param sTokenFeeAllocation The fee allocation to S token holders (in basis points, 0-10000)
     * @param name The asset name in standard format (e.g., P-XYZ-31AUG2025)
     * @param metadataURI The metadata URI
     * @return assetId The unique asset identifier
     */
    function register(
        address underlying,
        uint256 maturity,
        uint256 operationDeadline,
        uint256 couponRate,
        uint256 couponAllocationC,
        uint256 couponAllocationS,
        uint256 sTokenFeeAllocation,
        string calldata name,
        string calldata metadataURI
    ) external returns (bytes32 assetId);

    /**
     * @dev Verifies an asset (admin only)
     * @param assetId The asset identifier to verify
     */
    function verify(bytes32 assetId) external;

    /**
     * @dev Wraps underlying assets into AqTokens
     * @param assetId The asset identifier
     * @param amount The amount to wrap
     */
    function wrap(bytes32 assetId, uint256 amount) external;

    /**
     * @dev Splits AqTokens into P/C/S tokens
     * @param assetId The asset identifier
     * @param amount The amount to split
     */
    function split(bytes32 assetId, uint256 amount) external;

    /**
     * @dev Merges P/C/S tokens back to AqTokens
     * @param assetId The asset identifier
     * @param amount The amount to merge
     */
    function merge(bytes32 assetId, uint256 amount) external;

    /**
     * @dev Unwraps AqTokens to underlying assets
     * @param assetId The asset identifier
     * @param amount The amount to unwrap
     */
    function unwrap(bytes32 assetId, uint256 amount) external;

    /**
     * @dev Gets asset information
     * @param assetId The asset identifier
     * @return The asset information
     */
    function getAssetInfo(bytes32 assetId) external view returns (AssetInfo memory);

    /**
     * @dev Checks if an asset is registered
     * @param assetId The asset identifier
     * @return True if asset is registered
     */
    function isAssetRegistered(bytes32 assetId) external view returns (bool);

    /**
     * @dev Checks if an asset is verified
     * @param assetId The asset identifier
     * @return True if asset is verified
     */
    function isAssetVerified(bytes32 assetId) external view returns (bool);

    /**
     * @dev Updates the coupon allocation for C and S tokens (admin only)
     * @param assetId The asset identifier
     * @param newCouponAllocationC The new coupon allocation to C token (in basis points, 0-10000)
     * @param newCouponAllocationS The new coupon allocation to S token (in basis points, 0-10000)
     */
    function updateCouponAllocation(
        bytes32 assetId,
        uint256 newCouponAllocationC,
        uint256 newCouponAllocationS
    ) external;

    /**
     * @dev Updates the metadata URI for an asset (admin only)
     * @param assetId The asset identifier
     * @param newMetadataURI The new metadata URI
     */
    function updateMetadataURI(
        bytes32 assetId,
        string calldata newMetadataURI
    ) external;

    /**
     * @dev Emitted when global fee rate is updated
     * @param operation The operation type (register, wrap, split, merge, unwrap)
     * @param oldFeeRate The old fee rate
     * @param newFeeRate The new fee rate in basis points (0 = disabled)
     * @param updatedBy The admin who updated the fee rate
     */
    event GlobalFeeRateUpdated(
        string indexed operation,
        uint256 oldFeeRate,
        uint256 newFeeRate,
        address indexed updatedBy
    );

    /**
     * @dev Emitted when fee is collected for an asset
     * @param assetId The asset identifier
     * @param operation The operation type
     * @param user The user who paid the fee
     * @param operationAmount The operation amount
     * @param feeAmount The fee amount collected
     */
    event FeeCollected(
        bytes32 indexed assetId,
        string indexed operation,
        address indexed user,
        uint256 operationAmount,
        uint256 feeAmount
    );

    /**
     * @dev Emitted when an asset is paused
     * @param assetId The asset identifier
     * @param pausedBy The admin who paused the asset
     */
    event AssetPaused(
        bytes32 indexed assetId,
        address indexed pausedBy
    );

    /**
     * @dev Emitted when an asset is unpaused
     * @param assetId The asset identifier
     * @param unpausedBy The admin who unpaused the asset
     */
    event AssetUnpaused(
        bytes32 indexed assetId,
        address indexed unpausedBy
    );

    /**
     * @dev Emitted when S Token fee allocation is updated
     * @param assetId The asset identifier
     * @param oldSTokenFeeAllocation The previous S Token fee allocation
     * @param newSTokenFeeAllocation The new S Token fee allocation
     * @param updatedBy The admin who updated the allocation
     */
    event STokenFeeAllocationUpdated(
        bytes32 indexed assetId,
        uint256 oldSTokenFeeAllocation,
        uint256 newSTokenFeeAllocation,
        address indexed updatedBy
    );

    /**
     * @dev Emitted when operation deadline is updated
     * @param assetId The asset identifier
     * @param oldOperationDeadline The previous operation deadline
     * @param newOperationDeadline The new operation deadline
     * @param updatedBy The admin who updated the deadline
     */
    event OperationDeadlineUpdated(
        bytes32 indexed assetId,
        uint256 oldOperationDeadline,
        uint256 newOperationDeadline,
        address indexed updatedBy
    );

    // === MATURITY MANAGEMENT EVENTS ===

    /**
     * @dev Emitted when asset operations are manually stopped
     * @param assetId The asset identifier
     * @param stoppedBy The admin who stopped operations
     */
    event AssetOperationsStopped(
        bytes32 indexed assetId,
        address indexed stoppedBy
    );

    /**
     * @dev Emitted when funds are withdrawn for offline redemption
     * @param assetId The asset identifier
     * @param withdrawnBy The admin who withdrew funds
     * @param amount The amount withdrawn
     */
    event FundsWithdrawnForRedemption(
        bytes32 indexed assetId,
        address indexed withdrawnBy,
        uint256 amount
    );

    /**
     * @dev Emitted when redemption revenue is injected back into contract
     * @param assetId The asset identifier
     * @param injectedBy The admin who injected revenue
     * @param amount The amount injected
     */
    event RedemptionRevenueInjected(
        bytes32 indexed assetId,
        address indexed injectedBy,
        uint256 amount
    );

    /**
     * @dev Emitted when distribution plan is set
     * @param assetId The asset identifier
     * @param pAllocation P Token allocation amount
     * @param cAllocation C Token allocation amount
     * @param sAllocation S Token allocation amount
     * @param protocolFeeReward Protocol fee reward for S Token holders
     * @param setBy The admin who set the plan
     */
    event DistributionPlanSet(
        bytes32 indexed assetId,
        uint256 pAllocation,
        uint256 cAllocation,
        uint256 sAllocation,
        uint256 protocolFeeReward,
        address indexed setBy
    );

    /**
     * @dev Emitted when a user claims maturity reward
     * @param assetId The asset identifier
     * @param user The user who claimed
     * @param tokenAddress The token address for which reward was claimed
     * @param tokenBalance The user's token balance
     * @param rewardAmount The reward amount claimed
     */
    event MaturityRewardClaimed(
        bytes32 indexed assetId,
        address indexed user,
        address indexed tokenAddress,
        uint256 tokenBalance,
        uint256 rewardAmount
    );

    /**
     * @dev Pauses all operations for a specific asset (admin only)
     * @param assetId The asset identifier to pause
     */
    function pauseAsset(bytes32 assetId) external;

    /**
     * @dev Unpauses all operations for a specific asset (admin only)
     * @param assetId The asset identifier to unpause
     */
    function unpauseAsset(bytes32 assetId) external;

    /**
     * @dev Checks if an asset is paused
     * @param assetId The asset identifier
     * @return True if asset is paused
     */
    function isAssetPaused(bytes32 assetId) external view returns (bool);

    /**
     * @dev Updates the S Token fee allocation for an asset (admin only)
     * @param assetId The asset identifier
     * @param newSTokenFeeAllocation The new S Token fee allocation (in basis points, 0-10000)
     */
    function updateSTokenFeeAllocation(
        bytes32 assetId,
        uint256 newSTokenFeeAllocation
    ) external;

    /**
     * @dev Updates the operation deadline for an asset (admin only)
     * @param assetId The asset identifier
     * @param newOperationDeadline The new operation deadline (must be before maturity)
     */
    function updateOperationDeadline(
        bytes32 assetId,
        uint256 newOperationDeadline
    ) external;

    // === MATURITY MANAGEMENT FUNCTIONS ===

    /**
     * @dev Gets the current lifecycle state of an asset
     * @param assetId The asset identifier
     * @return The current lifecycle state (0=ACTIVE, 1=OPERATIONS_STOPPED, 2=FUNDS_WITHDRAWN, 3=REVENUE_INJECTED, 4=DISTRIBUTION_SET, 5=CLAIMABLE)
     */
    function getAssetLifecycleState(bytes32 assetId) external view returns (uint8);

    /**
     * @dev Manually stops operations for an asset (admin only)
     * @param assetId The asset identifier
     */
    function stopAssetOperations(bytes32 assetId) external;

    /**
     * @dev Withdraws underlying tokens for offline redemption (admin only)
     * @param assetId The asset identifier
     * @param amount The amount to withdraw
     */
    function withdrawForRedemption(bytes32 assetId, uint256 amount) external;

    /**
     * @dev Injects redemption revenue back into the contract (admin only)
     * @param assetId The asset identifier
     * @param amount The amount of revenue to inject
     */
    function injectRedemptionRevenue(bytes32 assetId, uint256 amount) external;

    /**
     * @dev Sets the distribution plan for P/C/S tokens (admin only)
     * @param assetId The asset identifier
     * @param pAllocation P Token allocation amount
     * @param cAllocation C Token allocation amount
     * @param sAllocation S Token allocation amount
     * @param protocolFeeReward Additional protocol fee reward for S Token holders
     */
    function setDistributionPlan(
        bytes32 assetId,
        uint256 pAllocation,
        uint256 cAllocation,
        uint256 sAllocation,
        uint256 protocolFeeReward
    ) external;

    /**
     * @dev Claims maturity reward for a specific token type
     * @param assetId The asset identifier
     * @param tokenAddress The token address (P, C, or S token)
     */
    function claimMaturityReward(bytes32 assetId, address tokenAddress) external;

    /**
     * @dev Claims maturity rewards for all token types at once
     * @param assetId The asset identifier
     */
    function claimAllMaturityRewards(bytes32 assetId) external;

    /**
     * @dev Gets claimable reward amount for a user and token type
     * @param assetId The asset identifier
     * @param user The user address
     * @param tokenAddress The token address
     * @return The claimable reward amount
     */
    function getClaimableReward(bytes32 assetId, address user, address tokenAddress) external view returns (uint256);

    // === TIMELOCK MANAGEMENT FUNCTIONS ===

    /**
     * @dev Sets the timelock contract address (admin only)
     * @param newTimelock The address of the timelock contract
     */
    function setTimelock(address newTimelock) external;

    /**
     * @dev Gets the current timelock contract address
     * @return The address of the timelock contract
     */
    function getTimelock() external view returns (address);

    /**
     * @dev Checks if timelock is configured and ready for use
     * @return True if timelock is set and has required role
     */
    function isTimelockReady() external view returns (bool);

    // === FEE EXTRACTION EVENTS ===

    /**
     * @dev Emitted when protocol fees are withdrawn
     * @param assetId The asset identifier
     * @param to The address that received the fees
     * @param amount The amount of fees withdrawn
     * @param withdrawnBy The admin who withdrew the fees
     */
    event ProtocolFeesWithdrawn(
        bytes32 indexed assetId,
        address indexed to,
        uint256 amount,
        address indexed withdrawnBy
    );

    // === FEE EXTRACTION FUNCTIONS ===

    /**
     * @dev Withdraws accumulated protocol fees for a specific asset (admin only)
     * @param assetId The asset identifier
     * @param to The address to receive the fees
     * @param amount The amount of fees to withdraw
     */
    function withdrawProtocolFees(
        bytes32 assetId,
        address to,
        uint256 amount
    ) external;

    /**
     * @dev Gets the amount of withdrawable fees for a specific asset
     * @param assetId The asset identifier
     * @return The amount of fees available for withdrawal
     */
    function getWithdrawableFees(bytes32 assetId) external view returns (uint256);

    /**
     * @dev Withdraws all accumulated protocol fees for multiple assets (admin only)
     * @param assetIds Array of asset identifiers
     * @param to The address to receive the fees
     */
    function withdrawAllProtocolFees(
        bytes32[] calldata assetIds,
        address to
    ) external;

    /**
     * @dev Gets the total withdrawable fees across all assets for a specific underlying token
     * @param underlyingToken The underlying token address
     * @return totalFees The total fees available for withdrawal
     */
    function getTotalWithdrawableFeesForToken(address underlyingToken) external view returns (uint256 totalFees);
}
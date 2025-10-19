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
        uint256 couponRate;       // Coupon rate (in basis points)
        uint256 couponAllocationC; // Coupon allocation to C token (in basis points, 0-10000)
        uint256 couponAllocationS; // Coupon allocation to S token (in basis points, 0-10000)
        string name;              // Asset name in standard format (e.g., P-XYZ-31AUG2025)
        string metadataURI;       // Metadata URI for asset details
        bool verified;            // Whether asset is verified by admin
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
     * @param couponRate The coupon rate in basis points
     * @param couponAllocationC The coupon allocation to C token (in basis points, 0-10000)
     * @param couponAllocationS The coupon allocation to S token (in basis points, 0-10000)
     * @param name The asset name in standard format (e.g., P-XYZ-31AUG2025)
     * @param metadataURI The metadata URI
     * @return assetId The unique asset identifier
     */
    function register(
        address underlying,
        uint256 maturity,
        uint256 couponRate,
        uint256 couponAllocationC,
        uint256 couponAllocationS,
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
     * @dev Sets global fee rate for an operation (admin only)
     * @param operation The operation type (register, wrap, split, merge, unwrap)
     * @param feeRate The fee rate in basis points (0-10000, 0 = disabled)
     */
    function setGlobalFeeRate(
        string calldata operation,
        uint256 feeRate
    ) external;

    /**
     * @dev Gets global fee rate for an operation
     * @param operation The operation type
     * @return feeRate The fee rate in basis points (0 = disabled)
     */
    function getGlobalFeeRate(string calldata operation) external view returns (uint256 feeRate);

    /**
     * @dev Gets total fees collected for an asset
     * @param assetId The asset identifier
     * @return totalFees The total fees collected for this asset
     */
    function getAssetFeesCollected(bytes32 assetId) external view returns (uint256 totalFees);

    /**
     * @dev Gets fees collected for an asset by operation type
     * @param assetId The asset identifier
     * @param operation The operation type
     * @return fees The fees collected for this asset and operation
     */
    function getAssetFeesByOperation(bytes32 assetId, string calldata operation) external view returns (uint256 fees);

    /**
     * @dev Gets the fee balance available for an asset
     * @param assetId The asset identifier
     * @return balance The fee balance in underlying tokens
     */
    function getAssetFeeBalance(bytes32 assetId) external view returns (uint256 balance);
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IAquaFluxRegistry
 * @dev Interface for the main AquaFlux Registry contract
 */
interface IAquaFluxRegistry {
    /**
     * @dev Asset information structure
     */
    struct AssetInfo {
        address issuer;           // Asset issuer address
        address underlying;       // Underlying RWA token address
        uint256 maturity;         // Maturity timestamp
        uint256 couponRate;       // Coupon rate (in basis points)
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
     * @param metadataURI The metadata URI
     */
    event AssetRegistered(
        bytes32 indexed assetId,
        address indexed issuer,
        address underlying,
        uint256 maturity,
        uint256 couponRate,
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
     * @dev Registers a new asset
     * @param underlying The underlying RWA token address
     * @param maturity The maturity timestamp
     * @param couponRate The coupon rate in basis points
     * @param metadataURI The metadata URI
     * @return assetId The unique asset identifier
     */
    function register(
        address underlying,
        uint256 maturity,
        uint256 couponRate,
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
} 
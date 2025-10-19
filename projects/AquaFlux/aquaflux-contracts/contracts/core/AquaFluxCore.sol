// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAquaFluxCore.sol";
import "../interfaces/IBaseToken.sol";
import "../interfaces/ITokenFactory.sol";

/**
 * @title AquaFluxCore
 * @dev Main registry contract for AquaFlux protocol
 * Manages asset registration, verification, and token operations (wrap/split/merge/unwrap)
 */
contract AquaFluxCore is 
    IAquaFluxCore,
    Initializable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // Factory contract for deploying tokens
    ITokenFactory public factory;
    
        // Global fee rates for different operations (in basis points, 0 = disabled)
    mapping(string => uint256) public globalFeeRates;
    
    // Asset-specific fee tracking: assetId => total fees collected
    mapping(bytes32 => uint256) public assetFeesCollected;
    
    // Asset-specific fee tracking by operation: assetId => operation => fees collected
    mapping(bytes32 => mapping(string => uint256)) public assetFeesByOperation;
    
    // Asset-specific fee balances (underlying tokens held): assetId => balance
    mapping(bytes32 => uint256) public assetFeeBalances;
    
    // Supported operations for fee collection
    string public constant OPERATION_REGISTER = "register";
    string public constant OPERATION_WRAP = "wrap";
    string public constant OPERATION_SPLIT = "split";
    string public constant OPERATION_MERGE = "merge";
    string public constant OPERATION_UNWRAP = "unwrap";

    // Asset registry
    mapping(bytes32 => AssetInfo) public assets;
    
    // Asset ID counter for unique identification
    uint256 private _assetIdCounter;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the registry
     * @param _factory The clone factory contract address
     * @param admin The admin address
     */
    function initialize(address _factory, address admin) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        factory = ITokenFactory(_factory);
        
        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
    }
    
    /**
     * @dev Changes the token factory address
     * @param newFactory The address of the new factory contract
     */
    function setFactory(address newFactory) external onlyRole(ADMIN_ROLE) {
        require(newFactory != address(0), "Invalid factory address");
        // Basic compatibility check - ensure it has the required interface
        require(ITokenFactory(newFactory).deployToken.selector != bytes4(0), "Invalid factory interface");
        
        address oldFactory = address(factory);
        factory = ITokenFactory(newFactory);
        
        emit FactoryChanged(oldFactory, newFactory);
    }

    /**
     * @dev Registers a new asset, token will not be deployed until wrap is called
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
    ) external override returns (bytes32 assetId) {
        require(underlying != address(0), "Invalid underlying token");
        require(maturity > block.timestamp, "Maturity must be in the future");
        require(couponRate <= 10000, "Coupon rate must be <= 100%");
        require(couponAllocationC <= 10000, "C allocation must be <= 100%");
        require(couponAllocationS <= 10000, "S allocation must be <= 100%");
        require(couponAllocationC + couponAllocationS == 10000, "C + S allocation must equal 100%");
        require(bytes(name).length > 0, "Asset name required");
        require(bytes(metadataURI).length > 0, "Metadata URI required");

        // Generate unique asset ID
        assetId = keccak256(abi.encodePacked(
            underlying,
            maturity,
            couponRate,
            couponAllocationC,
            couponAllocationS,
            name,
            metadataURI,
            msg.sender,
            _assetIdCounter++
        ));

        require(!isAssetRegistered(assetId), "Asset already registered");

        // Create asset info
        assets[assetId] = AssetInfo({
            issuer: msg.sender,
            underlying: underlying,
            maturity: maturity,
            couponRate: couponRate,
            couponAllocationC: couponAllocationC,
            couponAllocationS: couponAllocationS,
            name: name,
            metadataURI: metadataURI,
            verified: false,
            aqToken: address(0),
            pToken: address(0),
            cToken: address(0),
            sToken: address(0)
        });

        emit AssetRegistered(assetId, msg.sender, underlying, maturity, couponRate, couponAllocationC, couponAllocationS, name, metadataURI);
    }

    /**
     * @dev Verifies an asset (admin only)
     * @param assetId The asset identifier to verify
     */
    function verify(bytes32 assetId) external override onlyRole(VERIFIER_ROLE) {
        require(isAssetRegistered(assetId), "Asset not registered");
        require(!assets[assetId].verified, "Asset already verified");

        assets[assetId].verified = true;
        emit AssetVerified(assetId);
    }

    /**
     * @dev Wraps underlying assets into AqTokens
     * @param assetId The asset identifier
     * @param amount The amount to wrap
     */
    function wrap(bytes32 assetId, uint256 amount) external override nonReentrant whenNotPaused {
        require(isAssetRegistered(assetId), "Asset not registered");
        require(assets[assetId].verified, "Asset not verified");
        require(amount > 0, "Amount must be greater than 0");

        AssetInfo storage asset = assets[assetId];
        IERC20 underlying = IERC20(asset.underlying);

        // Transfer underlying tokens from user to this contract
        underlying.safeTransferFrom(msg.sender, address(this), amount);

        // Deploy AqToken if not already deployed
        if (asset.aqToken == address(0)) {
            string memory name = string(abi.encodePacked("AquaFlux ", IERC20Metadata(asset.underlying).symbol()));
            string memory symbol = string(abi.encodePacked("aq ", IERC20Metadata(asset.underlying).symbol()));
            
            asset.aqToken = factory.deployToken("AQ", assetId, name, symbol);
        }

        // Mint AqTokens to user
        IBaseToken(asset.aqToken).mint(msg.sender, amount);

        emit AssetWrapped(assetId, msg.sender, amount);
    }

    /**
     * @dev Splits AqTokens into P/C/S tokens
     * @param assetId The asset identifier
     * @param amount The amount to split
     */
    function split(bytes32 assetId, uint256 amount) external override nonReentrant whenNotPaused {
        require(isAssetRegistered(assetId), "Asset not registered");
        require(assets[assetId].verified, "Asset not verified");
        require(amount > 0, "Amount must be greater than 0");

        AssetInfo storage asset = assets[assetId];
        require(asset.aqToken != address(0), "AqToken not deployed");

        // Burn AqTokens from user
        IBaseToken(asset.aqToken).burn(msg.sender, amount);

        // Deploy P/C/S tokens if not already deployed
        if (asset.pToken == address(0)) {
            string memory name = string(abi.encodePacked("Principal ", IERC20Metadata(asset.underlying).symbol()));
            string memory symbol = string(abi.encodePacked("P", IERC20Metadata(asset.underlying).symbol()));
            asset.pToken = factory.deployToken("P", assetId, name, symbol);
        }

        if (asset.cToken == address(0)) {
            string memory name = string(abi.encodePacked("Coupon ", IERC20Metadata(asset.underlying).symbol()));
            string memory symbol = string(abi.encodePacked("C", IERC20Metadata(asset.underlying).symbol()));
            asset.cToken = factory.deployToken("C", assetId, name, symbol);
        }

        if (asset.sToken == address(0)) {
            string memory name = string(abi.encodePacked("Safety ", IERC20Metadata(asset.underlying).symbol()));
            string memory symbol = string(abi.encodePacked("S", IERC20Metadata(asset.underlying).symbol()));
            asset.sToken = factory.deployToken("S", assetId, name, symbol);
        }

        // Mint P/C/S tokens to user (1:1 ratio for now)
        IBaseToken(asset.pToken).mint(msg.sender, amount);
        IBaseToken(asset.cToken).mint(msg.sender, amount);
        IBaseToken(asset.sToken).mint(msg.sender, amount);

        emit AssetSplit(assetId, msg.sender, amount);
    }

    /**
     * @dev Merges P/C/S tokens back to AqTokens
     * @param assetId The asset identifier
     * @param amount The amount to merge
     */
    function merge(bytes32 assetId, uint256 amount) external override nonReentrant whenNotPaused {
        require(isAssetRegistered(assetId), "Asset not registered");
        require(assets[assetId].verified, "Asset not verified");
        require(amount > 0, "Amount must be greater than 0");

        AssetInfo storage asset = assets[assetId];
        require(asset.aqToken != address(0), "AqToken not deployed");
        require(asset.pToken != address(0), "PToken not deployed");
        require(asset.cToken != address(0), "CToken not deployed");
        require(asset.sToken != address(0), "SToken not deployed");

        // Burn P/C/S tokens from user
        IBaseToken(asset.pToken).burn(msg.sender, amount);
        IBaseToken(asset.cToken).burn(msg.sender, amount);
        IBaseToken(asset.sToken).burn(msg.sender, amount);

        // Mint AqTokens to user
        IBaseToken(asset.aqToken).mint(msg.sender, amount);

        emit AssetMerged(assetId, msg.sender, amount);
    }

    /**
     * @dev Unwraps AqTokens to underlying assets
     * @param assetId The asset identifier
     * @param amount The amount to unwrap
     */
    function unwrap(bytes32 assetId, uint256 amount) external override nonReentrant whenNotPaused {
        require(isAssetRegistered(assetId), "Asset not registered");
        require(assets[assetId].verified, "Asset not verified");
        require(amount > 0, "Amount must be greater than 0");

        AssetInfo storage asset = assets[assetId];
        require(asset.aqToken != address(0), "AqToken not deployed");

        // Burn AqTokens from user
        IBaseToken(asset.aqToken).burn(msg.sender, amount);

        // Transfer underlying tokens to user
        IERC20(asset.underlying).safeTransfer(msg.sender, amount);

        emit AssetUnwrapped(assetId, msg.sender, amount);
    }

    /**
     * @dev Gets asset information
     * @param assetId The asset identifier
     * @return The asset information
     */
    function getAssetInfo(bytes32 assetId) external view override returns (AssetInfo memory) {
        return assets[assetId];
    }

    /**
     * @dev Checks if an asset is registered
     * @param assetId The asset identifier
     * @return True if asset is registered
     */
    function isAssetRegistered(bytes32 assetId) public view override returns (bool) {
        return assets[assetId].issuer != address(0);
    }

    /**
     * @dev Checks if an asset is verified
     * @param assetId The asset identifier
     * @return True if asset is verified
     */
    function isAssetVerified(bytes32 assetId) external view override returns (bool) {
        return assets[assetId].verified;
    }

    /**
     * @dev Pauses all operations
     */
    function pause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Required by the OZ UUPS module
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyRole(ADMIN_ROLE) {}

    /**
     * @dev Returns the version of the registry
     */
    function version() public pure returns (string memory) {
        return "1.0.0";
    }

    /**
     * @dev Sets global fee rate for an operation (admin only)
     * @param operation The operation type (register, wrap, split, merge, unwrap)
     * @param feeRate The fee rate in basis points (0-10000, 0 = disabled)
     */
    function setGlobalFeeRate(
        string calldata operation,
        uint256 feeRate
    ) external override onlyRole(ADMIN_ROLE) {
        require(_isValidOperation(operation), "Invalid operation");
        require(feeRate <= 10000, "Fee rate must be <= 100%");

        uint256 oldFeeRate = globalFeeRates[operation];
        globalFeeRates[operation] = feeRate;

        emit GlobalFeeRateUpdated(operation, oldFeeRate, feeRate, msg.sender);
    }

    /**
     * @dev Gets global fee rate for an operation
     * @param operation The operation type
     * @return feeRate The fee rate in basis points (0 = disabled)
     */
    function getGlobalFeeRate(string calldata operation) external view override returns (uint256 feeRate) {
        return globalFeeRates[operation];
    }

    /**
     * @dev Gets total fees collected for an asset
     * @param assetId The asset identifier
     * @return totalFees The total fees collected for this asset
     */
    function getAssetFeesCollected(bytes32 assetId) external view override returns (uint256 totalFees) {
        return assetFeesCollected[assetId];
    }

    /**
     * @dev Gets fees collected for an asset by operation type
     * @param assetId The asset identifier
     * @param operation The operation type
     * @return fees The fees collected for this asset and operation
     */
    function getAssetFeesByOperation(bytes32 assetId, string calldata operation) external view override returns (uint256 fees) {
        return assetFeesByOperation[assetId][operation];
    }

    /**
     * @dev Gets the fee balance available for an asset
     * @param assetId The asset identifier
     * @return balance The fee balance in underlying tokens
     */
    function getAssetFeeBalance(bytes32 assetId) external view override returns (uint256 balance) {
        return assetFeeBalances[assetId];
    }

    /**
     * @dev Internal function to collect fees for an operation
     * @param operation The operation type
     * @param assetId The asset identifier
     * @param amount The operation amount
     * @return feeAmount The actual fee amount collected
     */
    function _collectFee(
        string memory operation,
        bytes32 assetId,
        uint256 amount
    ) internal returns (uint256 feeAmount) {
        uint256 feeRate = globalFeeRates[operation];
        
        if (feeRate == 0) {
            return 0;
        }

        feeAmount = (amount * feeRate) / 10000;
        
        if (feeAmount > 0) {
            // Record fees for this specific asset
            assetFeesCollected[assetId] += feeAmount;
            assetFeesByOperation[assetId][operation] += feeAmount;
            
            // Add to asset fee balance (the actual tokens are held by this contract)
            assetFeeBalances[assetId] += feeAmount;

            emit FeeCollected(assetId, operation, msg.sender, amount, feeAmount);
        }
    }

    /**
     * @dev Internal function to validate operation type
     * @param operation The operation type to validate
     * @return True if operation is valid
     */
    function _isValidOperation(string memory operation) internal pure returns (bool) {
        return (
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_REGISTER)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_WRAP)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_SPLIT)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_MERGE)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_UNWRAP))
        );
    }
}

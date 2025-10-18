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
     * @param metadataURI The metadata URI
     * @return assetId The unique asset identifier
     */
    function register(
        address underlying,
        uint256 maturity,
        uint256 couponRate,
        string calldata metadataURI
    ) external override returns (bytes32 assetId) {
        require(underlying != address(0), "Invalid underlying token");
        require(maturity > block.timestamp, "Maturity must be in the future");
        require(couponRate <= 10000, "Coupon rate must be <= 100%");
        require(bytes(metadataURI).length > 0, "Metadata URI required");

        // Generate unique asset ID
        assetId = keccak256(abi.encodePacked(
            underlying,
            maturity,
            couponRate,
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
            metadataURI: metadataURI,
            verified: false,
            aqToken: address(0),
            pToken: address(0),
            cToken: address(0),
            sToken: address(0)
        });

        emit AssetRegistered(assetId, msg.sender, underlying, maturity, couponRate, metadataURI);
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
            string memory symbol = string(abi.encodePacked("aq", IERC20Metadata(asset.underlying).symbol()));
            
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
} 
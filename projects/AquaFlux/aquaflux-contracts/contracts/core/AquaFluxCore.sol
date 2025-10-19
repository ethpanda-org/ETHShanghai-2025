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
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../interfaces/IAquaFluxCore.sol";
import "../interfaces/IBaseToken.sol";
import "../interfaces/ITokenFactory.sol";
import "../utils/DateUtils.sol";

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
    using DateUtils for uint256;

    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant TIMELOCK_ROLE = keccak256("TIMELOCK_ROLE");

    // Factory contract for deploying tokens
    ITokenFactory public factory;

    // Timelock contract for governance operations
    address public timelock;

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

    // === MATURITY MANAGEMENT DATA STRUCTURES ===

    // Asset maturity management structure
    struct AssetMaturityManagement {
        bool operationsStopped; // Whether operations have been stopped
        bool fundsWithdrawn; // Whether funds were withdrawn for offline redemption
        bool revenueInjected; // Whether redemption revenue was injected
        bool distributionSet; // Whether distribution plan was set
        uint256 withdrawnAmount; // Amount of underlying tokens withdrawn
        uint256 totalRevenueInjected; // Total revenue injected back
        uint256 injectionTimestamp; // Timestamp when revenue was injected
    }

    // Token distribution plan structure
    struct TokenDistributionPlan {
        uint256 pTokenAllocation; // P Token allocation amount
        uint256 cTokenAllocation; // C Token allocation amount
        uint256 sTokenAllocation; // S Token allocation amount (includes protocol fee reward)
        uint256 protocolFeeReward; // Additional protocol fee reward for S Token holders
        uint256 allocationTimestamp; // Timestamp when allocation was set
    }

    // Asset lifecycle states
    enum AssetLifecycleState {
        ACTIVE, // Active trading state
        OPERATIONS_STOPPED, // Operations stopped (reached operationDeadline)
        FUNDS_WITHDRAWN, // Funds withdrawn for offline redemption
        REVENUE_INJECTED, // Redemption revenue injected
        DISTRIBUTION_SET, // Distribution plan set
        CLAIMABLE // Users can claim rewards
    }

    // Maturity management mappings
    mapping(bytes32 => AssetMaturityManagement) public maturityManagement;
    mapping(bytes32 => TokenDistributionPlan) public distributionPlans;

    // User claim tracking: assetId => user => tokenAddress => claimed
    mapping(bytes32 => mapping(address => mapping(address => bool)))
        public userClaimed;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the registry
     * @param _factory The clone factory contract address
     * @param admin The admin address
     * @param _timelock The timelock contract address (required)
     */
    function initialize(address _factory, address admin, address _timelock) public initializer {
        __AccessControl_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();

        // Validate all required parameters
        if (_factory == address(0)) revert InvalidFactoryAddress();
        if (admin == address(0)) revert InvalidAdminAddress();
        if (_timelock == address(0)) revert InvalidTimelockAddress();

        factory = ITokenFactory(_factory);

        // Grant roles
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(VERIFIER_ROLE, admin);
        _grantRole(OPERATOR_ROLE, admin);
        
        // Configure timelock (required for governance functionality)
        timelock = _timelock;
        _grantRole(TIMELOCK_ROLE, _timelock);
        emit TimelockUpdated(address(0), _timelock);
    }

    /**
     * @dev Changes the token factory address
     * @param newFactory The address of the new factory contract
     */
    function setFactory(address newFactory) external onlyRole(TIMELOCK_ROLE) {
        if (newFactory == address(0)) revert InvalidFactoryAddress();
        // Basic compatibility check - ensure it has the required interface
        if (ITokenFactory(newFactory).deployToken.selector == bytes4(0)) revert InvalidFactoryInterface();

        address oldFactory = address(factory);
        factory = ITokenFactory(newFactory);

        emit FactoryChanged(oldFactory, newFactory);
    }

    /**
     * @dev Sets the timelock contract address (governance controlled)
     * Can only be called through the existing timelock governance process
     * @param newTimelock The address of the new timelock contract
     */
    function setTimelock(address newTimelock) external onlyRole(TIMELOCK_ROLE) {
        if (newTimelock == address(0)) revert InvalidTimelockAddress();

        address oldTimelock = timelock;
        timelock = newTimelock;

        // Grant TIMELOCK_ROLE to the new timelock contract
        _grantRole(TIMELOCK_ROLE, newTimelock);

        // Revoke TIMELOCK_ROLE from old timelock if it exists
        if (oldTimelock != address(0)) {
            _revokeRole(TIMELOCK_ROLE, oldTimelock);
        }

        emit TimelockUpdated(oldTimelock, newTimelock);
    }

    /**
     * @dev Gets the current timelock contract address
     * @return The address of the timelock contract
     */
    function getTimelock() external view returns (address) {
        return timelock;
    }

    /**
     * @dev Checks if timelock is configured and ready for use
     * @return True if timelock is set and has TIMELOCK_ROLE
     */
    function isTimelockReady() external view returns (bool) {
        return timelock != address(0) && hasRole(TIMELOCK_ROLE, timelock);
    }

    /**
     * @dev Registers a new asset, token will not be deployed until wrap is called
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
    ) external override returns (bytes32 assetId) {
        if (underlying == address(0)) revert InvalidUnderlyingToken();
        if (maturity <= block.timestamp) revert MaturityMustBeInFuture();
        if (operationDeadline <= block.timestamp) revert OperationDeadlineMustBeInFutureReg();
        if (operationDeadline >= maturity) revert OperationDeadlineMustBeBeforeMaturity();
        if (couponRate > 10000) revert CouponRateTooHigh();
        if (couponAllocationC > 10000) revert InvalidAllocationPercentage();
        if (couponAllocationS > 10000) revert InvalidAllocationPercentage();
        if (couponAllocationC + couponAllocationS != 10000) revert AllocationSumMustEqual100();
        if (sTokenFeeAllocation > 10000) revert STokenFeeAllocationTooHigh();
        if (bytes(name).length == 0) revert AssetNameRequired();
        if (bytes(metadataURI).length == 0) revert MetadataURIRequired();

        // Generate unique asset ID
        assetId = keccak256(abi.encodePacked(address(this), _assetIdCounter++));

        if (isAssetRegistered(assetId)) revert AssetAlreadyRegistered();

        // Collect fee for register operation (if enabled)
        // Note: For register operation, we use amount = 1 as a base unit for fee calculation
        // since there's no actual token amount involved in registration
        _collectFee(OPERATION_REGISTER, assetId, 1);

        // Create asset info
        assets[assetId] = AssetInfo({
            issuer: msg.sender,
            underlying: underlying,
            maturity: maturity,
            operationDeadline: operationDeadline,
            couponRate: couponRate,
            couponAllocationC: couponAllocationC,
            couponAllocationS: couponAllocationS,
            sTokenFeeAllocation: sTokenFeeAllocation,
            name: name,
            metadataURI: metadataURI,
            verified: false,
            paused: false,
            aqToken: address(0),
            pToken: address(0),
            cToken: address(0),
            sToken: address(0)
        });

        emit AssetRegistered(
            assetId,
            msg.sender,
            underlying,
            maturity,
            operationDeadline,
            couponRate,
            couponAllocationC,
            couponAllocationS,
            sTokenFeeAllocation,
            name,
            metadataURI
        );
    }

    /**
     * @dev Verifies an asset (admin only)
     * @param assetId The asset identifier to verify
     */
    function verify(bytes32 assetId) external override onlyRole(VERIFIER_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (assets[assetId].verified) revert AssetAlreadyVerified();

        assets[assetId].verified = true;
        emit AssetVerified(assetId);
    }

    /**
     * @dev Wraps underlying assets into AqTokens
     * @param assetId The asset identifier
     * @param amount The amount to wrap
     */
    function wrap(
        bytes32 assetId,
        uint256 amount
    )
        external
        override
        nonReentrant
        whenNotPaused
        whenAssetNotPaused(assetId)
        whenAssetOperationsAllowed(assetId)
    {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!assets[assetId].verified) revert AssetNotVerified();

        AssetInfo storage asset = assets[assetId];
        IERC20 underlying = IERC20(asset.underlying);

        // Collect fee for wrap operation
        uint256 feeAmount = _collectFee(OPERATION_WRAP, assetId, amount);
        uint256 netAmount = amount - feeAmount;

        // Transfer underlying tokens from user to this contract and verify full amount arrived
        uint256 balanceBefore = underlying.balanceOf(address(this));
        underlying.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = underlying.balanceOf(address(this));
        if (balanceAfter - balanceBefore != amount) revert InsufficientUnderlyingReceived();

        // Deploy AqToken if not already deployed
        if (asset.aqToken == address(0)) {
            string memory name = string(
                abi.encodePacked(
                    "AquaFlux ",
                    IERC20Metadata(asset.underlying).symbol()
                )
            );
            string memory symbol = string(
                abi.encodePacked(
                    "aq ",
                    IERC20Metadata(asset.underlying).symbol()
                )
            );

            asset.aqToken = factory.deployToken("AQ", assetId, name, symbol);
        }

        // Mint AqTokens to user (net amount after fee)
        IBaseToken(asset.aqToken).mint(msg.sender, netAmount);

        emit AssetWrapped(assetId, msg.sender, amount, feeAmount, netAmount);
    }

    /**
     * @dev Splits AqTokens into P/C/S tokens
     * @param assetId The asset identifier
     * @param amount The amount to split
     */
    function split(
        bytes32 assetId,
        uint256 amount
    )
        external
        override
        nonReentrant
        whenNotPaused
        whenAssetNotPaused(assetId)
        whenAssetOperationsAllowed(assetId)
    {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!assets[assetId].verified) revert AssetNotVerified();

        AssetInfo storage asset = assets[assetId];
        if (asset.aqToken == address(0)) revert AqTokenNotDeployed();

        // Collect fee for split operation
        uint256 feeAmount = _collectFee(OPERATION_SPLIT, assetId, amount);
        uint256 netAmount = amount - feeAmount;

        // Burn AqTokens from user
        IBaseToken(asset.aqToken).burn(msg.sender, amount);

        // Deploy P/C/S tokens if not already deployed
        if (asset.pToken == address(0)) {
            string memory name = DateUtils.formatAssetTokenName(
                "P",
                asset.name,
                asset.maturity
            );
            string memory symbol = DateUtils.formatAssetTokenName(
                "P",
                asset.name,
                asset.maturity
            );
            asset.pToken = factory.deployToken("P", assetId, name, symbol);
        }

        if (asset.cToken == address(0)) {
            string memory name = DateUtils.formatAssetTokenName(
                "C",
                asset.name,
                asset.maturity
            );
            string memory symbol = DateUtils.formatAssetTokenName(
                "C",
                asset.name,
                asset.maturity
            );
            asset.cToken = factory.deployToken("C", assetId, name, symbol);
        }

        if (asset.sToken == address(0)) {
            string memory name = DateUtils.formatAssetTokenName(
                "S",
                asset.name,
                asset.maturity
            );
            string memory symbol = DateUtils.formatAssetTokenName(
                "S",
                asset.name,
                asset.maturity
            );
            asset.sToken = factory.deployToken("S", assetId, name, symbol);
        }

        // Mint P/C/S tokens to user (net amount after fee, 1:1:1 ratio)
        IBaseToken(asset.pToken).mint(msg.sender, netAmount);
        IBaseToken(asset.cToken).mint(msg.sender, netAmount);
        IBaseToken(asset.sToken).mint(msg.sender, netAmount);

        emit AssetSplit(assetId, msg.sender, amount, feeAmount, netAmount);
    }

    /**
     * @dev Merges P/C/S tokens back to AqTokens
     * @param assetId The asset identifier
     * @param amount The amount to merge
     */
    function merge(
        bytes32 assetId,
        uint256 amount
    )
        external
        override
        nonReentrant
        whenNotPaused
        whenAssetNotPaused(assetId)
        whenAssetOperationsAllowed(assetId)
    {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!assets[assetId].verified) revert AssetNotVerified();

        AssetInfo storage asset = assets[assetId];
        if (asset.aqToken == address(0)) revert AqTokenNotDeployed();
        if (asset.pToken == address(0)) revert PTokenNotDeployed();
        if (asset.cToken == address(0)) revert CTokenNotDeployed();
        if (asset.sToken == address(0)) revert STokenNotDeployed();

        // Collect fee for merge operation
        uint256 feeAmount = _collectFee(OPERATION_MERGE, assetId, amount);
        uint256 netAmount = amount - feeAmount;

        // Burn P/C/S tokens from user
        IBaseToken(asset.pToken).burn(msg.sender, amount);
        IBaseToken(asset.cToken).burn(msg.sender, amount);
        IBaseToken(asset.sToken).burn(msg.sender, amount);

        // Mint AqTokens to user (net amount after fee)
        IBaseToken(asset.aqToken).mint(msg.sender, netAmount);

        emit AssetMerged(assetId, msg.sender, amount, feeAmount, netAmount);
    }

    /**
     * @dev Unwraps AqTokens to underlying assets
     * @param assetId The asset identifier
     * @param amount The amount to unwrap
     */
    function unwrap(
        bytes32 assetId,
        uint256 amount
    )
        external
        override
        nonReentrant
        whenNotPaused
        whenAssetNotPaused(assetId)
        whenAssetOperationsAllowed(assetId)
    {
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!assets[assetId].verified) revert AssetNotVerified();

        AssetInfo storage asset = assets[assetId];
        if (asset.aqToken == address(0)) revert AqTokenNotDeployed();

        // Collect fee for unwrap operation
        uint256 feeAmount = _collectFee(OPERATION_UNWRAP, assetId, amount);
        uint256 netAmount = amount - feeAmount;

        // Burn AqTokens from user
        IBaseToken(asset.aqToken).burn(msg.sender, amount);

        // Transfer underlying tokens to user (net amount after fee)
        IERC20(asset.underlying).safeTransfer(msg.sender, netAmount);

        emit AssetUnwrapped(assetId, msg.sender, amount, feeAmount, netAmount);
    }

    /**
     * @dev Gets asset information
     * @param assetId The asset identifier
     * @return The asset information
     */
    function getAssetInfo(
        bytes32 assetId
    ) external view override returns (AssetInfo memory) {
        return assets[assetId];
    }

    /**
     * @dev Checks if an asset is registered
     * @param assetId The asset identifier
     * @return True if asset is registered
     */
    function isAssetRegistered(
        bytes32 assetId
    ) public view override returns (bool) {
        return assets[assetId].issuer != address(0);
    }

    /**
     * @dev Checks if an asset is verified
     * @param assetId The asset identifier
     * @return True if asset is verified
     */
    function isAssetVerified(
        bytes32 assetId
    ) external view override returns (bool) {
        return assets[assetId].verified;
    }

    /**
     * @dev Pauses all operations
     */
    function pause() external onlyRole(OPERATOR_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses all operations
     */
    function unpause() external onlyRole(TIMELOCK_ROLE) {
        _unpause();
    }

    /**
     * @dev Required by the OZ UUPS module
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(TIMELOCK_ROLE) {}

    /**
     * @dev Returns the version of the registry
     */
    function version() public pure returns (string memory) {
        return "1.0.0";
    }

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
    ) external override onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (newCouponAllocationC > 10000) revert InvalidAllocationPercentage();
        if (newCouponAllocationS > 10000) revert InvalidAllocationPercentage();
        if (newCouponAllocationC + newCouponAllocationS != 10000) revert AllocationSumMustEqual100();

        AssetInfo storage asset = assets[assetId];

        // Store old values for event
        uint256 oldCAllocation = asset.couponAllocationC;
        uint256 oldSAllocation = asset.couponAllocationS;

        // Update allocations
        asset.couponAllocationC = newCouponAllocationC;
        asset.couponAllocationS = newCouponAllocationS;

        emit CouponAllocationUpdated(
            assetId,
            oldCAllocation,
            oldSAllocation,
            newCouponAllocationC,
            newCouponAllocationS,
            msg.sender
        );
    }

    /**
     * @dev Updates the metadata URI for an asset (admin only)
     * @param assetId The asset identifier
     * @param newMetadataURI The new metadata URI
     */
    function updateMetadataURI(
        bytes32 assetId,
        string calldata newMetadataURI
    ) external override onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (bytes(newMetadataURI).length == 0) revert EmptyMetadataURI();

        AssetInfo storage asset = assets[assetId];

        // Store old value for event
        string memory oldMetadataURI = asset.metadataURI;

        // Update metadata URI
        asset.metadataURI = newMetadataURI;

        emit MetadataURIUpdated(
            assetId,
            oldMetadataURI,
            newMetadataURI,
            msg.sender
        );
    }

    /**
     * @dev Updates the S Token fee allocation for an asset (admin only)
     * @param assetId The asset identifier
     * @param newSTokenFeeAllocation The new S Token fee allocation (in basis points, 0-10000)
     */
    function updateSTokenFeeAllocation(
        bytes32 assetId,
        uint256 newSTokenFeeAllocation
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (newSTokenFeeAllocation > 10000) revert STokenFeeAllocationTooHigh();

        AssetInfo storage asset = assets[assetId];

        // Store old value for event
        uint256 oldSTokenFeeAllocation = asset.sTokenFeeAllocation;

        // Update S Token fee allocation
        asset.sTokenFeeAllocation = newSTokenFeeAllocation;

        emit STokenFeeAllocationUpdated(
            assetId,
            oldSTokenFeeAllocation,
            newSTokenFeeAllocation,
            msg.sender
        );
    }

    /**
     * @dev Updates the operation deadline for an asset (admin only)
     * @param assetId The asset identifier
     * @param newOperationDeadline The new operation deadline (must be before maturity)
     */
    function updateOperationDeadline(
        bytes32 assetId,
        uint256 newOperationDeadline
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (newOperationDeadline <= block.timestamp) revert OperationDeadlineMustBeInFuture();
        if (newOperationDeadline >= assets[assetId].maturity) revert OperationDeadlineMustBeBeforeMaturity();

        AssetInfo storage asset = assets[assetId];

        // Store old value for event
        uint256 oldOperationDeadline = asset.operationDeadline;

        // Update operation deadline
        asset.operationDeadline = newOperationDeadline;

        emit OperationDeadlineUpdated(
            assetId,
            oldOperationDeadline,
            newOperationDeadline,
            msg.sender
        );
    }

    /**
     * @dev Sets global fee rate for an operation (admin only)
     * @param operation The operation type (register, wrap, split, merge, unwrap)
     * @param feeRate The fee rate in basis points (0-10000, 0 = disabled)
     */
    function setGlobalFeeRate(
        string calldata operation,
        uint256 feeRate
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!_isValidOperation(operation)) revert InvalidOperation();
        if (feeRate > 10000) revert FeeRateTooHigh();

        uint256 oldFeeRate = globalFeeRates[operation];
        globalFeeRates[operation] = feeRate;

        emit GlobalFeeRateUpdated(operation, oldFeeRate, feeRate, msg.sender);
    }

    /**
     * @dev Gets global fee rate for an operation
     * @param operation The operation type
     * @return feeRate The fee rate in basis points (0 = disabled)
     */
    function getGlobalFeeRate(
        string calldata operation
    ) external view returns (uint256 feeRate) {
        return globalFeeRates[operation];
    }

    /**
     * @dev Gets total fees collected for an asset
     * @param assetId The asset identifier
     * @return totalFees The total fees collected for this asset
     */
    function getAssetFeesCollected(
        bytes32 assetId
    ) external view returns (uint256 totalFees) {
        return assetFeesCollected[assetId];
    }

    /**
     * @dev Gets fees collected for an asset by operation type
     * @param assetId The asset identifier
     * @param operation The operation type
     * @return fees The fees collected for this asset and operation
     */
    function getAssetFeesByOperation(
        bytes32 assetId,
        string calldata operation
    ) external view returns (uint256 fees) {
        return assetFeesByOperation[assetId][operation];
    }

    /**
     * @dev Gets the fee balance available for an asset
     * @param assetId The asset identifier
     * @return balance The fee balance in underlying tokens
     */
    function getAssetFeeBalance(
        bytes32 assetId
    ) external view returns (uint256 balance) {
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

        feeAmount = Math.mulDiv(amount, feeRate, 10000);

        if (feeAmount > 0) {
            // Record fees for this specific asset
            assetFeesCollected[assetId] += feeAmount;
            assetFeesByOperation[assetId][operation] += feeAmount;

            // Add to asset fee balance (the actual tokens are held by this contract)
            assetFeeBalances[assetId] += feeAmount;

            emit FeeCollected(
                assetId,
                operation,
                msg.sender,
                amount,
                feeAmount
            );
        }
    }

    /**
     * @dev Pauses all operations for a specific asset (admin only)
     * @param assetId The asset identifier to pause
     */
    function pauseAsset(bytes32 assetId) external onlyRole(OPERATOR_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (assets[assetId].paused) revert AssetAlreadyPaused();

        assets[assetId].paused = true;
        emit AssetPaused(assetId, msg.sender);
    }

    /**
     * @dev Unpauses all operations for a specific asset (admin only)
     * @param assetId The asset identifier to unpause
     */
    function unpauseAsset(bytes32 assetId) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!assets[assetId].paused) revert AssetNotPaused();

        assets[assetId].paused = false;
        emit AssetUnpaused(assetId, msg.sender);
    }

    /**
     * @dev Checks if an asset is paused
     * @param assetId The asset identifier
     * @return True if asset is paused
     */
    function isAssetPaused(bytes32 assetId) external view returns (bool) {
        return assets[assetId].paused;
    }

    /**
     * @dev Modifier to check if an asset is not paused
     * @param assetId The asset identifier to check
     */
    modifier whenAssetNotPaused(bytes32 assetId) {
        if (assets[assetId].paused) revert AssetOperationsArePaused();
        _;
    }

    /**
     * @dev Modifier to check if operations are still allowed for an asset
     * @param assetId The asset identifier to check
     */
    modifier whenOperationAllowed(bytes32 assetId) {
        if (block.timestamp >= assets[assetId].operationDeadline) revert AssetOperationsHaveExpired();
        _;
    }

    /**
     * @dev Internal function to validate operation type
     * @param operation The operation type to validate
     * @return True if operation is valid
     */
    function _isValidOperation(
        string memory operation
    ) internal pure returns (bool) {
        return (keccak256(bytes(operation)) ==
            keccak256(bytes(OPERATION_REGISTER)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_WRAP)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_SPLIT)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_MERGE)) ||
            keccak256(bytes(operation)) == keccak256(bytes(OPERATION_UNWRAP)));
    }

    // === MATURITY MANAGEMENT FUNCTIONS ===

    /**
     * @dev Gets the current lifecycle state of an asset
     * @param assetId The asset identifier
     * @return The current lifecycle state (0=ACTIVE, 1=OPERATIONS_STOPPED, 2=FUNDS_WITHDRAWN, 3=REVENUE_INJECTED, 4=DISTRIBUTION_SET, 5=CLAIMABLE)
     */
    function getAssetLifecycleState(
        bytes32 assetId
    ) external view returns (uint8) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();

        AssetInfo storage asset = assets[assetId];
        AssetMaturityManagement storage management = maturityManagement[
            assetId
        ];

        // Check if operations are manually stopped first
        if (management.operationsStopped) {
            if (!management.fundsWithdrawn) {
                return uint8(AssetLifecycleState.OPERATIONS_STOPPED);
            }

            if (!management.revenueInjected) {
                return uint8(AssetLifecycleState.FUNDS_WITHDRAWN);
            }

            if (!management.distributionSet) {
                return uint8(AssetLifecycleState.REVENUE_INJECTED);
            }

            return uint8(AssetLifecycleState.CLAIMABLE);
        }

        // Check if still in active trading period and not manually stopped
        if (block.timestamp < asset.operationDeadline) {
            return uint8(AssetLifecycleState.ACTIVE);
        }

        // Operations should be stopped after deadline (but not manually stopped yet)
        return uint8(AssetLifecycleState.OPERATIONS_STOPPED);
    }

    /**
     * @dev Manually stops operations for an asset (admin only)
     * @param assetId The asset identifier
     */
    function stopAssetOperations(
        bytes32 assetId
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (maturityManagement[assetId].operationsStopped) revert OperationsAlreadyStopped();

        maturityManagement[assetId].operationsStopped = true;

        emit AssetOperationsStopped(assetId, msg.sender);
    }

    /**
     * @dev Checks if operations are stopped for an asset (internal)
     * @param assetId The asset identifier
     * @return True if operations are stopped
     */
    function _areOperationsStopped(
        bytes32 assetId
    ) internal view returns (bool) {
        // Operations are stopped if:
        // 1. Manual stop was triggered, OR
        // 2. Operation deadline has passed
        if (maturityManagement[assetId].operationsStopped) {
            return true;
        }

        return block.timestamp >= assets[assetId].operationDeadline;
    }

    /**
     * @dev Modifier to check if asset operations are allowed
     * @param assetId The asset identifier
     */
    modifier whenAssetOperationsAllowed(bytes32 assetId) {
        if (_areOperationsStopped(assetId)) revert AssetOperationsAreStopped();
        _;
    }

    // === DAO MANAGEMENT FUNCTIONS ===

    /**
     * @dev Withdraws underlying tokens for offline redemption (admin only)
     * @param assetId The asset identifier
     * @param amount The amount to withdraw
     */
    function withdrawForRedemption(
        bytes32 assetId,
        uint256 amount
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!_areOperationsStopped(assetId)) revert OperationsNotStoppedYet();
        if (maturityManagement[assetId].fundsWithdrawn) revert FundsAlreadyWithdrawn();
        if (amount == 0) revert AmountMustBeGreaterThanZero();

        AssetInfo storage asset = assets[assetId];
        IERC20 underlying = IERC20(asset.underlying);

        uint256 contractBalance = underlying.balanceOf(address(this));
        if (contractBalance < amount) revert InsufficientContractBalance();

        // Mark funds as withdrawn
        maturityManagement[assetId].fundsWithdrawn = true;
        maturityManagement[assetId].withdrawnAmount = amount;

        // Transfer underlying tokens to admin for offline redemption
        underlying.safeTransfer(msg.sender, amount);

        emit FundsWithdrawnForRedemption(assetId, msg.sender, amount);
    }

    /**
     * @dev Injects redemption revenue back into the contract (admin only)
     * @param assetId The asset identifier
     * @param amount The amount of revenue to inject
     */
    function injectRedemptionRevenue(
        bytes32 assetId,
        uint256 amount
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!maturityManagement[assetId].fundsWithdrawn) revert FundsNotWithdrawnYet();
        if (maturityManagement[assetId].revenueInjected) revert RevenueAlreadyInjected();
        if (amount == 0) revert AmountMustBeGreaterThanZero();

        AssetInfo storage asset = assets[assetId];
        IERC20 underlying = IERC20(asset.underlying);

        // Mark revenue as injected
        maturityManagement[assetId].revenueInjected = true;
        maturityManagement[assetId].totalRevenueInjected = amount;
        maturityManagement[assetId].injectionTimestamp = block.timestamp;

        // Transfer revenue from admin to contract and verify the full amount arrived
        uint256 balanceBefore = underlying.balanceOf(address(this));
        underlying.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = underlying.balanceOf(address(this));
        if (balanceAfter - balanceBefore != amount) revert InsufficientRevenueReceived();

        emit RedemptionRevenueInjected(assetId, msg.sender, amount);
    }

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
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!maturityManagement[assetId].revenueInjected) revert RevenueNotInjectedYet();
        if (maturityManagement[assetId].distributionSet) revert DistributionAlreadySet();

        // Calculate total allocation including protocol fee reward
        uint256 totalAllocation = pAllocation +
            cAllocation +
            sAllocation +
            protocolFeeReward;
        if (totalAllocation == 0) revert TotalAllocationMustBeGreaterThanZero();
        if (totalAllocation > maturityManagement[assetId].totalRevenueInjected) revert TotalAllocationExceedsInjectedRevenue();

        // Set distribution plan
        distributionPlans[assetId] = TokenDistributionPlan({
            pTokenAllocation: pAllocation,
            cTokenAllocation: cAllocation,
            sTokenAllocation: sAllocation,
            protocolFeeReward: protocolFeeReward,
            allocationTimestamp: block.timestamp
        });

        maturityManagement[assetId].distributionSet = true;

        emit DistributionPlanSet(
            assetId,
            pAllocation,
            cAllocation,
            sAllocation,
            protocolFeeReward,
            msg.sender
        );
    }

    /**
     * @dev Claims maturity reward for a specific token type
     * @param assetId The asset identifier
     * @param tokenAddress The token address (P, C, or S token)
     */
    function claimMaturityReward(
        bytes32 assetId,
        address tokenAddress
    ) external nonReentrant {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!maturityManagement[assetId].distributionSet) revert DistributionNotSet();
        if (userClaimed[assetId][msg.sender][tokenAddress]) revert AlreadyClaimed();

        AssetInfo storage asset = assets[assetId];
        TokenDistributionPlan storage plan = distributionPlans[assetId];

        // Verify tokenAddress is valid for this asset
        if (tokenAddress != asset.pToken && tokenAddress != asset.cToken && tokenAddress != asset.sToken) revert InvalidTokenAddress();
        if (tokenAddress == address(0)) revert TokenNotDeployed();

        // Get user's token balance
        uint256 userBalance = IERC20(tokenAddress).balanceOf(msg.sender);
        if (userBalance == 0) revert NoTokensToClaimFor();

        // Get total supply of the token
        uint256 totalSupply = IERC20(tokenAddress).totalSupply();
        if (totalSupply == 0) revert NoTotalSupply();

        // Calculate user's proportional reward
        uint256 tokenAllocation;
        if (tokenAddress == asset.pToken) {
            tokenAllocation = plan.pTokenAllocation;
        } else if (tokenAddress == asset.cToken) {
            tokenAllocation = plan.cTokenAllocation;
        } else if (tokenAddress == asset.sToken) {
            // S Token gets its allocation plus protocol fee reward
            tokenAllocation = plan.sTokenAllocation + plan.protocolFeeReward;
        }

        uint256 userReward = Math.mulDiv(
            tokenAllocation,
            userBalance,
            totalSupply
        );
        if (userReward == 0) revert NoRewardToClaim();

        // Check contract has sufficient balance
        uint256 contractBalance = IERC20(asset.underlying).balanceOf(
            address(this)
        );
        if (contractBalance < userReward) revert InsufficientContractBalance();

        // Mark as claimed
        userClaimed[assetId][msg.sender][tokenAddress] = true;

        // Transfer reward to user
        IERC20(asset.underlying).safeTransfer(msg.sender, userReward);

        emit MaturityRewardClaimed(
            assetId,
            msg.sender,
            tokenAddress,
            userBalance,
            userReward
        );
    }

    /**
     * @dev Claims maturity rewards for all token types at once
     * @param assetId The asset identifier
     */
    function claimAllMaturityRewards(bytes32 assetId) external nonReentrant {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (!maturityManagement[assetId].distributionSet) revert DistributionNotSet();

        AssetInfo storage asset = assets[assetId];
        TokenDistributionPlan storage plan = distributionPlans[assetId];

        uint256 totalReward = 0;
        uint256 userReward;

        // Claim P Token rewards
        if (
            asset.pToken != address(0) &&
            !userClaimed[assetId][msg.sender][asset.pToken]
        ) {
            uint256 userBalance = IERC20(asset.pToken).balanceOf(msg.sender);
            if (userBalance > 0) {
                uint256 totalSupply = IERC20(asset.pToken).totalSupply();
                if (totalSupply > 0) {
                    userReward = Math.mulDiv(
                        plan.pTokenAllocation,
                        userBalance,
                        totalSupply
                    );
                    if (userReward > 0) {
                        userClaimed[assetId][msg.sender][asset.pToken] = true;
                        totalReward += userReward;
                        emit MaturityRewardClaimed(
                            assetId,
                            msg.sender,
                            asset.pToken,
                            userBalance,
                            userReward
                        );
                    }
                }
            }
        }

        // Claim C Token rewards
        if (
            asset.cToken != address(0) &&
            !userClaimed[assetId][msg.sender][asset.cToken]
        ) {
            uint256 userBalance = IERC20(asset.cToken).balanceOf(msg.sender);
            if (userBalance > 0) {
                uint256 totalSupply = IERC20(asset.cToken).totalSupply();
                if (totalSupply > 0) {
                    userReward = Math.mulDiv(
                        plan.cTokenAllocation,
                        userBalance,
                        totalSupply
                    );
                    if (userReward > 0) {
                        userClaimed[assetId][msg.sender][asset.cToken] = true;
                        totalReward += userReward;
                        emit MaturityRewardClaimed(
                            assetId,
                            msg.sender,
                            asset.cToken,
                            userBalance,
                            userReward
                        );
                    }
                }
            }
        }

        // Claim S Token rewards (includes protocol fee reward)
        if (
            asset.sToken != address(0) &&
            !userClaimed[assetId][msg.sender][asset.sToken]
        ) {
            uint256 userBalance = IERC20(asset.sToken).balanceOf(msg.sender);
            if (userBalance > 0) {
                uint256 totalSupply = IERC20(asset.sToken).totalSupply();
                if (totalSupply > 0) {
                    userReward = Math.mulDiv(
                        plan.sTokenAllocation + plan.protocolFeeReward,
                        userBalance,
                        totalSupply
                    );
                    if (userReward > 0) {
                        userClaimed[assetId][msg.sender][asset.sToken] = true;
                        totalReward += userReward;
                        emit MaturityRewardClaimed(
                            assetId,
                            msg.sender,
                            asset.sToken,
                            userBalance,
                            userReward
                        );
                    }
                }
            }
        }

        if (totalReward == 0) revert NoRewardsToClaim();

        // Check contract has sufficient balance
        uint256 contractBalance = IERC20(asset.underlying).balanceOf(
            address(this)
        );
        if (contractBalance < totalReward) revert InsufficientContractBalance();

        // Transfer total reward to user
        IERC20(asset.underlying).safeTransfer(msg.sender, totalReward);
    }

    /**
     * @dev Gets claimable reward amount for a user and token type
     * @param assetId The asset identifier
     * @param user The user address
     * @param tokenAddress The token address
     * @return The claimable reward amount
     */
    function getClaimableReward(
        bytes32 assetId,
        address user,
        address tokenAddress
    ) external view returns (uint256) {
        if (
            !isAssetRegistered(assetId) ||
            !maturityManagement[assetId].distributionSet
        ) {
            return 0;
        }

        if (userClaimed[assetId][user][tokenAddress]) {
            return 0;
        }

        AssetInfo storage asset = assets[assetId];
        if (
            tokenAddress != asset.pToken &&
            tokenAddress != asset.cToken &&
            tokenAddress != asset.sToken
        ) {
            return 0;
        }

        if (tokenAddress == address(0)) {
            return 0;
        }

        uint256 userBalance = IERC20(tokenAddress).balanceOf(user);
        if (userBalance == 0) {
            return 0;
        }

        uint256 totalSupply = IERC20(tokenAddress).totalSupply();
        if (totalSupply == 0) {
            return 0;
        }

        TokenDistributionPlan storage plan = distributionPlans[assetId];
        uint256 tokenAllocation;

        if (tokenAddress == asset.pToken) {
            tokenAllocation = plan.pTokenAllocation;
        } else if (tokenAddress == asset.cToken) {
            tokenAllocation = plan.cTokenAllocation;
        } else if (tokenAddress == asset.sToken) {
            tokenAllocation = plan.sTokenAllocation + plan.protocolFeeReward;
        }

        return Math.mulDiv(tokenAllocation, userBalance, totalSupply);
    }

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
    ) external onlyRole(TIMELOCK_ROLE) {
        if (!isAssetRegistered(assetId)) revert AssetNotRegistered();
        if (to == address(0)) revert InvalidRecipientAddress();
        if (amount == 0) revert AmountMustBeGreaterThanZero();
        if (amount > assetFeeBalances[assetId]) revert InsufficientFeeBalance();

        AssetInfo storage asset = assets[assetId];
        IERC20 underlying = IERC20(asset.underlying);

        // Check contract has sufficient balance
        uint256 contractBalance = underlying.balanceOf(address(this));
        if (contractBalance < amount) revert InsufficientContractBalance();

        // Check tracked fee balance
        if (assetFeeBalances[assetId] < amount) revert InsufficientFeeBalance();

        // Transfer fees to recipient first
        underlying.safeTransfer(to, amount);

        // Only reduce the tracked fee balance after successful transfer
        assetFeeBalances[assetId] -= amount;

        emit ProtocolFeesWithdrawn(assetId, to, amount, msg.sender);
    }

    /**
     * @dev Gets the amount of withdrawable fees for a specific asset
     * @param assetId The asset identifier
     * @return The amount of fees available for withdrawal
     */
    function getWithdrawableFees(
        bytes32 assetId
    ) external view returns (uint256) {
        return assetFeeBalances[assetId];
    }

    /**
     * @dev Withdraws all accumulated protocol fees for multiple assets (admin only)
     * @param assetIds Array of asset identifiers
     * @param to The address to receive the fees
     */
    function withdrawAllProtocolFees(
        bytes32[] calldata assetIds,
        address to
    ) external onlyRole(TIMELOCK_ROLE) {
        if (to == address(0)) revert InvalidRecipientAddress();
        if (assetIds.length == 0) revert NoAssetsProvided();

        uint256 totalWithdrawn = 0;

        for (uint256 i = 0; i < assetIds.length; i++) {
            bytes32 assetId = assetIds[i];
            if (!isAssetRegistered(assetId)) revert AssetNotRegistered();

            uint256 feeBalance = assetFeeBalances[assetId];
            if (feeBalance > 0) {
                AssetInfo storage asset = assets[assetId];
                IERC20 underlying = IERC20(asset.underlying);

                // Check contract has sufficient balance
                uint256 contractBalance = underlying.balanceOf(address(this));
                if (contractBalance >= feeBalance) {
                    // Transfer fees to recipient first
                    underlying.safeTransfer(to, feeBalance);
                    
                    // Only reduce the tracked fee balance after successful transfer
                    assetFeeBalances[assetId] = 0;
                    totalWithdrawn += feeBalance;

                    emit ProtocolFeesWithdrawn(
                        assetId,
                        to,
                        feeBalance,
                        msg.sender
                    );
                }
            }
        }

        if (totalWithdrawn == 0) revert InsufficientFeeBalance();
    }
}

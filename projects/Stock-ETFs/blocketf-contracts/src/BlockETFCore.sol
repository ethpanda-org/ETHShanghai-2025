// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import "./interfaces/IBlockETFCore.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/IRebalanceCallback.sol";

/**
 * @title BlockETFCore
 * @author BlockETF Team
 * @notice Core contract for the Block ETF with dynamic rebalancing capabilities
 * @dev Implements ERC20 token with ETF functionality including minting, burning, and rebalancing
 */
contract BlockETFCore is IBlockETFCore, ERC20, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint256 private constant WEIGHT_PRECISION = 10000;
    uint256 private constant FEE_PRECISION = 1e27;
    uint256 private constant SECONDS_PER_YEAR = 365 days;
    uint256 private constant MINIMUM_LIQUIDITY = 1e3; // Permanently locked liquidity

    // Default rebalance verification thresholds
    uint256 private constant DEFAULT_MAX_SELL_SLIPPAGE_BPS = 200; // 2% max slippage on sell operations
    uint256 private constant DEFAULT_MAX_BUY_SLIPPAGE_BPS = 500; // 5% max slippage on buy operations
    uint256 private constant DEFAULT_MAX_TOTAL_VALUE_LOSS_BPS = 500; // 5% max total value loss
    uint256 private constant DEFAULT_WEIGHT_IMPROVEMENT_TOLERANCE_BPS = 200; // 2% weight improvement tolerance
    uint256 private constant DEFAULT_UNCHANGED_ASSET_TOLERANCE_BPS = 1; // 0.01% tolerance for unchanged assets

    // Maximum allowed values for verification thresholds (safety limits)
    uint256 private constant MAX_ALLOWED_SLIPPAGE_BPS = 1000; // Max 10% slippage (buy/sell)
    uint256 private constant MAX_ALLOWED_TOTAL_VALUE_LOSS_BPS = 1000; // Max 10% total value loss
    uint256 private constant MAX_ALLOWED_WEIGHT_TOLERANCE_BPS = 500; // Max 5% weight tolerance
    uint256 private constant MAX_ALLOWED_UNCHANGED_TOLERANCE_BPS = 100; // Max 1% unchanged tolerance

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Whether the ETF has been initialized
    bool public initialized;

    /// @notice Array of asset addresses in the ETF
    address[] public assets;

    /// @notice Mapping of asset addresses to their information
    mapping(address => AssetInfo) public assetInfo;

    /// @notice Mapping to check if an address is a valid asset
    mapping(address => bool) public isAsset;

    /// @notice Fee-related information
    FeeInfo public feeInfo;

    /// @notice Address that receives collected fees
    address public feeCollector;

    /// @notice Price oracle contract
    IPriceOracle public priceOracle;

    /// @notice Rebalancer contract address
    address public rebalancer;

    /// @notice Threshold for triggering rebalance (basis points, e.g., 500 = 5%)
    uint256 public rebalanceThreshold;

    /// @notice Minimum cooldown period between rebalances
    uint256 public minRebalanceCooldown;

    /// @notice Timestamp of last rebalance
    uint256 public lastRebalanceTime;

    /// @notice Rebalance verification thresholds (configurable)
    uint256 public maxSellSlippageBps;
    uint256 public maxBuySlippageBps;
    uint256 public maxTotalValueLossBps;
    uint256 public weightImprovementToleranceBps;
    uint256 public unchangedAssetToleranceBps;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    // Events are inherited from IBlockETFCore interface

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error AlreadyInitialized();
    error CooldownNotMet();
    error CooldownTooLong();
    error DuplicateAsset();
    error ExcessiveLoss();
    error ExcessiveBuyAmount();
    error ExcessivePriceDeviation();
    error ExcessiveSlippage();
    error FeeTooHigh();
    error InsufficientBuyAmount();
    error OrphanedTokens();
    error UnexpectedBalanceChange();
    error InsufficientBalance();
    error InsufficientInitialSupply();
    error InvalidAmount();
    error InvalidAsset();
    error InvalidFeeCollector();
    error InvalidLength();
    error InvalidOracle();
    error InvalidPrice();
    error InvalidRatio();
    error InvalidRebalance();
    error InvalidRecipient();
    error InvalidShares();
    error InvalidTotalWeight();
    error InvalidWeight();
    error NoAssets();
    error ThresholdTooLarge();
    error NoNewAssets();
    error NotInitialized();
    error OracleNotSet();
    error RebalanceNotImplemented();
    error RebalanceNotNeeded();
    error ThresholdTooHigh();
    error TransferAmountMismatch();
    error Unauthorized();
    error ZeroAmount();

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Ensures the ETF is initialized before function execution
    modifier onlyInitialized() {
        if (!initialized) revert NotInitialized();
        _;
    }

    /// @notice Ensures only rebalancer or owner can execute function
    modifier onlyRebalancer() {
        if (msg.sender != rebalancer && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /// @notice Initializes the ETF contract
    /// @param _name Name of the ETF token
    /// @param _symbol Symbol of the ETF token
    /// @param _priceOracle Address of the price oracle contract
    constructor(string memory _name, string memory _symbol, address _priceOracle)
        ERC20(_name, _symbol)
        Ownable(msg.sender)
    {
        if (_priceOracle == address(0)) revert InvalidOracle();

        // Verify the oracle contract implements the interface correctly
        // This call should revert for address(0), confirming the interface works
        try IPriceOracle(_priceOracle).getPrice(address(0)) {
            revert InvalidOracle(); // If it doesn't revert, something's wrong
        } catch {
            // Expected behavior - oracle should reject address(0)
        }

        priceOracle = IPriceOracle(_priceOracle);
        feeCollector = msg.sender;
        rebalanceThreshold = 500; // Default 5% deviation threshold
        minRebalanceCooldown = 30 minutes; // Default minimum 30 minutes between rebalances

        // Initialize rebalance verification thresholds with defaults
        maxSellSlippageBps = DEFAULT_MAX_SELL_SLIPPAGE_BPS;
        maxBuySlippageBps = DEFAULT_MAX_BUY_SLIPPAGE_BPS;
        maxTotalValueLossBps = DEFAULT_MAX_TOTAL_VALUE_LOSS_BPS;
        weightImprovementToleranceBps = DEFAULT_WEIGHT_IMPROVEMENT_TOLERANCE_BPS;
        unchangedAssetToleranceBps = DEFAULT_UNCHANGED_ASSET_TOLERANCE_BPS;
    }

    /*//////////////////////////////////////////////////////////////
                           INITIALIZATION
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize ETF with target total value, making 1 share ≈ 1 USD
     * @param _assets Array of asset addresses
     * @param _weights Array of weights in basis points (total must equal 10000)
     * @param _targetTotalValueUSD Target total value in USD (18 decimals)
     * @dev Initial supply will equal target value, so 1 share ≈ 1 USD
     */
    function initialize(address[] calldata _assets, uint32[] calldata _weights, uint256 _targetTotalValueUSD)
        external
        onlyOwner
        nonReentrant
    {
        if (initialized) revert AlreadyInitialized();
        if (_assets.length == 0) revert NoAssets();
        if (_assets.length != _weights.length) revert InvalidLength();
        if (_targetTotalValueUSD <= MINIMUM_LIQUIDITY) {
            revert InsufficientInitialSupply();
        }

        uint32 totalWeight;
        uint256[] memory actualAmounts = new uint256[](_assets.length);
        uint256 actualValueUSD = 0;

        // Single loop: validation, calculation, transfer, and state update
        for (uint256 i = 0; i < _assets.length; i++) {
            address asset = _assets[i];
            uint32 weight = _weights[i];

            if (asset == address(0)) revert InvalidAsset();
            if (weight == 0) revert InvalidWeight();

            // O(1) duplicate check using mapping
            if (isAsset[asset]) revert DuplicateAsset();

            totalWeight += weight;

            // Get price and decimals (validates ERC20)
            uint256 price = priceOracle.getPrice(asset);
            if (price == 0) revert InvalidPrice();

            uint8 decimals = IERC20Metadata(asset).decimals();

            // Calculate and perform transfer
            {
                uint256 targetValueUSD = (_targetTotalValueUSD * weight) / WEIGHT_PRECISION;
                uint256 requiredAmount = (targetValueUSD * (10 ** decimals)) / price;

                if (requiredAmount == 0) revert InvalidAmount();

                uint256 balanceBefore = IERC20(asset).balanceOf(address(this));
                IERC20(asset).safeTransferFrom(msg.sender, address(this), requiredAmount);
                uint256 actualReceived = IERC20(asset).balanceOf(address(this)) - balanceBefore;

                // Allow up to 5% loss due to transfer taxes/fees
                if (actualReceived < (requiredAmount * 95) / 100) {
                    revert TransferAmountMismatch();
                }

                actualAmounts[i] = actualReceived;
                actualValueUSD += (actualReceived * price) / (10 ** decimals);
            }

            // Update state
            assets.push(asset);
            assetInfo[asset] = AssetInfo({token: asset, weight: weight, reserve: uint224(actualAmounts[i])});
            isAsset[asset] = true;
        }

        // Check total weight after all assets processed
        if (totalWeight != WEIGHT_PRECISION) revert InvalidTotalWeight();

        _mint(address(1), MINIMUM_LIQUIDITY);
        _mint(msg.sender, _targetTotalValueUSD - MINIMUM_LIQUIDITY);

        feeInfo.lastCollectTime = block.timestamp;
        initialized = true;

        emit Initialized(_assets, _weights, actualAmounts, _targetTotalValueUSD, actualValueUSD);
    }

    function mint(address to) external onlyInitialized whenNotPaused nonReentrant returns (uint256 shares) {
        if (to == address(0)) revert InvalidRecipient();

        _collectManagementFee();

        uint256[] memory amounts = new uint256[](assets.length);
        uint256 minRatio = type(uint256).max;

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 balance = IERC20(asset).balanceOf(address(this));
            uint256 reserve = assetInfo[asset].reserve;

            if (balance <= reserve) revert NoNewAssets();
            amounts[i] = balance - reserve;

            if (reserve > 0) {
                uint256 ratio = (amounts[i] * 1e18) / reserve;
                if (ratio < minRatio) {
                    minRatio = ratio;
                }
            }
        }

        if (minRatio == type(uint256).max || minRatio == 0) {
            revert InvalidRatio();
        }

        uint256 totalSupplyBefore = totalSupply();
        shares = (totalSupplyBefore * minRatio) / 1e18;

        if (shares == 0) revert InvalidAmount();

        _mint(to, shares);

        uint256[] memory actualAmounts = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 actualAmount = (assetInfo[asset].reserve * minRatio) / 1e18;
            actualAmounts[i] = actualAmount;

            // Update reserves with actual amount used
            assetInfo[asset].reserve += uint224(actualAmount);

            // Return excess tokens to user
            uint256 excess = amounts[i] - actualAmount;
            if (excess > 0) {
                IERC20(asset).safeTransfer(msg.sender, excess);
            }
        }

        emit Mint(to, shares, actualAmounts);
    }

    function mintExactShares(uint256 shares, address to)
        external
        onlyInitialized
        whenNotPaused
        nonReentrant
        returns (uint256[] memory amounts)
    {
        if (shares == 0) revert InvalidShares();
        if (to == address(0)) revert InvalidRecipient();

        _collectManagementFee();

        uint256 totalShares = shares;

        amounts = new uint256[](assets.length);
        uint256 totalSupplyBefore = totalSupply();

        for (uint256 i = 0; i < assets.length; i++) {
            amounts[i] = (assetInfo[assets[i]].reserve * totalShares) / totalSupplyBefore;
            if (amounts[i] == 0) revert ZeroAmount();
        }

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amounts[i]);
            assetInfo[asset].reserve += uint224(amounts[i]);
        }

        _mint(to, shares);

        emit Mint(to, shares, amounts);
    }

    function burn(uint256 shares, address to)
        external
        onlyInitialized
        whenNotPaused
        nonReentrant
        returns (uint256[] memory amounts)
    {
        if (shares == 0) revert InvalidShares();
        if (to == address(0)) revert InvalidRecipient();
        if (balanceOf(msg.sender) < shares) revert InsufficientBalance();

        _collectManagementFee();

        uint256 withdrawFee = _ceilDiv(shares * feeInfo.withdrawFee, WEIGHT_PRECISION);
        uint256 sharesAfterFee = shares - withdrawFee;

        if (withdrawFee > 0) {
            _transfer(msg.sender, feeCollector, withdrawFee);
        }

        amounts = new uint256[](assets.length);
        uint256 totalSupplyBefore = totalSupply();

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            amounts[i] = (assetInfo[asset].reserve * sharesAfterFee) / totalSupplyBefore;

            if (amounts[i] == 0) revert ZeroAmount();
            assetInfo[asset].reserve -= uint224(amounts[i]);

            IERC20(asset).safeTransfer(to, amounts[i]);
        }

        _burn(msg.sender, sharesAfterFee);

        emit Burn(msg.sender, sharesAfterFee, amounts);
    }

    /*//////////////////////////////////////////////////////////////
                         FLASH REBALANCE
    //////////////////////////////////////////////////////////////*/

    function flashRebalance(address receiver, bytes memory data) public onlyRebalancer onlyInitialized nonReentrant {
        if (address(priceOracle) == address(0)) revert OracleNotSet();
        if (rebalancer == address(0)) revert RebalanceNotImplemented();
        if (block.timestamp < lastRebalanceTime + minRebalanceCooldown) {
            revert CooldownNotMet();
        }

        (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance) = getRebalanceInfo();
        if (!needsRebalance) revert RebalanceNotNeeded();

        // Phase 1: Calculate and transfer assets for rebalancing
        (int256[] memory rebalanceAmounts, uint256[] memory balancesBefore, uint256 totalValueBefore) =
            _prepareRebalance(currentWeights, targetWeights, receiver);

        uint256 deviationBefore = _calculateWeightDeviation(currentWeights, targetWeights);

        // Phase 2: Call rebalancer callback
        IRebalanceCallback(receiver).rebalanceCallback(assets, rebalanceAmounts, data);

        // Phase 3: Verify and finalize
        _verifyAndFinalizeRebalance(
            receiver, rebalanceAmounts, balancesBefore, totalValueBefore, deviationBefore, currentWeights, targetWeights
        );
    }

    function setFees(uint32 _withdrawFee, uint256 _annualManagementFeeBps) external onlyOwner {
        if (_withdrawFee > 1000) revert FeeTooHigh(); // Max 10%
        if (_annualManagementFeeBps > 500) revert FeeTooHigh(); // Max 5%

        feeInfo.withdrawFee = _withdrawFee;

        uint256 feeRatePerSecond = (_annualManagementFeeBps * FEE_PRECISION) / (WEIGHT_PRECISION * SECONDS_PER_YEAR);
        feeInfo.managementFeeRate = uint128(feeRatePerSecond);

        emit FeeUpdated(_withdrawFee, _annualManagementFeeBps);
    }

    function collectManagementFee() external returns (uint256) {
        return _collectManagementFee();
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == address(0)) revert InvalidFeeCollector();
        feeCollector = _feeCollector;
        emit FeeCollectorUpdated(_feeCollector);
    }

    function setPriceOracle(address _oracle) external onlyOwner {
        if (_oracle == address(0)) revert InvalidOracle();
        priceOracle = IPriceOracle(_oracle);
        emit PriceOracleUpdated(_oracle);
    }

    function setRebalancer(address _rebalancer) external onlyOwner {
        rebalancer = _rebalancer;
        emit RebalancerUpdated(_rebalancer);
    }

    function setRebalanceThreshold(uint256 _threshold) external onlyOwner {
        if (_threshold > 2000) revert ThresholdTooHigh(); // Max 20%
        rebalanceThreshold = _threshold;
        emit RebalanceThresholdUpdated(_threshold);
    }

    function setMinRebalanceCooldown(uint256 _cooldown) external onlyOwner {
        if (_cooldown > 7 days) revert CooldownTooLong(); // Max 7 days
        minRebalanceCooldown = _cooldown;
        emit MinRebalanceCooldownUpdated(_cooldown);
    }

    /**
     * @notice Set rebalance verification thresholds
     * @dev Only owner can call. All thresholds have maximum allowed values for safety
     * @param _maxSellSlippageBps Maximum slippage for sell operations (basis points, max 10%)
     * @param _maxBuySlippageBps Maximum slippage for buy operations (basis points, max 10%)
     * @param _maxTotalValueLossBps Maximum total value loss (basis points, max 10%)
     * @param _weightImprovementToleranceBps Weight improvement tolerance (basis points, max 5%)
     * @param _unchangedAssetToleranceBps Unchanged asset tolerance (basis points, max 1%)
     */
    function setRebalanceVerificationThresholds(
        uint256 _maxSellSlippageBps,
        uint256 _maxBuySlippageBps,
        uint256 _maxTotalValueLossBps,
        uint256 _weightImprovementToleranceBps,
        uint256 _unchangedAssetToleranceBps
    ) external onlyOwner {
        if (_maxSellSlippageBps > MAX_ALLOWED_SLIPPAGE_BPS) {
            revert ThresholdTooLarge();
        }
        if (_maxBuySlippageBps > MAX_ALLOWED_SLIPPAGE_BPS) {
            revert ThresholdTooLarge();
        }
        if (_maxTotalValueLossBps > MAX_ALLOWED_TOTAL_VALUE_LOSS_BPS) {
            revert ThresholdTooLarge();
        }
        if (_weightImprovementToleranceBps > MAX_ALLOWED_WEIGHT_TOLERANCE_BPS) {
            revert ThresholdTooLarge();
        }
        if (_unchangedAssetToleranceBps > MAX_ALLOWED_UNCHANGED_TOLERANCE_BPS) {
            revert ThresholdTooLarge();
        }

        maxSellSlippageBps = _maxSellSlippageBps;
        maxBuySlippageBps = _maxBuySlippageBps;
        maxTotalValueLossBps = _maxTotalValueLossBps;
        weightImprovementToleranceBps = _weightImprovementToleranceBps;
        unchangedAssetToleranceBps = _unchangedAssetToleranceBps;

        emit RebalanceVerificationThresholdsUpdated(
            _maxSellSlippageBps,
            _maxBuySlippageBps,
            _maxTotalValueLossBps,
            _weightImprovementToleranceBps,
            _unchangedAssetToleranceBps
        );
    }

    /**
     * @notice Adjust asset weights without changing the asset list
     * @dev Only adjusts target weights, requires executeRebalance() to take effect
     * @param newWeights Array of new weights in basis points (must sum to 10000)
     */
    function adjustWeights(uint32[] calldata newWeights) external onlyOwner onlyInitialized {
        if (newWeights.length != assets.length) revert InvalidLength();

        uint32 totalWeight;
        for (uint256 i = 0; i < newWeights.length; i++) {
            if (newWeights[i] == 0) revert InvalidWeight();
            totalWeight += newWeights[i];

            // Update weight
            assetInfo[assets[i]].weight = newWeights[i];
        }

        if (totalWeight != WEIGHT_PRECISION) revert InvalidTotalWeight();

        emit WeightsAdjusted(assets, newWeights);
    }

    /**
     * @notice Manually trigger rebalance to execute weight adjustments
     * @dev Can be called by owner or rebalancer after adjusting weights
     */
    function executeRebalance() external onlyInitialized onlyRebalancer whenNotPaused {
        (,, bool needsRebalance) = getRebalanceInfo();
        if (!needsRebalance) revert RebalanceNotNeeded();

        bytes memory data = abi.encode(msg.sender, getTotalValue());
        flashRebalance(rebalancer, data);
    }

    function pause() external onlyOwner {
        _pause();
        emit Paused();
    }

    function unpause() external onlyOwner {
        _unpause();
        emit Unpaused();
    }

    function getAssets() external view returns (AssetInfo[] memory) {
        AssetInfo[] memory result = new AssetInfo[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            result[i] = assetInfo[assets[i]];
        }
        return result;
    }

    function getFeeInfo() external view returns (FeeInfo memory) {
        return feeInfo;
    }

    function getTotalValue() public view returns (uint256) {
        if (address(priceOracle) == address(0)) revert OracleNotSet();

        uint256 totalValue = 0;

        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 reserve = assetInfo[asset].reserve;

            if (reserve > 0) {
                uint256 price = priceOracle.getPrice(asset);
                if (price == 0) revert InvalidPrice();

                uint8 decimals = IERC20Metadata(asset).decimals();

                // Calculate USD value: reserve * price / 10^decimals
                // Price is expected to be in USD with 18 decimals (1e18 = $1)
                uint256 assetValue = (reserve * price) / (10 ** decimals);
                totalValue += assetValue;
            }
        }

        return totalValue;
    }

    function getShareValue() external view returns (uint256) {
        uint256 supply = totalSupply();
        return (getTotalValue() * 1e18) / supply;
    }

    function calculateMintShares(uint256[] calldata amounts) external view returns (uint256) {
        if (amounts.length != assets.length) revert InvalidLength();

        uint256 minRatio = type(uint256).max;
        for (uint256 i = 0; i < assets.length; i++) {
            if (assetInfo[assets[i]].reserve > 0) {
                uint256 ratio = (amounts[i] * 1e18) / assetInfo[assets[i]].reserve;
                if (ratio < minRatio) {
                    minRatio = ratio;
                }
            }
        }

        if (minRatio == type(uint256).max) return 0;

        // Calculate adjusted total supply considering pending management fee
        (uint256 pendingFeeShares,) = _calculatePendingManagementFee();
        uint256 adjustedTotalSupply = totalSupply() + pendingFeeShares;

        uint256 shares = (adjustedTotalSupply * minRatio) / 1e18;

        return shares;
    }

    function calculateBurnAmounts(uint256 shares) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](assets.length);

        if (shares == 0) {
            return amounts;
        }

        uint256 withdrawFee = _ceilDiv(shares * feeInfo.withdrawFee, WEIGHT_PRECISION);
        uint256 sharesAfterFee = shares - withdrawFee;

        // Calculate adjusted total supply considering pending management fee
        (uint256 pendingFeeShares,) = _calculatePendingManagementFee();
        uint256 adjustedTotalSupply = totalSupply() + pendingFeeShares;

        for (uint256 i = 0; i < assets.length; i++) {
            amounts[i] = (assetInfo[assets[i]].reserve * sharesAfterFee) / adjustedTotalSupply;
        }
    }

    function calculateRequiredAmounts(uint256 shares) external view returns (uint256[] memory amounts) {
        amounts = new uint256[](assets.length);

        if (shares == 0) return amounts;

        // Calculate adjusted total supply considering pending management fee
        (uint256 pendingFeeShares,) = _calculatePendingManagementFee();
        uint256 adjustedTotalSupply = totalSupply() + pendingFeeShares;

        for (uint256 i = 0; i < assets.length; i++) {
            amounts[i] = (assetInfo[assets[i]].reserve * shares) / adjustedTotalSupply;
        }
    }

    function getRebalanceInfo()
        public
        view
        returns (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance)
    {
        currentWeights = new uint256[](assets.length);
        targetWeights = new uint256[](assets.length);

        // Check cooldown first
        if (block.timestamp < lastRebalanceTime + minRebalanceCooldown) {
            return (currentWeights, targetWeights, false);
        }

        if (address(priceOracle) == address(0)) {
            return (currentWeights, targetWeights, false);
        }

        uint256 totalValue = getTotalValue();
        if (totalValue == 0) {
            return (currentWeights, targetWeights, false);
        }

        // Calculate current weights and target weights
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            AssetInfo memory info = assetInfo[asset];

            // Target weight (from configuration)
            targetWeights[i] = uint256(info.weight);

            // Current weight (based on current value)
            if (info.reserve > 0) {
                uint256 price = priceOracle.getPrice(asset);
                if (price > 0) {
                    uint8 decimals = IERC20Metadata(asset).decimals();
                    uint256 assetValue = (info.reserve * price) / (10 ** decimals);
                    currentWeights[i] = (assetValue * WEIGHT_PRECISION) / totalValue;
                }
            }

            // Check if rebalancing is needed (deviation >= threshold)
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];

            if (deviation >= rebalanceThreshold) {
                needsRebalance = true;
            }
        }
    }

    function getAnnualManagementFee() external view returns (uint256) {
        return (feeInfo.managementFeeRate * SECONDS_PER_YEAR * WEIGHT_PRECISION) / FEE_PRECISION;
    }

    function isPaused() external view returns (bool) {
        return paused();
    }

    /*//////////////////////////////////////////////////////////////
                           INTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /// @notice Calculate pending management fee information
    /// @return feeShares Amount of fee shares that would be minted
    /// @return feeValue USD value of the management fee
    function _calculatePendingManagementFee() internal view returns (uint256 feeShares, uint256 feeValue) {
        if (feeInfo.managementFeeRate == 0 || block.timestamp <= feeInfo.lastCollectTime) {
            return (0, 0);
        }

        uint256 elapsed = block.timestamp - feeInfo.lastCollectTime;
        uint256 totalValue = getTotalValue();

        if (totalValue > 0 && totalSupply() > 0) {
            feeValue = _ceilDiv(totalValue * feeInfo.managementFeeRate * elapsed, FEE_PRECISION);

            if (feeValue > 0) {
                feeShares = (feeValue * totalSupply()) / (totalValue - feeValue);
            }
        }
    }

    /// @notice Collects management fees based on elapsed time
    /// @return feeShares Amount of fee shares minted
    function _collectManagementFee() internal returns (uint256 feeShares) {
        uint256 feeValue;
        (feeShares, feeValue) = _calculatePendingManagementFee();

        if (feeShares > 0) {
            _mint(feeCollector, feeShares);
            feeInfo.accumulatedFee += feeValue;

            emit ManagementFeeCollected(feeCollector, feeShares, feeValue);
        }

        feeInfo.lastCollectTime = block.timestamp;
    }

    /// @notice Performs ceiling division
    /// @param a Dividend
    /// @param b Divisor
    /// @return Result of ceiling division
    function _ceilDiv(uint256 a, uint256 b) private pure returns (uint256) {
        return a == 0 ? 0 : (a - 1) / b + 1;
    }

    /// @notice Internal: Prepare rebalance by calculating amounts and transferring assets
    function _prepareRebalance(uint256[] memory currentWeights, uint256[] memory targetWeights, address receiver)
        private
        returns (int256[] memory rebalanceAmounts, uint256[] memory balancesBefore, uint256 totalValueBefore)
    {
        rebalanceAmounts = new int256[](assets.length);
        balancesBefore = new uint256[](assets.length);
        totalValueBefore = getTotalValue();

        for (uint256 i = 0; i < assets.length; i++) {
            balancesBefore[i] = IERC20(assets[i]).balanceOf(address(this));

            uint256 price = priceOracle.getPrice(assets[i]);
            if (price == 0) revert InvalidPrice();
            uint8 decimals = IERC20Metadata(assets[i]).decimals();

            if (currentWeights[i] > targetWeights[i]) {
                // Sell: over-weighted
                uint256 excess = currentWeights[i] - targetWeights[i];
                uint256 sellAmount = (((totalValueBefore * excess) / WEIGHT_PRECISION) * (10 ** decimals)) / price;
                uint256 maxSell = balancesBefore[i] / 2;
                if (sellAmount > maxSell) sellAmount = maxSell;

                rebalanceAmounts[i] = int256(sellAmount);
                IERC20(assets[i]).safeTransfer(receiver, sellAmount);
            } else if (currentWeights[i] < targetWeights[i]) {
                // Buy: under-weighted
                uint256 deficit = targetWeights[i] - currentWeights[i];
                uint256 buyAmount = (((totalValueBefore * deficit) / WEIGHT_PRECISION) * (10 ** decimals)) / price;
                rebalanceAmounts[i] = -int256(buyAmount);
            }
        }
    }

    /// @notice Internal: Verify rebalance results and update state
    function _verifyAndFinalizeRebalance(
        address receiver,
        int256[] memory rebalanceAmounts,
        uint256[] memory balancesBefore,
        uint256 totalValueBefore,
        uint256 deviationBefore,
        uint256[] memory currentWeights,
        uint256[] memory targetWeights
    ) private {
        uint256[] memory balancesAfter = new uint256[](assets.length);
        uint256 totalValueAfter = 0;

        // Calculate balances and total value after
        for (uint256 i = 0; i < assets.length; i++) {
            balancesAfter[i] = IERC20(assets[i]).balanceOf(address(this));
            uint256 price = priceOracle.getPrice(assets[i]);
            if (price == 0) revert InvalidPrice();
            uint8 decimals = IERC20Metadata(assets[i]).decimals();
            totalValueAfter += (balancesAfter[i] * price) / (10 ** decimals);
        }

        // Security check - verify no orphaned tokens FIRST (Flash Loan pattern)
        _verifyNoOrphanedTokens(receiver);

        // Category-based verification (simplified for stack depth)
        _verifyRebalanceOperations(rebalanceAmounts, balancesBefore, balancesAfter);

        // Global checks
        if (totalValueAfter < (totalValueBefore * (10000 - maxTotalValueLossBps)) / 10000) {
            revert ExcessiveLoss();
        }

        // Weight improvement check
        uint256[] memory newWeights = _calculateNewWeights(balancesAfter, totalValueAfter);
        uint256 deviationAfter = _calculateWeightDeviation(newWeights, targetWeights);
        if (deviationAfter > (deviationBefore * (10000 + weightImprovementToleranceBps)) / 10000) {
            revert InvalidRebalance();
        }

        // Update state
        for (uint256 i = 0; i < assets.length; i++) {
            assetInfo[assets[i]].reserve = uint224(balancesAfter[i]);
        }
        lastRebalanceTime = block.timestamp;

        emit Rebalanced(currentWeights, newWeights);
    }

    /// @notice Internal: Verify each rebalance operation
    function _verifyRebalanceOperations(
        int256[] memory rebalanceAmounts,
        uint256[] memory balancesBefore,
        uint256[] memory balancesAfter
    ) private view {
        for (uint256 i = 0; i < assets.length; i++) {
            if (rebalanceAmounts[i] > 0) {
                // Sell: balance should decrease
                if (balancesAfter[i] > balancesBefore[i]) {
                    revert UnexpectedBalanceChange();
                }
                uint256 actualSold = balancesBefore[i] - balancesAfter[i];
                uint256 targetAmount = uint256(rebalanceAmounts[i]);

                if (actualSold < (targetAmount * (10000 - maxSellSlippageBps)) / 10000) {
                    revert ExcessiveSlippage();
                }
                if (actualSold > (targetAmount * (10000 + maxSellSlippageBps)) / 10000) {
                    revert ExcessiveSlippage();
                }
            } else if (rebalanceAmounts[i] < 0) {
                // Buy: balance should increase
                if (balancesAfter[i] < balancesBefore[i]) {
                    revert UnexpectedBalanceChange();
                }
                uint256 actualBought = balancesAfter[i] - balancesBefore[i];
                uint256 targetAmount = uint256(-rebalanceAmounts[i]);

                if (actualBought < (targetAmount * (10000 - maxBuySlippageBps)) / 10000) {
                    revert InsufficientBuyAmount();
                }
                if (actualBought > (targetAmount * (10000 + maxBuySlippageBps)) / 10000) {
                    revert ExcessiveBuyAmount();
                }
            } else {
                // No change: balance should remain stable
                _verifyNoChangeOperation(balancesBefore[i], balancesAfter[i]);
            }
        }
    }

    /// @notice Internal: Calculate new weights after rebalance
    function _calculateNewWeights(uint256[] memory balancesAfter, uint256 totalValueAfter)
        private
        view
        returns (uint256[] memory newWeights)
    {
        newWeights = new uint256[](assets.length);
        if (totalValueAfter > 0) {
            for (uint256 i = 0; i < assets.length; i++) {
                uint256 price = priceOracle.getPrice(assets[i]);
                uint8 decimals = IERC20Metadata(assets[i]).decimals();
                uint256 assetValue = (balancesAfter[i] * price) / (10 ** decimals);
                newWeights[i] = (assetValue * WEIGHT_PRECISION) / totalValueAfter;
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                    REBALANCE VERIFICATION HELPERS
    //////////////////////////////////////////////////////////////*/

    /// @notice Verify no-change operation (zero amount)
    /// @dev Checks that balance remained stable
    function _verifyNoChangeOperation(uint256 balanceBefore, uint256 balanceAfter) private view {
        // Balance should remain nearly unchanged (allow configurable tolerance)
        uint256 minBalance = (balanceBefore * (10000 - unchangedAssetToleranceBps)) / 10000;
        uint256 maxBalance = (balanceBefore * (10000 + unchangedAssetToleranceBps)) / 10000;

        if (balanceAfter < minBalance || balanceAfter > maxBalance) {
            revert UnexpectedBalanceChange();
        }
    }

    /// @notice Calculate weight deviation sum for all assets
    /// @dev Used to verify rebalance improves weight distribution
    function _calculateWeightDeviation(uint256[] memory currentWeights, uint256[] memory targetWeights)
        private
        pure
        returns (uint256 totalDeviation)
    {
        for (uint256 i = 0; i < currentWeights.length; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];
            totalDeviation += deviation;
        }
    }

    /// @notice Verify no tokens remain in rebalancer contract
    function _verifyNoOrphanedTokens(address rebalancerAddress) private view {
        for (uint256 i = 0; i < assets.length; i++) {
            if (IERC20(assets[i]).balanceOf(rebalancerAddress) > 0) {
                revert OrphanedTokens();
            }
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IRebalanceCallback.sol";
import "./interfaces/IBlockETFCore.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IPancakeV2Router.sol";

/**
 * @title ETFRebalancerV1
 * @author BlockETF Team
 * @notice V1 rebalancer implementation using USDT as intermediate token
 * @dev Implements flash rebalance callback from BlockETFCore
 */
contract ETFRebalancerV1 is IRebalanceCallback, Ownable, Pausable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /*//////////////////////////////////////////////////////////////
                               CONSTANTS
    //////////////////////////////////////////////////////////////*/

    uint256 private constant SLIPPAGE_BASE = 10000;
    uint256 private constant MAX_SLIPPAGE = 500; // 5% max slippage

    // PancakeSwap V3 fee tiers
    uint24 private constant FEE_LOW = 500; // 0.05%
    uint24 private constant FEE_MEDIUM = 2500; // 0.25%
    uint24 private constant FEE_HIGH = 10000; // 1%

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Core ETF contract
    IBlockETFCore public immutable etfCore;

    /// @notice V3 swap router
    ISwapRouter public immutable v3Router;

    /// @notice V2 swap router
    IPancakeV2Router public immutable v2Router;

    /// @notice USDT token address
    address public immutable USDT;

    /// @notice WBNB token address
    address public immutable WBNB;

    /// @notice Maximum allowed slippage (basis points)
    uint256 public maxSlippage = 300; // 3% default slippage

    /// @notice Cooldown period between rebalances
    uint256 public cooldownPeriod = 1 hours;

    /// @notice Pool addresses for direct USDT swaps (asset => pool)
    mapping(address => address) public assetPools;

    /// @notice Pool fee tiers (pool => fee tier)
    mapping(address => uint24) public poolFees;

    /// @notice Assets that should use V2 router instead of V3
    mapping(address => bool) public useV2Router;

    /// @notice Last rebalance timestamp
    uint256 public lastRebalanceTime;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    event RebalanceExecuted(
        address indexed executor, uint256 totalValueBefore, uint256 totalValueAfter, uint256 timestamp
    );

    event AssetSwapped(address indexed fromAsset, address indexed toAsset, uint256 fromAmount, uint256 toAmount);

    event PoolConfigured(address indexed asset, address indexed pool, uint24 fee);

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error NotETFCore();
    error RebalanceNotNeeded();
    error CooldownNotMet();
    error SlippageExceeded();
    error InsufficientOutput();
    error InvalidConfiguration();

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(address _etfCore, address _v3Router, address _v2Router, address _usdt, address _wbnb)
        Ownable(msg.sender)
    {
        etfCore = IBlockETFCore(_etfCore);
        v3Router = ISwapRouter(_v3Router);
        v2Router = IPancakeV2Router(_v2Router);
        USDT = _usdt;
        WBNB = _wbnb;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Check if rebalance is needed and allowed
     * @return needed Whether rebalance is needed
     * @return reason Human-readable reason string
     */
    function canRebalance() external view returns (bool needed, string memory reason) {
        // Check if paused
        if (paused()) {
            return (false, "Contract is paused");
        }

        // Check cooldown
        if (block.timestamp < lastRebalanceTime + cooldownPeriod) {
            return (false, "Cooldown period not met");
        }

        // Check ETF core rebalance status
        (,, bool needsRebalance) = etfCore.getRebalanceInfo();

        if (!needsRebalance) {
            return (false, "Rebalance not needed");
        }

        return (true, "Ready to rebalance");
    }

    /**
     * @notice Execute rebalance through flash loan mechanism
     */
    function executeRebalance() external whenNotPaused nonReentrant {
        // Check cooldown
        if (block.timestamp < lastRebalanceTime + cooldownPeriod) {
            revert CooldownNotMet();
        }

        // Check if rebalance is needed
        (,, bool needsRebalance) = etfCore.getRebalanceInfo();
        if (!needsRebalance) {
            revert RebalanceNotNeeded();
        }

        // Record state before rebalance
        uint256 totalValueBefore = etfCore.getTotalValue();

        // Execute flash rebalance
        bytes memory data = abi.encode(msg.sender, totalValueBefore);
        etfCore.flashRebalance(address(this), data);

        // Update last rebalance time
        lastRebalanceTime = block.timestamp;

        // Verify value after rebalance
        uint256 totalValueAfter = etfCore.getTotalValue();
        _validateSlippage(totalValueBefore, totalValueAfter);

        emit RebalanceExecuted(msg.sender, totalValueBefore, totalValueAfter, block.timestamp);
    }

    /**
     * @notice Callback from ETF Core during flash rebalance
     * @param assets Array of asset addresses
     * @param amounts Signed amounts (positive = sell, negative = buy)
     * @dev Improved algorithm: allocates USDT budget based on weight deficit proportions
     *      The asset with largest weight deficit gets any remaining dust from rounding
     */
    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata /* data */ )
        external
        virtual
        override
    {
        // Only ETF Core can call this
        if (msg.sender != address(etfCore)) {
            revert NotETFCore();
        }

        // Phase 1: Sell over-weighted assets and collect USDT
        uint256 totalUSDTCollected = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                // Positive amount = sell this asset
                uint256 usdtReceived = _sellAssetForUSDT(assets[i], uint256(amounts[i]));
                totalUSDTCollected += usdtReceived;
            }
        }

        // Phase 2: Calculate buy value for each under-weighted asset
        // Core's amounts already reflect weight deficits, we just need to convert to USD value
        uint256 totalBuyValue = 0;
        uint256[] memory buyValues = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0 && assets[i] != USDT) {
                // Negative amount = buy this asset
                uint256 targetAmount = uint256(-amounts[i]);

                // Calculate USD value: targetAmount * price / 10^decimals
                uint256 price = _getAssetPrice(assets[i]);
                uint8 decimals = IERC20Metadata(assets[i]).decimals();
                buyValues[i] = (targetAmount * price) / (10 ** decimals);

                totalBuyValue += buyValues[i];
            }
        }

        // Phase 3: Allocate USDT budget proportionally, with largest deficit getting remainder
        if (totalBuyValue > 0) {
            // Find index with largest weight deficit (largest buy value)
            uint256 maxDeficitIndex = 0;
            uint256 maxDeficit = 0;
            for (uint256 i = 0; i < assets.length; i++) {
                if (buyValues[i] > maxDeficit) {
                    maxDeficit = buyValues[i];
                    maxDeficitIndex = i;
                }
            }

            // Allocate USDT proportionally to all except the largest
            uint256 usdtSpent = 0;
            for (uint256 i = 0; i < assets.length; i++) {
                if (buyValues[i] > 0 && i != maxDeficitIndex) {
                    uint256 allocatedUSDT = (totalUSDTCollected * buyValues[i]) / totalBuyValue;
                    _buyAssetWithExactUSDT(assets[i], allocatedUSDT);
                    usdtSpent += allocatedUSDT;
                }
            }

            // Largest deficit gets all remaining USDT (absorbs rounding dust)
            if (maxDeficit > 0) {
                uint256 remainingUSDT = totalUSDTCollected - usdtSpent;
                _buyAssetWithExactUSDT(assets[maxDeficitIndex], remainingUSDT);
            }
        }

        // Phase 4: Return all assets to ETF Core
        _returnAllAssets(assets);
    }

    /*//////////////////////////////////////////////////////////////
                            ADMIN FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Configure pool for an asset
     * @param asset Asset token address
     * @param pool Pool address
     * @param fee Pool fee tier
     */
    function configureAssetPool(address asset, address pool, uint24 fee) external onlyOwner {
        assetPools[asset] = pool;
        poolFees[pool] = fee;
        emit PoolConfigured(asset, pool, fee);
    }

    /**
     * @notice Batch configure pools
     * @param assets Array of asset addresses
     * @param pools Array of pool addresses
     * @param fees Array of fee tiers
     */
    function configureAssetPools(address[] calldata assets, address[] calldata pools, uint24[] calldata fees)
        external
        onlyOwner
    {
        if (assets.length != pools.length || pools.length != fees.length) {
            revert InvalidConfiguration();
        }

        for (uint256 i = 0; i < assets.length; i++) {
            assetPools[assets[i]] = pools[i];
            poolFees[pools[i]] = fees[i];
            emit PoolConfigured(assets[i], pools[i], fees[i]);
        }
    }

    /**
     * @notice Set maximum allowed slippage
     * @param _maxSlippage Maximum slippage in basis points
     */
    function setMaxSlippage(uint256 _maxSlippage) external onlyOwner {
        if (_maxSlippage > MAX_SLIPPAGE) revert SlippageExceeded();
        maxSlippage = _maxSlippage;
    }

    /**
     * @notice Set cooldown period between rebalances
     * @param _cooldownPeriod Cooldown period in seconds
     */
    function setCooldownPeriod(uint256 _cooldownPeriod) external onlyOwner {
        cooldownPeriod = _cooldownPeriod;
    }

    /**
     * @notice Set whether an asset should use V2 router
     * @param asset Asset address
     * @param useV2 Whether to use V2 router
     */
    function setAssetUseV2Router(address asset, bool useV2) external onlyOwner {
        useV2Router[asset] = useV2;
    }

    /**
     * @notice Pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Emergency function to recover tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Sell a single asset for USDT
     * @param asset Asset address to sell
     * @param amount Amount of asset to sell
     * @return usdtReceived Amount of USDT received
     */
    function _sellAssetForUSDT(address asset, uint256 amount) private returns (uint256 usdtReceived) {
        if (asset == USDT) {
            // Already USDT, no swap needed
            return amount;
        }

        // Swap asset to USDT
        usdtReceived = _swapAssetToUSDT(asset, amount);

        emit AssetSwapped(asset, USDT, amount, usdtReceived);
    }

    /**
     * @notice Buy asset with exact USDT amount
     * @param asset Asset address to buy
     * @param usdtAmount Exact amount of USDT to spend
     */
    function _buyAssetWithExactUSDT(address asset, uint256 usdtAmount) private {
        if (usdtAmount == 0) return;

        // Swap USDT to asset using exactInput (spend all allocated USDT)
        uint256 assetReceived = _swapUSDTToAssetExactInput(asset, usdtAmount);

        emit AssetSwapped(USDT, asset, usdtAmount, assetReceived);
    }

    /**
     * @notice Get asset price from ETF Core's price oracle
     * @param asset Asset address
     * @return price Asset price in USD (18 decimals)
     */
    function _getAssetPrice(address asset) private view returns (uint256 price) {
        // Access price oracle through ETF Core
        (bool success, bytes memory data) = address(etfCore).staticcall(abi.encodeWithSignature("priceOracle()"));

        if (success && data.length >= 32) {
            address oracle = abi.decode(data, (address));
            (bool priceSuccess, bytes memory priceData) =
                oracle.staticcall(abi.encodeWithSignature("getPrice(address)", asset));

            if (priceSuccess && priceData.length >= 32) {
                price = abi.decode(priceData, (uint256));
                if (price > 0) return price;
            }
        }

        revert("Price oracle access failed");
    }

    /**
     * @notice Swap asset to USDT using configured pools
     */
    function _swapAssetToUSDT(address asset, uint256 amount) private returns (uint256 usdtReceived) {
        // Check if asset should use V2 router
        if (useV2Router[asset]) {
            return _swapAssetToUSDTV2(asset, amount);
        }

        // Calculate minimum output based on oracle price and slippage tolerance
        uint256 price = _getAssetPrice(asset);
        uint8 decimals = IERC20Metadata(asset).decimals();
        uint256 expectedUSDT = (amount * price) / (10 ** decimals);
        uint256 minUSDT = (expectedUSDT * (SLIPPAGE_BASE - maxSlippage)) / SLIPPAGE_BASE;

        // Use V3 for other assets
        IERC20(asset).forceApprove(address(v3Router), amount);

        address pool = assetPools[asset];
        uint24 fee = pool != address(0) ? poolFees[pool] : 2500; // Default 0.25%

        usdtReceived = v3Router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: asset,
                tokenOut: USDT,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: amount,
                amountOutMinimum: minUSDT, // Oracle-based slippage protection
                sqrtPriceLimitX96: 0
            })
        );

        // Clear approval for security
        IERC20(asset).forceApprove(address(v3Router), 0);
    }

    /**
     * @notice Swap exact USDT amount to asset (exactInput mode)
     * @param asset Asset to buy
     * @param usdtAmount Exact amount of USDT to spend
     * @return assetReceived Amount of asset received
     */
    function _swapUSDTToAssetExactInput(address asset, uint256 usdtAmount) private returns (uint256 assetReceived) {
        // Check if asset should use V2 router
        if (useV2Router[asset]) {
            return _swapUSDTToAssetV2ExactInput(asset, usdtAmount);
        }

        // Calculate minimum output based on oracle price and slippage tolerance
        uint256 price = _getAssetPrice(asset);
        uint8 decimals = IERC20Metadata(asset).decimals();
        uint256 expectedAsset = (usdtAmount * (10 ** decimals)) / price;
        uint256 minAsset = (expectedAsset * (SLIPPAGE_BASE - maxSlippage)) / SLIPPAGE_BASE;

        // Approve USDT for V3 router
        IERC20(USDT).forceApprove(address(v3Router), usdtAmount);

        // Use V3 for other assets (exactInput mode)
        address pool = assetPools[asset];
        uint24 fee = pool != address(0) ? poolFees[pool] : 2500;

        assetReceived = v3Router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: USDT,
                tokenOut: asset,
                fee: fee,
                recipient: address(this),
                deadline: block.timestamp,
                amountIn: usdtAmount,
                amountOutMinimum: minAsset, // Oracle-based slippage protection
                sqrtPriceLimitX96: 0
            })
        );

        // Clear approval for security
        IERC20(USDT).forceApprove(address(v3Router), 0);
    }

    /**
     * @notice Swap asset to USDT using V2
     */
    function _swapAssetToUSDTV2(address asset, uint256 amount) private returns (uint256 usdtReceived) {
        address[] memory path = new address[](2);
        path[0] = asset;
        path[1] = USDT;

        // Calculate minimum output based on V2 quote and slippage tolerance
        uint256[] memory expectedAmounts = v2Router.getAmountsOut(amount, path);
        uint256 minUSDT = (expectedAmounts[1] * (SLIPPAGE_BASE - maxSlippage)) / SLIPPAGE_BASE;

        IERC20(asset).forceApprove(address(v2Router), amount);

        uint256[] memory amounts = v2Router.swapExactTokensForTokens(
            amount,
            minUSDT, // V2-based slippage protection
            path,
            address(this),
            block.timestamp
        );

        // Clear approval for security
        IERC20(asset).forceApprove(address(v2Router), 0);

        return amounts[1];
    }

    /**
     * @notice Swap exact USDT to asset using V2 (exactInput mode)
     * @param asset Asset to buy
     * @param usdtAmount Exact amount of USDT to spend
     * @return assetReceived Amount of asset received
     */
    function _swapUSDTToAssetV2ExactInput(address asset, uint256 usdtAmount) private returns (uint256 assetReceived) {
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = asset;

        // Calculate minimum output based on V2 quote and slippage tolerance
        uint256[] memory expectedAmounts = v2Router.getAmountsOut(usdtAmount, path);
        uint256 minAsset = (expectedAmounts[1] * (SLIPPAGE_BASE - maxSlippage)) / SLIPPAGE_BASE;

        IERC20(USDT).forceApprove(address(v2Router), usdtAmount);

        uint256[] memory amounts = v2Router.swapExactTokensForTokens(
            usdtAmount,
            minAsset, // V2-based slippage protection
            path,
            address(this),
            block.timestamp
        );

        // Clear approval for security
        IERC20(USDT).forceApprove(address(v2Router), 0);

        return amounts[1];
    }

    /**
     * @notice Return all assets to ETF Core
     */
    function _returnAllAssets(address[] calldata assets) private {
        for (uint256 i = 0; i < assets.length; i++) {
            address asset = assets[i];
            uint256 balance = IERC20(asset).balanceOf(address(this));

            if (balance > 0) {
                IERC20(asset).safeTransfer(address(etfCore), balance);
            }
        }

        // Also return any remaining USDT
        uint256 usdtBalance = IERC20(USDT).balanceOf(address(this));
        if (usdtBalance > 0) {
            IERC20(USDT).safeTransfer(address(etfCore), usdtBalance);
        }
    }

    /**
     * @notice Validate slippage protection
     */
    function _validateSlippage(uint256 valueBefore, uint256 valueAfter) private view {
        uint256 minValue = (valueBefore * (SLIPPAGE_BASE - maxSlippage)) / SLIPPAGE_BASE;

        if (valueAfter < minValue) {
            revert SlippageExceeded();
        }
    }
}

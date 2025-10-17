// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IETFRouterV1.sol";
import "./interfaces/IBlockETFCore.sol";
import "./interfaces/ISwapRouter.sol";
import "./interfaces/IPancakeV3Pool.sol";
import "./interfaces/IPancakeV2Router.sol";
import "./interfaces/IPriceOracle.sol";
import "./interfaces/IQuoterV3.sol";

/**
 * @title ETFRouterV1
 * @author BlockETF Team
 * @notice Router for seamless ETF token minting and burning using USDT
 * @dev Handles token swaps and ETF interactions through a single transaction
 */
contract ETFRouterV1 is IETFRouterV1, Ownable, Pausable, ReentrancyGuard {
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

    /// @notice PancakeSwap V3 router
    ISwapRouter public immutable v3Router;

    /// @notice Price oracle contract
    IPriceOracle public immutable priceOracle;

    /// @notice PancakeSwap V2 router
    IPancakeV2Router public immutable v2Router;

    /// @notice PancakeSwap V3 Quoter V3
    IQuoterV3 public immutable quoterV3;

    /// @notice USDT token address
    address public immutable USDT;

    /// @notice Default slippage tolerance (basis points)
    uint256 public defaultSlippage = 300; // 3% default slippage

    /// @notice Default pool fee tier
    uint24 public defaultPoolFee = FEE_MEDIUM; // Default to 0.25% fee pools

    /// @notice V3 pool addresses for direct USDT swaps (asset => pool)
    mapping(address => address) public assetV3Pools;

    /// @notice Assets that should use V2 router instead of V3
    mapping(address => bool) public useV2Router;

    /*//////////////////////////////////////////////////////////////
                                 ERRORS
    //////////////////////////////////////////////////////////////*/

    error TransactionExpired();
    error ZeroAmount();
    error InsufficientOutput();
    error InvalidSlippage();
    error InvalidFee();
    error InvalidAsset();
    error PoolNotFound();
    error SwapFailed();
    error InvalidPrice();

    /*//////////////////////////////////////////////////////////////
                                MODIFIERS
    //////////////////////////////////////////////////////////////*/

    modifier withinDeadline(uint256 deadline) {
        if (block.timestamp > deadline) revert TransactionExpired();
        _;
    }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(
        address _etfCore,
        address _v3Router,
        address _priceOracle,
        address _v2Router,
        address _quoterV3,
        address _usdt,
        address _wbnb
    ) Ownable(msg.sender) {
        if (_etfCore == address(0)) revert InvalidAsset();
        if (_v3Router == address(0)) revert InvalidAsset();
        if (_priceOracle == address(0)) revert InvalidAsset();
        if (_v2Router == address(0)) revert InvalidAsset();
        if (_quoterV3 == address(0)) revert InvalidAsset();
        if (_usdt == address(0)) revert InvalidAsset();
        if (_wbnb == address(0)) revert InvalidAsset();

        etfCore = IBlockETFCore(_etfCore);
        v3Router = ISwapRouter(_v3Router);
        priceOracle = IPriceOracle(_priceOracle);
        v2Router = IPancakeV2Router(_v2Router);
        quoterV3 = IQuoterV3(_quoterV3);
        USDT = _usdt;
    }

    /*//////////////////////////////////////////////////////////////
                           EXTERNAL FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mint exact amount of ETF shares - ultra simplified version
     * @param shares Amount of shares to mint
     * @param maxUSDT Maximum USDT provided by user (estimated by frontend)
     * @param deadline Transaction deadline
     * @return usdtUsed Actual amount of USDT used
     */
    function mintExactShares(uint256 shares, uint256 maxUSDT, uint256 deadline)
        external
        whenNotPaused
        nonReentrant
        withinDeadline(deadline)
        returns (uint256 usdtUsed)
    {
        if (shares == 0 || maxUSDT == 0) revert ZeroAmount();

        // 1. Transfer all USDT from user
        IERC20(USDT).safeTransferFrom(msg.sender, address(this), maxUSDT);

        // 2. Calculate required asset amounts
        uint256[] memory amounts = etfCore.calculateRequiredAmounts(shares);
        address[] memory assets = _getETFAssets();

        // 3. Purchase all required assets
        usdtUsed = 0;
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == USDT || amounts[i] == 0) {
                // USDT doesn't need to be purchased, directly count as used
                usdtUsed += amounts[i];
                continue;
            }

            // Purchase exact amount of asset
            if (useV2Router[assets[i]]) {
                // Use V2 router
                usdtUsed += _v2BuyAssetExactOutput(assets[i], amounts[i]);
            } else {
                // Use V3 router
                usdtUsed += _v3BuyAssetExactOutput(assets[i], amounts[i]);
            }
        }

        // 4. Mint ETF shares
        // Approve all assets to ETF Core
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                IERC20(assets[i]).forceApprove(address(etfCore), amounts[i]);
            }
        }

        // Mint shares
        etfCore.mintExactShares(shares, msg.sender);

        // Clear all approvals (security best practice)
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                IERC20(assets[i]).forceApprove(address(etfCore), 0);
            }
        }

        // 5. Refund remaining USDT
        uint256 refunded = maxUSDT - usdtUsed;
        if (refunded > 0) {
            IERC20(USDT).safeTransfer(msg.sender, refunded);
        }

        emit SharesMinted(msg.sender, shares, usdtUsed, refunded);
    }

    /**
     * @notice Mint ETF shares using USDT
     * @param usdtAmount Amount of USDT to spend
     * @param minShares Minimum shares to receive (slippage protection)
     * @param deadline Transaction deadline
     */
    function mintWithUSDT(uint256 usdtAmount, uint256 minShares, uint256 deadline)
        external
        whenNotPaused
        nonReentrant
        withinDeadline(deadline)
        returns (uint256 shares)
    {
        if (usdtAmount == 0) revert ZeroAmount();

        // Transfer USDT from user
        IERC20(USDT).safeTransferFrom(msg.sender, address(this), usdtAmount);

        // Calculate actual asset ratios based on current reserves
        address[] memory etfAssets = _getETFAssets();
        uint256[] memory actualRatios = _calculateActualAssetRatios();

        // Allocate USDT budget by actual ratios
        uint256[] memory budgets = new uint256[](etfAssets.length);
        for (uint256 i = 0; i < etfAssets.length; i++) {
            budgets[i] = (usdtAmount * actualRatios[i]) / 10000;
        }

        // Buy assets according to budget allocation
        uint256[] memory obtainedAmounts = new uint256[](etfAssets.length);
        for (uint256 i = 0; i < etfAssets.length; i++) {
            if (etfAssets[i] == USDT) {
                // Keep USDT as is
                obtainedAmounts[i] = budgets[i];
            } else {
                // Buy other assets with allocated USDT budget
                if (budgets[i] == 0) continue;

                if (useV2Router[etfAssets[i]]) {
                    obtainedAmounts[i] = _v2BuyAssetExactInput(etfAssets[i], budgets[i]);
                } else {
                    obtainedAmounts[i] = _v3BuyAssetExactInput(etfAssets[i], budgets[i]);
                }
            }
        }

        // Transfer all obtained assets to ETF core
        for (uint256 i = 0; i < etfAssets.length; i++) {
            IERC20(etfAssets[i]).safeTransfer(address(etfCore), obtainedAmounts[i]);
        }

        // Mint ETF shares using available assets
        shares = etfCore.mint(msg.sender);
        if (shares < minShares) revert InsufficientOutput();

        // Get remaining balances after minting
        uint256[] memory remainingAmounts = new uint256[](etfAssets.length);
        for (uint256 i = 0; i < etfAssets.length; i++) {
            remainingAmounts[i] = IERC20(etfAssets[i]).balanceOf(address(this));
        }

        // Handle remainders - sell back to USDT and refund
        uint256 usdtRefunded = _handleRemaindersAsUSDT(remainingAmounts, etfAssets);

        emit MintWithUSDT(msg.sender, usdtAmount, shares, usdtRefunded);
    }

    /**
     * @notice Burn ETF shares to receive USDT
     * @param shares Amount of ETF shares to burn
     * @param minUSDT Minimum USDT to receive (slippage protection)
     * @param deadline Transaction deadline
     */
    function burnToUSDT(uint256 shares, uint256 minUSDT, uint256 deadline)
        external
        whenNotPaused
        nonReentrant
        withinDeadline(deadline)
        returns (uint256 usdtAmount)
    {
        if (shares == 0) revert ZeroAmount();

        // Transfer ETF shares from user
        IERC20(address(etfCore)).safeTransferFrom(msg.sender, address(this), shares);

        // Burn shares to get underlying assets
        uint256[] memory receivedAmounts = etfCore.burn(shares, address(this));
        address[] memory etfAssets = _getETFAssets();

        // Swap all assets to USDT
        for (uint256 i = 0; i < etfAssets.length; i++) {
            address asset = etfAssets[i];
            uint256 amount = receivedAmounts[i];

            if (amount == 0) {
                continue; // Skip zero amounts
            }

            if (asset == USDT) {
                // Accumulate USDT directly without swapping
                usdtAmount += amount;
                continue;
            }

            // Sell asset for USDT - transaction will revert if swap fails
            usdtAmount += _sellAssetToUSDT(asset, amount);
        }

        // Get total USDT received
        if (usdtAmount < minUSDT) revert InsufficientOutput();

        // Transfer USDT to user
        IERC20(USDT).safeTransfer(msg.sender, usdtAmount);

        emit BurnToUSDT(msg.sender, shares, usdtAmount);
    }

    /**
     * @notice Calculate how much USDT is needed to mint a specific amount of shares
     * @param shares The amount of ETF shares you want to mint
     * @return usdtAmount The amount of USDT needed (DEX quote without slippage)
     */
    function usdtNeededForShares(uint256 shares) external view returns (uint256 usdtAmount) {
        uint256[] memory amounts = etfCore.calculateRequiredAmounts(shares);
        address[] memory etfAssets = _getETFAssets();

        for (uint256 i = 0; i < amounts.length; i++) {
            address asset = etfAssets[i];
            uint256 amount = amounts[i];

            if (asset == USDT) {
                usdtAmount += amount;
                continue;
            }

            // Get quote directly inline
            if (useV2Router[asset]) {
                // V2 quote
                address[] memory path = new address[](2);
                path[0] = USDT;
                path[1] = asset;
                uint256[] memory amountsIn = v2Router.getAmountsIn(amount, path);
                usdtAmount += amountsIn[0];
            } else {
                // V3 quote - try to get from quoter
                uint256 v3Quote = _getV3QuoteSimple(asset, amount);
                usdtAmount += v3Quote;
            }
        }

        return usdtAmount;
    }

    /**
     * @notice Calculate how many shares you can get for a given amount of USDT
     * @param usdtAmount The amount of USDT you want to spend
     * @return shares The amount of ETF shares you will receive
     */
    function usdtToShares(uint256 usdtAmount) external view returns (uint256 shares) {
        if (usdtAmount == 0) return 0;

        // Get ETF assets and calculate actual asset ratios
        address[] memory etfAssets = _getETFAssets();
        uint256[] memory actualRatios = _calculateActualAssetRatios();

        // Calculate USDT budget allocation for each asset
        uint256[] memory budgets = new uint256[](etfAssets.length);
        for (uint256 i = 0; i < etfAssets.length; i++) {
            budgets[i] = (usdtAmount * actualRatios[i]) / 10000;
        }

        // Estimate obtainable amounts for each asset
        uint256[] memory obtainedAmounts = new uint256[](etfAssets.length);
        for (uint256 i = 0; i < etfAssets.length; i++) {
            if (etfAssets[i] == USDT) {
                // USDT doesn't need purchasing
                obtainedAmounts[i] = budgets[i];
            } else {
                // Estimate how much asset can be obtained with the budget
                obtainedAmounts[i] = _estimateAssetFromUSDT(etfAssets[i], budgets[i]);
            }
        }

        // Calculate maximum mintable shares using Core's exact logic
        shares = etfCore.calculateMintShares(obtainedAmounts);
    }

    /**
     * @notice Calculate how much USDT you will receive from burning shares
     * @param shares The amount of ETF shares to burn
     * @return usdtAmount The amount of USDT you will receive (after slippage deduction)
     */
    function sharesToUsdt(uint256 shares) external view returns (uint256 usdtAmount) {
        uint256[] memory amounts = etfCore.calculateBurnAmounts(shares);
        address[] memory etfAssets = _getETFAssets();

        for (uint256 i = 0; i < amounts.length; i++) {
            address asset = etfAssets[i];
            uint256 amount = amounts[i];

            if (asset == USDT) {
                usdtAmount += amount;
            } else {
                // Use DEX quoter for more accurate estimation
                usdtAmount += _estimateAssetToUSDTOutput(asset, amount);
            }
        }
    }

    /**
     * @notice Get the configured V3 pool for an asset
     */
    function getAssetV3Pool(address asset) external view returns (address pool, uint24 fee) {
        return _getAssetPool(asset);
    }

    /**
     * @notice Set default slippage tolerance
     * @param _slippage Slippage in basis points (max 500 = 5%)
     */
    function setDefaultSlippage(uint256 _slippage) external onlyOwner {
        if (_slippage > MAX_SLIPPAGE) revert InvalidSlippage();
        defaultSlippage = _slippage;
        emit SlippageUpdated(_slippage);
    }

    /**
     * @notice Set default pool fee tier
     * @param _fee Pool fee tier (500, 2500, or 10000)
     */
    function setDefaultPoolFee(uint24 _fee) external onlyOwner {
        if (_fee != FEE_LOW && _fee != FEE_MEDIUM && _fee != FEE_HIGH) {
            revert InvalidFee();
        }
        defaultPoolFee = _fee;
    }

    /**
     * @notice Set V3 pool address for a specific asset-USDT pair
     * @param asset The asset token address
     * @param pool The PancakeSwap V3 pool address for asset-USDT pair
     */
    function setAssetV3Pool(address asset, address pool) external onlyOwner {
        if (asset == address(0)) revert InvalidAsset();

        if (pool != address(0)) {
            // Validate that this is a valid V3 pool
            IPancakeV3Pool poolContract = IPancakeV3Pool(pool);
            address token0 = poolContract.token0();
            address token1 = poolContract.token1();

            // Ensure pool contains both asset and USDT
            if (!((token0 == asset && token1 == USDT) || (token0 == USDT && token1 == asset))) {
                revert PoolNotFound();
            }
        }

        assetV3Pools[asset] = pool;
        emit PoolSet(asset, pool);
    }

    /**
     * @notice Set V3 pool addresses for multiple assets in batch
     * @param assets Array of asset token addresses
     * @param pools Array of corresponding V3 pool addresses
     */
    function setAssetV3PoolsBatch(address[] calldata assets, address[] calldata pools) external onlyOwner {
        if (assets.length != pools.length) revert InvalidAsset();

        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == address(0)) revert InvalidAsset();

            if (pools[i] != address(0)) {
                // Validate each pool
                IPancakeV3Pool poolContract = IPancakeV3Pool(pools[i]);
                address token0 = poolContract.token0();
                address token1 = poolContract.token1();

                if (!((token0 == assets[i] && token1 == USDT) || (token0 == USDT && token1 == assets[i]))) {
                    revert PoolNotFound();
                }
            }

            assetV3Pools[assets[i]] = pools[i];
            emit PoolSet(assets[i], pools[i]);
        }
    }

    /**
     * @notice Set whether an asset should use V2 router (admin only)
     * @param asset Asset address
     * @param useV2 Whether to use V2 router
     */
    function setAssetUseV2Router(address asset, bool useV2) external onlyOwner {
        if (asset == address(0)) revert InvalidAsset();
        useV2Router[asset] = useV2;
        emit RouterModeUpdated(asset, useV2);
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
     * @notice Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function recoverToken(address token, uint256 amount) external onlyOwner {
        address recipient = owner();
        IERC20(token).safeTransfer(recipient, amount);
        emit TokenRecovered(token, recipient, amount);
    }

    /*//////////////////////////////////////////////////////////////
                           PRIVATE FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get ETF assets from core contract
     */
    function _getETFAssets() private view returns (address[] memory) {
        IBlockETFCore.AssetInfo[] memory assets = etfCore.getAssets();
        address[] memory tokens = new address[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            tokens[i] = assets[i].token;
        }
        return tokens;
    }

    /**
     * @notice Get V3 pool and fee for asset-USDT pair
     * @param asset The asset to swap with USDT
     * @return pool V3 pool address (zero if not configured)
     * @return fee Pool fee tier
     */
    function _getAssetPool(address asset) private view returns (address pool, uint24 fee) {
        pool = assetV3Pools[asset];
        if (pool != address(0)) {
            // Get fee from the pool contract
            fee = IPancakeV3Pool(pool).fee();
        } else {
            // No pool configured, use default
            fee = defaultPoolFee;
        }
    }

    /**
     * @notice Sell an ETF asset for USDT using configured pools
     */
    function _sellAssetToUSDT(address asset, uint256 assetAmount) private returns (uint256 usdtAmount) {
        // Pre-validation checks
        if (assetAmount == 0 || asset == USDT) return 0;

        // Validate asset price to prevent zero price attacks
        uint256 assetPrice = priceOracle.getPrice(asset);
        if (assetPrice == 0) {
            revert InvalidPrice();
        }

        if (useV2Router[asset]) {
            // Use V2 router for this asset
            usdtAmount = _v2SellAssetExactInput(asset, assetAmount);
        } else {
            // Regular V3 handling for other assets
            // Get configured pool for this asset
            (address pool, uint24 fee) = _getAssetPool(asset);

            if (pool != address(0)) {
                // Use configured pool for direct swap
                usdtAmount = _v3ExecuteSellForUSDT(asset, fee, assetAmount);
            } else {
                // Use direct swap with default fee
                usdtAmount = _v3ExecuteSellForUSDT(asset, defaultPoolFee, assetAmount);
            }
        }
    }

    /**
     * @notice Convert asset amount to USDT value using oracle prices (with slippage buffer)
     */
    function _convertAssetToUSDTValue(address asset, uint256 assetAmount) private view returns (uint256) {
        if (asset == USDT) {
            return assetAmount;
        }

        // Use price oracle for estimation
        uint256 assetPrice = priceOracle.getPrice(asset);
        uint256 usdtPrice = priceOracle.getPrice(USDT);

        // Validate prices to prevent division by zero
        if (assetPrice == 0 || usdtPrice == 0) {
            revert InvalidPrice();
        }

        // Price oracle returns price in USD with 18 decimals
        uint256 usdtAmount = (assetAmount * assetPrice) / usdtPrice;

        // Add slippage buffer
        return (usdtAmount * (SLIPPAGE_BASE + defaultSlippage)) / SLIPPAGE_BASE;
    }

    /**
     * @notice Convert asset amount to USDT value using oracle prices (without slippage)
     */
    function _convertAssetToUSDTExact(address asset, uint256 assetAmount) private view returns (uint256) {
        if (asset == USDT) {
            return assetAmount;
        }

        // Use price oracle for estimation
        uint256 assetPrice = priceOracle.getPrice(asset);
        uint256 usdtPrice = priceOracle.getPrice(USDT);

        // Validate prices to prevent division by zero
        if (assetPrice == 0 || usdtPrice == 0) {
            revert InvalidPrice();
        }

        return (assetAmount * assetPrice) / usdtPrice;
    }

    /**
     * @notice Sell exact amount of asset for USDT using PancakeSwap V2
     */
    function _v2SellAssetExactInput(address asset, uint256 assetAmount) private returns (uint256 usdtAmount) {
        address[] memory path = new address[](2);
        path[0] = asset;
        path[1] = USDT;

        // Calculate expected output with slippage protection
        uint256[] memory expectedAmounts = v2Router.getAmountsOut(assetAmount, path);
        uint256 minOutput = (expectedAmounts[1] * (SLIPPAGE_BASE - defaultSlippage)) / SLIPPAGE_BASE;

        IERC20(asset).forceApprove(address(v2Router), assetAmount);

        try v2Router.swapExactTokensForTokens(
            assetAmount,
            minOutput, // Apply internal slippage protection
            path,
            address(this),
            block.timestamp + 300
        ) returns (uint256[] memory amounts) {
            usdtAmount = amounts[1]; // USDT amount
        } catch {
            revert SwapFailed(); // Fail consistently with buy functions
        }

        // Clear approval for security
        IERC20(asset).forceApprove(address(v2Router), 0);
    }

    // ============ V2 SWAP FUNCTIONS ============

    /**
     * @notice Buy exact amount of asset using V2 router
     */
    function _v2BuyAssetExactOutput(address asset, uint256 exactAmount) private returns (uint256 usdtUsed) {
        uint256 maxUSDT = IERC20(USDT).balanceOf(address(this));

        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = asset;

        IERC20(USDT).forceApprove(address(v2Router), maxUSDT);

        try v2Router.swapTokensForExactTokens(exactAmount, maxUSDT, path, address(this), block.timestamp + 300)
        returns (uint256[] memory amounts) {
            usdtUsed = amounts[0];
        } catch {
            revert SwapFailed();
        }

        IERC20(USDT).forceApprove(address(v2Router), 0);
    }

    /**
     * @notice Buy asset using V2 router with exact USDT input
     */
    function _v2BuyAssetExactInput(address asset, uint256 usdtAmount) private returns (uint256 assetAmount) {
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = asset;

        // Calculate expected output with slippage protection
        uint256[] memory expectedAmounts = v2Router.getAmountsOut(usdtAmount, path);
        uint256 minOutput = (expectedAmounts[1] * (SLIPPAGE_BASE - defaultSlippage)) / SLIPPAGE_BASE;

        IERC20(USDT).forceApprove(address(v2Router), usdtAmount);

        try v2Router.swapExactTokensForTokens(
            usdtAmount,
            minOutput, // Apply internal slippage protection
            path,
            address(this),
            block.timestamp + 300
        ) returns (uint256[] memory amounts) {
            assetAmount = amounts[1];
        } catch {
            revert SwapFailed();
        }

        IERC20(USDT).forceApprove(address(v2Router), 0);
    }

    // ============ V3 SWAP FUNCTIONS ============

    /**
     * @notice Buy exact amount of asset using V3 router
     */
    function _v3BuyAssetExactOutput(address asset, uint256 exactAmount) private returns (uint256 usdtUsed) {
        uint256 maxUSDT = IERC20(USDT).balanceOf(address(this));
        // Approve USDT for V3 swap
        IERC20(USDT).forceApprove(address(v3Router), maxUSDT);

        // Get asset pool configuration
        (address pool, uint24 fee) = _getAssetPool(asset);

        if (pool != address(0)) {
            // Use configured specific pool
            usdtUsed = _v3ExecuteExactOutput(asset, exactAmount, fee, maxUSDT);
        } else {
            // No specific pool configured, try common fee tiers
            usdtUsed = _v3TryMultipleFeesExactOutput(asset, exactAmount, maxUSDT);
        }

        // Clear approval
        IERC20(USDT).forceApprove(address(v3Router), 0);
    }

    /**
     * @notice Buy asset using V3 router with exact USDT input
     */
    function _v3BuyAssetExactInput(address asset, uint256 usdtAmount) private returns (uint256 assetAmount) {
        (address pool, uint24 fee) = _getAssetPool(asset);

        if (pool != address(0)) {
            // Use configured pool/fee
            return _v3ExecuteExactInput(asset, fee, usdtAmount);
        } else {
            // Try multiple fee tiers
            return _v3TryMultipleFeesExactInput(asset, usdtAmount);
        }
    }

    /**
     * @notice Execute V3 exact input swap with specific fee
     */
    function _v3ExecuteExactInput(address asset, uint24 fee, uint256 usdtAmount)
        private
        returns (uint256 assetAmount)
    {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: USDT,
            tokenOut: asset,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: usdtAmount,
            amountOutMinimum: 0, // No minimum output - rely on final minShares protection
            sqrtPriceLimitX96: 0
        });

        IERC20(USDT).forceApprove(address(v3Router), usdtAmount);

        try v3Router.exactInputSingle(params) returns (uint256 amount) {
            assetAmount = amount;
        } catch {
            revert SwapFailed();
        }

        IERC20(USDT).forceApprove(address(v3Router), 0);
    }

    /**
     * @notice Try multiple fee tiers for V3 exact input
     */
    function _v3TryMultipleFeesExactInput(address asset, uint256 usdtAmount) private returns (uint256 assetAmount) {
        uint24[3] memory fees = [FEE_MEDIUM, FEE_LOW, FEE_HIGH];

        for (uint256 i = 0; i < fees.length; i++) {
            ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
                tokenIn: USDT,
                tokenOut: asset,
                fee: fees[i],
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountIn: usdtAmount,
                amountOutMinimum: 0, // No minimum output - rely on final minShares protection
                sqrtPriceLimitX96: 0
            });

            IERC20(USDT).forceApprove(address(v3Router), usdtAmount);

            try v3Router.exactInputSingle(params) returns (uint256 amountOut) {
                IERC20(USDT).forceApprove(address(v3Router), 0);
                return amountOut;
            } catch {
                if (i == fees.length - 1) {
                    IERC20(USDT).forceApprove(address(v3Router), 0);
                    revert SwapFailed();
                }
                // Continue to next fee tier
            }
        }
    }

    /**
     * @notice Execute V3 exact output swap with specific fee
     */
    function _v3ExecuteExactOutput(address asset, uint256 exactAmount, uint24 fee, uint256 maxUSDT)
        private
        returns (uint256 usdtUsed)
    {
        ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
            tokenIn: USDT,
            tokenOut: asset,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountOut: exactAmount,
            amountInMaximum: maxUSDT,
            sqrtPriceLimitX96: 0
        });

        try v3Router.exactOutputSingle(params) returns (uint256 amountIn) {
            return amountIn;
        } catch {
            revert SwapFailed();
        }
    }

    /**
     * @notice Get simplified V3 quote
     */
    function _getV3QuoteSimple(address asset, uint256 amountOut) private view returns (uint256 usdtRequired) {
        (address pool, uint24 fee) = _getAssetPool(asset);

        // If specific pool configured, try its fee first
        if (pool != address(0)) {
            IQuoterV3.QuoteExactOutputSingleParams memory params = IQuoterV3.QuoteExactOutputSingleParams({
                tokenIn: USDT,
                tokenOut: asset,
                amountOut: amountOut,
                fee: fee,
                sqrtPriceLimitX96: 0
            });

            try quoterV3.quoteExactOutputSingle(params) returns (uint256 amountIn, uint160, uint32, uint256) {
                return amountIn;
            } catch {
                // If configured pool fails, continue to try other fee tiers
            }
        }

        // Try common fee tiers ordered by liquidity (same as _tryMultipleFees)
        uint24[3] memory fees = [FEE_MEDIUM, FEE_LOW, FEE_HIGH]; // 0.25%, 0.05%, 1%

        for (uint256 i = 0; i < fees.length; i++) {
            // Skip the fee we already tried above (if any)
            if (pool != address(0) && fees[i] == fee) {
                continue;
            }

            IQuoterV3.QuoteExactOutputSingleParams memory params = IQuoterV3.QuoteExactOutputSingleParams({
                tokenIn: USDT,
                tokenOut: asset,
                amountOut: amountOut,
                fee: fees[i],
                sqrtPriceLimitX96: 0
            });

            try quoterV3.quoteExactOutputSingle(params) returns (uint256 amountIn, uint160, uint32, uint256) {
                // Return the first successful quote (same strategy as _tryMultipleFees)
                return amountIn;
            } catch {
                continue;
            }
        }

        // If no DEX quotes available, fallback to oracle
        return _convertAssetToUSDTValue(asset, amountOut);
    }

    /**
     * @notice Try multiple fee tiers for V3 exact output
     */
    function _v3TryMultipleFeesExactOutput(address asset, uint256 exactAmount, uint256 maxUSDT)
        private
        returns (uint256 usdtUsed)
    {
        // Try common fee tiers ordered by liquidity (high to low)
        uint24[3] memory fees = [FEE_MEDIUM, FEE_LOW, FEE_HIGH]; // 0.25%, 0.05%, 1%

        for (uint256 i = 0; i < fees.length; i++) {
            ISwapRouter.ExactOutputSingleParams memory params = ISwapRouter.ExactOutputSingleParams({
                tokenIn: USDT,
                tokenOut: asset,
                fee: fees[i],
                recipient: address(this),
                deadline: block.timestamp + 300,
                amountOut: exactAmount,
                amountInMaximum: maxUSDT,
                sqrtPriceLimitX96: 0
            });

            try v3Router.exactOutputSingle(params) returns (uint256 amountIn) {
                return amountIn;
            } catch {
                // If this is the last attempt and still fails, revert
                if (i == fees.length - 1) {
                    revert SwapFailed();
                }
                // Otherwise continue to try next fee tier
            }
        }
    }

    /*//////////////////////////////////////////////////////////////
                        MINTWITHUSD HELPER FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Calculate actual asset ratios based on current reserves and prices
     * @return ratios Array of ratios in basis points (10000 = 100%)
     */
    function _calculateActualAssetRatios() private view returns (uint256[] memory ratios) {
        IBlockETFCore.AssetInfo[] memory assets = etfCore.getAssets();
        ratios = new uint256[](assets.length);

        // Calculate total value
        uint256 totalValue = 0;
        uint256[] memory assetValues = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            uint256 price = priceOracle.getPrice(assets[i].token);

            // Validate price to prevent zero price attacks
            if (price == 0) {
                revert InvalidPrice();
            }

            assetValues[i] = (assets[i].reserve * price) / 1e18;
            totalValue += assetValues[i];
        }

        // Calculate ratios
        if (totalValue > 0) {
            for (uint256 i = 0; i < assets.length; i++) {
                ratios[i] = (assetValues[i] * 10000) / totalValue;
            }
        }
    }

    // ============ HIGH-LEVEL SWAP FUNCTIONS ============

    /**
     * @notice Handle remainder assets by selling them back to USDT
     * @param remainingAmounts Array of remaining asset amounts after minting
     * @param etfAssets Array of ETF asset addresses
     * @return usdtRefunded Total USDT refunded to user
     */
    function _handleRemaindersAsUSDT(uint256[] memory remainingAmounts, address[] memory etfAssets)
        private
        returns (uint256 usdtRefunded)
    {
        for (uint256 i = 0; i < etfAssets.length; i++) {
            uint256 remainder = remainingAmounts[i];

            if (remainder > 0) {
                if (etfAssets[i] == USDT) {
                    // USDT remainder - add directly
                    usdtRefunded += remainder;
                } else {
                    // Other assets - sell back to USDT
                    uint256 usdtFromSale = _sellAssetToUSDT(etfAssets[i], remainder);
                    usdtRefunded += usdtFromSale;
                }
            }
        }

        // Always refund any remainder to user
        if (usdtRefunded > 0) {
            IERC20(USDT).safeTransfer(msg.sender, usdtRefunded);
        }
    }

    /**
     * @notice Execute V3 sell with specific fee
     */
    function _v3ExecuteSellForUSDT(address asset, uint24 fee, uint256 amount) private returns (uint256 usdtReceived) {
        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: asset,
            tokenOut: USDT,
            fee: fee,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: amount,
            amountOutMinimum: 0, // Accept any amount
            sqrtPriceLimitX96: 0
        });

        IERC20(asset).forceApprove(address(v3Router), amount);

        try v3Router.exactInputSingle(params) returns (uint256 amountOut) {
            usdtReceived = amountOut;
        } catch {
            revert SwapFailed(); // Consistent with V2 behavior
        }

        // Clear approval for security
        IERC20(asset).forceApprove(address(v3Router), 0);
    }

    /**
     * @notice Estimate USDT output from selling an asset using DEX quotes
     * @param asset Asset to sell
     * @param assetAmount Amount of asset to sell
     * @return usdtAmount Estimated USDT amount
     */
    function _estimateAssetToUSDTOutput(address asset, uint256 assetAmount) private view returns (uint256 usdtAmount) {
        // Pre-validation checks
        if (assetAmount == 0 || asset == USDT) return assetAmount;

        if (useV2Router[asset]) {
            // Use V2 router to get accurate quote
            address[] memory path = new address[](2);
            path[0] = asset;
            path[1] = USDT;

            try v2Router.getAmountsOut(assetAmount, path) returns (uint256[] memory amounts) {
                return amounts[1]; // USDT amount
            } catch {
                // Fallback to oracle if V2 quote fails
                return _convertAssetToUSDTExact(asset, assetAmount);
            }
        } else {
            // Use V3 quoter for accurate estimation
            (address pool, uint24 fee) = _getAssetPool(asset);

            if (pool != address(0)) {
                // Try to get quote from configured pool
                try quoterV3.quoteExactInputSingle(
                    IQuoterV3.QuoteExactInputSingleParams({
                        tokenIn: asset,
                        tokenOut: USDT,
                        amountIn: assetAmount,
                        fee: fee,
                        sqrtPriceLimitX96: 0
                    })
                ) returns (uint256 amountOut, uint160, uint32, uint256) {
                    return amountOut;
                } catch {
                    // Fallback to oracle if quoter fails
                    return _convertAssetToUSDTExact(asset, assetAmount);
                }
            } else {
                // Try multiple fee tiers to find best quote
                uint24[3] memory fees = [FEE_MEDIUM, FEE_LOW, FEE_HIGH];
                uint256 bestQuote = 0;

                for (uint256 i = 0; i < fees.length; i++) {
                    try quoterV3.quoteExactInputSingle(
                        IQuoterV3.QuoteExactInputSingleParams({
                            tokenIn: asset,
                            tokenOut: USDT,
                            amountIn: assetAmount,
                            fee: fees[i],
                            sqrtPriceLimitX96: 0
                        })
                    ) returns (uint256 amountOut, uint160, uint32, uint256) {
                        if (amountOut > bestQuote) {
                            bestQuote = amountOut;
                        }
                    } catch {
                        // Continue to next fee tier
                    }
                }

                // Return best quote or fallback to oracle
                return bestQuote > 0 ? bestQuote : _convertAssetToUSDTExact(asset, assetAmount);
            }
        }
    }

    /**
     * @notice Estimate how much asset can be obtained with given USDT amount
     * @param asset Asset to estimate
     * @param usdtAmount USDT amount to spend
     * @return assetAmount Estimated asset amount
     */
    function _estimateAssetFromUSDT(address asset, uint256 usdtAmount) private view returns (uint256 assetAmount) {
        if (usdtAmount == 0) return 0;

        if (useV2Router[asset]) {
            // V2 estimate
            address[] memory path = new address[](2);
            path[0] = USDT;
            path[1] = asset;

            try v2Router.getAmountsOut(usdtAmount, path) returns (uint256[] memory amounts) {
                assetAmount = amounts[1];
            } catch {
                // Fallback to oracle-based estimation
                uint256 assetPrice = priceOracle.getPrice(asset);
                if (assetPrice > 0) {
                    assetAmount = (usdtAmount * 1e18) / assetPrice;
                }
            }
        } else {
            // V3 estimate - match the actual execution logic
            (address pool, uint24 fee) = _getAssetPool(asset);

            if (pool != address(0)) {
                // Use configured pool/fee
                try quoterV3.quoteExactInputSingle(
                    IQuoterV3.QuoteExactInputSingleParams({
                        tokenIn: USDT,
                        tokenOut: asset,
                        fee: fee,
                        amountIn: usdtAmount,
                        sqrtPriceLimitX96: 0
                    })
                ) returns (uint256 amountOut, uint160, uint32, uint256) {
                    assetAmount = amountOut;
                } catch {
                    // Fallback to oracle if quote fails
                    uint256 assetPrice = priceOracle.getPrice(asset);
                    if (assetPrice > 0) {
                        assetAmount = (usdtAmount * 1e18) / assetPrice;
                    }
                }
            } else {
                // No specific pool configured, try common fee tiers (match _tryMultipleFeesExactInput)
                uint256 bestAmount = 0;
                uint24[3] memory fees = [FEE_MEDIUM, FEE_LOW, FEE_HIGH];

                for (uint256 i = 0; i < fees.length; i++) {
                    try quoterV3.quoteExactInputSingle(
                        IQuoterV3.QuoteExactInputSingleParams({
                            tokenIn: USDT,
                            tokenOut: asset,
                            fee: fees[i],
                            amountIn: usdtAmount,
                            sqrtPriceLimitX96: 0
                        })
                    ) returns (uint256 amountOut, uint160, uint32, uint256) {
                        if (amountOut > bestAmount) {
                            bestAmount = amountOut;
                        }
                    } catch {
                        // Continue trying other fees
                    }
                }

                assetAmount = bestAmount;

                // If all quotes fail, fallback to oracle
                if (assetAmount == 0) {
                    uint256 assetPrice = priceOracle.getPrice(asset);
                    if (assetPrice > 0) {
                        assetAmount = (usdtAmount * 1e18) / assetPrice;
                    }
                }
            }
        }
    }
}

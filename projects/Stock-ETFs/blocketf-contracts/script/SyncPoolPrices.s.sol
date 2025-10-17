// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {FullMath} from "./libraries/FullMath.sol";

// PancakeSwap V3 interfaces
interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

interface IUniswapV3Pool {
    function slot0()
        external
        view
        returns (
            uint160 sqrtPriceX96,
            int24 tick,
            uint16 observationIndex,
            uint16 observationCardinality,
            uint16 observationCardinalityNext,
            uint32 feeProtocol, // FIXED: Changed from uint8 to uint32
            bool unlocked
        );

    function token0() external view returns (address);

    function token1() external view returns (address);

    function fee() external view returns (uint24);

    function liquidity() external view returns (uint128);
}

interface ISwapRouter {
    struct ExactInputSingleParams {
        address tokenIn;
        address tokenOut;
        uint24 fee;
        address recipient;
        uint256 deadline;
        uint256 amountIn;
        uint256 amountOutMinimum;
        uint160 sqrtPriceLimitX96;
    }

    function exactInputSingle(
        ExactInputSingleParams calldata params
    ) external returns (uint256 amountOut);
}

interface IPancakeV3Factory {
    function getPool(
        address tokenA,
        address tokenB,
        uint24 fee
    ) external view returns (address pool);
}

/**
 * @title SyncPoolPrices
 * @notice Script to sync V3 pool prices with oracle prices by executing arbitrage swaps
 * @dev Usage: forge script script/SyncPoolPrices.s.sol --rpc-url bnb_testnet --broadcast
 *
 * This script:
 * 1. Reads oracle prices and pool prices for all assets
 * 2. Calculates the deviation between them
 * 3. Executes swap transactions to push pool prices toward oracle prices
 * 4. Only syncs pools with deviation > threshold (default 1%)
 */
contract SyncPoolPrices is Script {
    using stdJson for string;

    // Constants
    address constant PANCAKE_V3_FACTORY =
        0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865;
    address constant PANCAKE_V3_SWAP_ROUTER =
        0x1b81D678ffb9C0263b24A97847620C99d213eB14;

    // Deviation threshold (0.1% = 10 basis points)
    uint256 constant DEVIATION_THRESHOLD_BPS = 10; // 0.1%

    // Token addresses (loaded from deployed-contracts.json)
    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;
    address public usdtToken;

    // Price oracle
    address public priceOracle;

    // Fee tiers for each token
    mapping(address => uint24) public tokenFees;

    struct PriceInfo {
        string symbol;
        address token;
        uint256 oraclePrice;
        uint256 poolPrice;
        uint256 deviationBps;
        bool needsSync;
    }

    function setUp() public {
        // Load contract addresses
        loadContractsFromJson();

        // Set fee tiers (must match deployed V3 pools - see DEPLOYED_ADDRESSES.md)
        tokenFees[wbnbToken] = 100; // 0.01% - FIXED: was 500, should be 2500
        tokenFees[btcToken] = 500; // 0.05%
        tokenFees[ethToken] = 500; // 0.05%
        tokenFees[adaToken] = 2500; // 0.25%
        tokenFees[bchToken] = 2500; // 0.25%
    }

    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        wbnbToken = json.readAddress(
            ".contracts.mockTokens[0].contractAddress"
        );
        btcToken = json.readAddress(".contracts.mockTokens[1].contractAddress");
        ethToken = json.readAddress(".contracts.mockTokens[2].contractAddress");
        adaToken = json.readAddress(".contracts.mockTokens[3].contractAddress");
        bchToken = json.readAddress(".contracts.mockTokens[4].contractAddress");
        usdtToken = json.readAddress(
            ".contracts.mockTokens[5].contractAddress"
        );
        priceOracle = json.readAddress(
            ".contracts.priceOracle.contractAddress"
        );

        console2.log("Loaded contracts from deployed-contracts.json");
        console2.log("  PriceOracle:", priceOracle);
        console2.log("  USDT:", usdtToken);
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Syncing Pool Prices with Oracle");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log(
            "Deviation threshold:",
            DEVIATION_THRESHOLD_BPS / 100,
            "%"
        );
        console2.log("");

        // Check all pools
        PriceInfo[] memory prices = new PriceInfo[](5);
        prices[0] = checkPrice("WBNB", wbnbToken);
        prices[1] = checkPrice("BTCB", btcToken);
        prices[2] = checkPrice("ETH", ethToken);
        prices[3] = checkPrice("ADA", adaToken);
        prices[4] = checkPrice("BCH", bchToken);

        // Print summary
        printPriceSummary(prices);

        // Start syncing
        vm.startBroadcast(deployerPrivateKey);

        uint256 syncedCount = 0;
        for (uint256 i = 0; i < prices.length; i++) {
            if (prices[i].needsSync) {
                syncPoolPrice(prices[i], deployer);
                syncedCount++;
            }
        }

        vm.stopBroadcast();

        console2.log("\n========================================");
        console2.log("Sync Complete");
        console2.log("========================================");
        console2.log("Pools synced:", syncedCount, "/", prices.length);
        console2.log("");

        // Recheck prices after sync
        if (syncedCount > 0) {
            console2.log("========================================");
            console2.log("Price Comparison (Before vs After)");
            console2.log("========================================");
            console2.log("");

            PriceInfo[] memory newPrices = new PriceInfo[](5);
            newPrices[0] = checkPrice("WBNB", wbnbToken);
            newPrices[1] = checkPrice("BTCB", btcToken);
            newPrices[2] = checkPrice("ETH", ethToken);
            newPrices[3] = checkPrice("ADA", adaToken);
            newPrices[4] = checkPrice("BCH", bchToken);

            printPriceComparison(prices, newPrices);
        }
    }

    /**
     * @notice Check price deviation for a token
     */
    function checkPrice(
        string memory symbol,
        address token
    ) internal view returns (PriceInfo memory) {
        // Get oracle price
        uint256 oraclePrice = IPriceOracle(priceOracle).getPrice(token);
        console2.log("Oracle price for", symbol, ":", oraclePrice / 1e18);

        // Get pool price
        uint24 fee = tokenFees[token];
        console2.log("Fee tier:", fee);

        address pool = IPancakeV3Factory(PANCAKE_V3_FACTORY).getPool(
            token,
            usdtToken,
            fee
        );
        console2.log("Pool address:", pool);

        require(pool != address(0), string.concat(symbol, " pool not found"));

        console2.log("Getting pool price...");
        uint256 poolPrice = getPoolPrice(pool, token);
        console2.log("Pool price for", symbol, ":", poolPrice / 1e18);

        // Calculate deviation in basis points
        uint256 deviationBps = 0;
        if (oraclePrice > poolPrice) {
            deviationBps = ((oraclePrice - poolPrice) * 10000) / oraclePrice;
        } else if (poolPrice > oraclePrice) {
            deviationBps = ((poolPrice - oraclePrice) * 10000) / oraclePrice;
        }

        bool needsSync = deviationBps > DEVIATION_THRESHOLD_BPS;

        return
            PriceInfo({
                symbol: symbol,
                token: token,
                oraclePrice: oraclePrice,
                poolPrice: poolPrice,
                deviationBps: deviationBps,
                needsSync: needsSync
            });
    }

    /**
     * @notice Get current price from V3 pool
     * @dev Uses FullMath.mulDiv to safely handle sqrtPriceX96^2 without overflow
     */
    function getPoolPrice(
        address pool,
        address token
    ) internal view returns (uint256) {
        IUniswapV3Pool v3Pool = IUniswapV3Pool(pool);

        // Get sqrtPriceX96 from slot0
        (uint160 sqrtPriceX96, , , , , , ) = v3Pool.slot0();

        // Get tokens
        address token0 = v3Pool.token0();
        address token1 = v3Pool.token1();

        // Determine which token is our asset
        bool token0IsAsset = token0 == token;
        bool token1IsAsset = token1 == token;

        require(token0IsAsset || token1IsAsset, "Token not in pool");

        // V3 uses: sqrtPriceX96 = sqrt(token1/token0) * 2^96
        // We want: price of asset in terms of USDT (how many USDT per 1 asset)

        uint256 price;
        uint256 Q96 = uint256(1) << 96;

        if (token1IsAsset) {
            // token1 is our asset, token0 is USDT
            // sqrtPriceX96 = sqrt(asset/USDT)
            // price_raw = (sqrtPriceX96 / 2^96)^2 = asset/USDT
            // We want USDT/asset = 1 / price_raw

            uint256 priceX96 = FullMath.mulDiv(
                uint256(sqrtPriceX96),
                uint256(sqrtPriceX96),
                Q96
            );

            uint256 assetPerUSDT = FullMath.mulDiv(priceX96, 1e18, Q96);

            if (assetPerUSDT == 0) return 0;

            price = (1e36) / assetPerUSDT;
        } else {
            // token0 is our asset, token1 is USDT
            // sqrtPriceX96 = sqrt(USDT/asset)
            // price = (sqrtPriceX96 / 2^96)^2 = USDT/asset (exactly what we want)

            uint256 priceX96 = FullMath.mulDiv(
                uint256(sqrtPriceX96),
                uint256(sqrtPriceX96),
                Q96
            );

            price = FullMath.mulDiv(priceX96, 1e18, Q96);
        }

        return price;
    }

    /**
     * @notice Print price summary table
     */
    function printPriceSummary(PriceInfo[] memory prices) internal view {
        console2.log("Current Prices:");
        console2.log(
            "------------------------------------------------------------"
        );
        console2.log(
            "Token  Oracle Price    Pool Price      Deviation   Sync?"
        );
        console2.log(
            "------------------------------------------------------------"
        );

        for (uint256 i = 0; i < prices.length; i++) {
            PriceInfo memory p = prices[i];

            console2.log(
                string.concat(
                    p.symbol,
                    "   $",
                    formatPrice(p.oraclePrice),
                    "   $",
                    formatPrice(p.poolPrice),
                    "   ",
                    formatBps(p.deviationBps),
                    "%   ",
                    p.needsSync ? "YES" : "NO"
                )
            );
        }
        console2.log(
            "------------------------------------------------------------"
        );
    }

    /**
     * @notice Print price comparison before and after sync
     */
    function printPriceComparison(
        PriceInfo[] memory oldPrices,
        PriceInfo[] memory newPrices
    ) internal view {
        console2.log(
            "------------------------------------------------------------------------------"
        );
        console2.log(
            "Token  Oracle      Pool Before  Pool After   Dev Before  Dev After  Change"
        );
        console2.log(
            "------------------------------------------------------------------------------"
        );

        for (uint256 i = 0; i < oldPrices.length; i++) {
            PriceInfo memory old = oldPrices[i];
            PriceInfo memory new_ = newPrices[i];

            // Calculate price change (in basis points for precision)
            string memory priceChange;
            if (new_.poolPrice > old.poolPrice) {
                uint256 increaseBps = ((new_.poolPrice - old.poolPrice) *
                    10000) / old.poolPrice;
                priceChange = string.concat("+", formatBps(increaseBps), "%");
            } else if (new_.poolPrice < old.poolPrice) {
                uint256 decreaseBps = ((old.poolPrice - new_.poolPrice) *
                    10000) / old.poolPrice;
                priceChange = string.concat("-", formatBps(decreaseBps), "%");
            } else {
                priceChange = "0.00%";
            }

            console2.log(
                string.concat(
                    old.symbol,
                    "   $",
                    formatPrice(old.oraclePrice),
                    "   $",
                    formatPrice(old.poolPrice),
                    "   $",
                    formatPrice(new_.poolPrice),
                    "   ",
                    formatBps(old.deviationBps),
                    "%   ",
                    formatBps(new_.deviationBps),
                    "%   ",
                    priceChange
                )
            );
        }
        console2.log(
            "------------------------------------------------------------------------------"
        );
    }

    /**
     * @notice Sync pool price to oracle price
     * @dev Executes a single swap to move price toward target
     */
    function syncPoolPrice(
        PriceInfo memory priceInfo,
        address swapper
    ) internal {
        console2.log("\nSyncing", priceInfo.symbol, "pool...");
        console2.log("  Current: $", priceInfo.poolPrice / 1e18);
        console2.log("  Target: $", priceInfo.oraclePrice / 1e18);

        uint24 fee = tokenFees[priceInfo.token];
        address pool = IPancakeV3Factory(PANCAKE_V3_FACTORY).getPool(
            priceInfo.token,
            usdtToken,
            fee
        );

        // Calculate required swap amount
        (
            address tokenIn,
            address tokenOut,
            uint256 amountIn
        ) = calculateSwapAmount(
                pool,
                priceInfo.token,
                priceInfo.poolPrice,
                priceInfo.oraclePrice
            );

        console2.log(
            "  Direction:",
            tokenIn == priceInfo.token ? "Sell asset" : "Buy asset"
        );
        console2.log("  Swap amount:", amountIn / 1e18);

        // Check balance
        uint256 balance = IERC20(tokenIn).balanceOf(swapper);

        if (balance < amountIn) {
            console2.log("  Insufficient balance, adjusting...");
            amountIn = balance;
        }

        if (amountIn == 0) {
            console2.log("  ERROR: No tokens available");
            return;
        }

        // Approve and execute swap
        IERC20(tokenIn).approve(PANCAKE_V3_SWAP_ROUTER, amountIn);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter
            .ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: fee,
                recipient: swapper,
                deadline: block.timestamp + 1 hours,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            });

        try ISwapRouter(PANCAKE_V3_SWAP_ROUTER).exactInputSingle(params)
        returns (uint256 amountOut) {
            console2.log("  Swap success! Out:", amountOut / 1e18);
            uint256 newPrice = getPoolPrice(pool, priceInfo.token);
            console2.log("  New price: $", newPrice / 1e18);
        } catch Error(string memory reason) {
            console2.log("  Swap failed:", reason);
        } catch {
            console2.log("  Swap failed");
        }
    }

    /**
     * @notice Calculate swap amount needed to move price from current to target
     * @dev Simple algorithm: swap_amount = pool_TVL × price_change_ratio × amplification
     * @param pool The V3 pool address
     * @param token The asset token address
     * @param currentPrice Current pool price (in 1e18 format)
     * @param targetPrice Target oracle price (in 1e18 format)
     * @return tokenIn Token to swap in
     * @return tokenOut Token to swap out
     * @return amountIn Amount of tokenIn to swap
     */
    function calculateSwapAmount(
        address pool,
        address token,
        uint256 currentPrice,
        uint256 targetPrice
    )
        internal
        view
        returns (address tokenIn, address tokenOut, uint256 amountIn)
    {
        IUniswapV3Pool v3Pool = IUniswapV3Pool(pool);
        uint128 liquidity = v3Pool.liquidity();

        console2.log("  Liquidity:", liquidity);

        // Calculate price change ratio
        uint256 priceDiff = currentPrice > targetPrice ?
            currentPrice - targetPrice : targetPrice - currentPrice;
        uint256 priceChangeRatio = (priceDiff * 1e18) / currentPrice;

        console2.log("  Price change ratio (bps):", (priceChangeRatio * 10000) / 1e18);

        // Estimate pool depth in USDT
        // Formula: poolDepth ≈ L * sqrt(P)
        uint256 sqrtPrice = sqrt(currentPrice);
        uint256 poolDepthUSDT = (uint256(liquidity) * sqrtPrice) / 1e9;

        console2.log("  Estimated pool depth (USDT):", poolDepthUSDT / 1e18);

        // No amplification factor - direct calculation for precision
        // The poolDepth estimate and price change ratio are sufficient
        console2.log("  Using direct calculation (no amplification)");

        // Calculate swap amount in USDT terms
        // Formula: swap_amount = poolDepth × priceChangeRatio / 2
        // Divide by 2 because we're estimating one side of the pool
        uint256 swapValueUSDT = (poolDepthUSDT * priceChangeRatio) / (1e18 * 2);

        console2.log("  Calculated swap value (USDT):", swapValueUSDT / 1e18);

        // Determine swap direction and convert to token amounts
        if (currentPrice > targetPrice) {
            // Need to sell asset to lower price
            tokenIn = token;
            tokenOut = usdtToken;

            // Convert USDT value to asset amount
            amountIn = (swapValueUSDT * 1e18) / currentPrice;
        } else {
            // Need to buy asset to raise price
            tokenIn = usdtToken;
            tokenOut = token;

            // Amount is already in USDT
            amountIn = swapValueUSDT;
        }

        // Apply minimum only - no maximum cap
        uint256 MIN_SWAP_VALUE = 100 * 1e18; // $100 minimum

        // Convert to USDT value for comparison
        uint256 swapValueCheck = tokenIn == usdtToken ?
            amountIn : (amountIn * currentPrice) / 1e18;

        if (swapValueCheck < MIN_SWAP_VALUE) {
            // Adjust to minimum
            if (tokenIn == usdtToken) {
                amountIn = MIN_SWAP_VALUE;
            } else {
                amountIn = (MIN_SWAP_VALUE * 1e18) / currentPrice;
            }
            console2.log("  Adjusted to minimum swap amount");
        }

        console2.log("  Final swap amount (USDT value):", swapValueCheck / 1e18);

        // Better logging for small amounts
        if (tokenIn == usdtToken) {
            console2.log("  Calculated swap (USDT):", amountIn / 1e18);
        } else {
            // Show more precision for asset amounts
            uint256 assetWhole = amountIn / 1e18;
            uint256 assetDecimals = (amountIn % 1e18) / 1e14; // 4 decimal places
            if (assetWhole > 0) {
                console2.log(
                    "  Calculated swap (asset):",
                    assetWhole,
                    ".",
                    assetDecimals
                );
            } else {
                console2.log("  Calculated swap (asset): 0.", assetDecimals);
            }
        }
    }

    /**
     * @notice Format price for display (simple version)
     */
    function formatPrice(uint256 price) internal view returns (string memory) {
        uint256 dollars = price / 1e18;
        uint256 cents = (price % 1e18) / 1e16; // 2 decimal places

        if (dollars > 1000) {
            return
                string.concat(
                    vm.toString(dollars),
                    ".",
                    vm.toString(cents / 10)
                );
        } else if (dollars > 0) {
            return string.concat(vm.toString(dollars), ".", padZero(cents));
        } else {
            return string.concat("0.", padZero(cents));
        }
    }

    /**
     * @notice Format basis points for display
     */
    function formatBps(uint256 bps) internal view returns (string memory) {
        uint256 whole = bps / 100;
        uint256 fraction = bps % 100;
        return string.concat(vm.toString(whole), ".", padZero(fraction));
    }

    /**
     * @notice Pad number with leading zero if needed
     */
    function padZero(uint256 num) internal view returns (string memory) {
        if (num < 10) {
            return string.concat("0", vm.toString(num));
        }
        return vm.toString(num);
    }

    /**
     * @notice Calculate square root using Babylon method
     * @dev Returns sqrt(y) where y is scaled by 1e18
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }
}

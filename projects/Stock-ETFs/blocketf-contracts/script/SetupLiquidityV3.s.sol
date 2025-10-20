// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IPriceOracle {
    function getPrice(address token) external view returns (uint256);
}

interface IUniswapV3Factory {
    function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool);
    function createPool(address tokenA, address tokenB, uint24 fee) external returns (address pool);
}

interface IUniswapV3Pool {
    function initialize(uint160 sqrtPriceX96) external;
}

interface INonfungiblePositionManager {
    struct MintParams {
        address token0;
        address token1;
        uint24 fee;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
    }

    function mint(MintParams calldata params)
        external
        payable
        returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1);

    function createAndInitializePoolIfNecessary(address token0, address token1, uint24 fee, uint160 sqrtPriceX96)
        external
        payable
        returns (address pool);
}

interface IMockERC20 {
    function mint(address to, uint256 amount) external;
}

/**
 * @title SetupLiquidityV3
 * @notice Create NEW V3 pools with CONCENTRATED liquidity ranges
 * @dev Uses different fee tiers than V2 to create separate pools
 *      Concentrated liquidity provides much better capital efficiency
 *
 * Strategy:
 * - Add concentrated liquidity to EXISTING V2 pools
 * - Price range: -50% to +100% for ALL assets (wider range for better coverage)
 * - Lower bound: 50% of current price, Upper bound: 200% of current price
 * - Uses V2 pool fee tiers: 0.05% (500) for WBNB/ADA/BCH, 0.25% (2500) for BTCB/ETH
 * - Target: $25M USDT + equivalent asset per pool (10x increase)
 * - Total TVL: $250M (5 pools) but with 20-50x effective liquidity due to concentration
 *
 * Usage: forge script script/SetupLiquidityV3.s.sol --rpc-url bnb_testnet --broadcast
 */
contract SetupLiquidityV3 is Script {
    // Contracts
    address constant PANCAKE_V3_FACTORY = 0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865;
    address constant PANCAKE_V3_POSITION_MANAGER = 0x427bF5b37357632377eCbEC9de3626C71A5396c1;
    address constant PRICE_ORACLE = 0x33bFB48F9f7203259247f6A12265fCb8571e1951;

    // Mock tokens
    address constant WBNB = 0xFaDc475b03E3bd7813a71446369204271a0a9843;
    address constant BTCB = 0x15Ab97353bfb6C6F07B3354A2ea1615eB2F45941;
    address constant ETH = 0x1cd44EC6CFb99132531793a397220C84216C5eeD;
    address constant ADA = 0xBE1Bf5C613C64B2a5F2dEd08B4A26dd2082Fa2cB;
    address constant BCH = 0x1aB580a59da516F068F43EFCac10CC33862A7E88;
    address constant USDT = 0xe364204ad025bbcDFF6DCb4291f89F532b0a8C35;

    // Use existing V2 pool fee tiers
    uint24 constant FEE_LOW = 500; // 0.05% (for WBNB, ADA, BCH)
    uint24 constant FEE_MEDIUM = 2500; // 0.25% (for BTCB, ETH)
    int24 constant TICK_SPACING_LOW = 10; // Tick spacing for 0.05% fee tier
    int24 constant TICK_SPACING_MEDIUM = 50; // Tick spacing for 0.25% fee tier

    // Target liquidity per pool (10x increase)
    uint256 constant LIQUIDITY_USDT_PER_POOL = 25_000_000 * 1e18; // $25M USDT
    uint256 constant SAFETY_MULTIPLIER = 2; // 2x safety factor for concentrated liquidity

    // Price range configurations (in basis points, 10000 = 100%)
    // Lower bound: -50% (price * 0.5), Upper bound: +100% (price * 2.0)
    uint256 constant LOWER_RANGE_BPS = 5000; // -50% (from current price)
    uint256 constant UPPER_RANGE_BPS = 10000; // +100% (from current price)

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Adding Concentrated Liquidity to V2 Pools");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Strategy: Concentrated liquidity (-50% to +100%)");
        console2.log("Using existing V2 pool fee tiers");
        console2.log("USDT per pool:", LIQUIDITY_USDT_PER_POOL / 1e18, "USDT");
        console2.log("Target TVL per pool: ~$50M USD ($25M USDT + $25M asset)");
        console2.log("Total TVL: ~$250M USD (5 pools)");
        console2.log("Effective liquidity: 20-50x due to concentration");
        console2.log("");

        IPriceOracle oracle = IPriceOracle(PRICE_ORACLE);
        IUniswapV3Factory factory = IUniswapV3Factory(PANCAKE_V3_FACTORY);

        // Get oracle prices
        console2.log("Fetching oracle prices...");
        uint256 wbnbPrice = oracle.getPrice(WBNB);
        uint256 btcbPrice = oracle.getPrice(BTCB);
        uint256 ethPrice = oracle.getPrice(ETH);
        uint256 adaPrice = oracle.getPrice(ADA);
        uint256 bchPrice = oracle.getPrice(BCH);

        console2.log("  WBNB:", wbnbPrice / 1e18, "USD");
        console2.log("  BTCB:", btcbPrice / 1e18, "USD");
        console2.log("  ETH:", ethPrice / 1e18, "USD");
        console2.log("  ADA:", adaPrice / 1e18, "USD");
        console2.log("  BCH:", bchPrice / 1e18, "USD");
        console2.log("");

        // Calculate token amounts needed
        uint256 usdtTotal = LIQUIDITY_USDT_PER_POOL * 5 * SAFETY_MULTIPLIER;
        uint256 wbnbAmount = (LIQUIDITY_USDT_PER_POOL * 1e18) / wbnbPrice * SAFETY_MULTIPLIER;
        uint256 btcbAmount = (LIQUIDITY_USDT_PER_POOL * 1e18) / btcbPrice * SAFETY_MULTIPLIER;
        uint256 ethAmount = (LIQUIDITY_USDT_PER_POOL * 1e18) / ethPrice * SAFETY_MULTIPLIER;
        uint256 adaAmount = (LIQUIDITY_USDT_PER_POOL * 1e18) / adaPrice * SAFETY_MULTIPLIER;
        uint256 bchAmount = (LIQUIDITY_USDT_PER_POOL * 1e18) / bchPrice * SAFETY_MULTIPLIER;

        console2.log("Pre-minting tokens (with 2x safety factor)...");
        console2.log("  USDT:", usdtTotal / 1e18);
        console2.log("  WBNB:", wbnbAmount / 1e18);
        console2.log("  BTCB:", btcbAmount / 1e18);
        console2.log("  ETH:", ethAmount / 1e18);
        console2.log("  ADA:", adaAmount / 1e18);
        console2.log("  BCH:", bchAmount / 1e18);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Mint tokens
        IMockERC20(USDT).mint(deployer, usdtTotal);
        IMockERC20(WBNB).mint(deployer, wbnbAmount);
        IMockERC20(BTCB).mint(deployer, btcbAmount);
        IMockERC20(ETH).mint(deployer, ethAmount);
        IMockERC20(ADA).mint(deployer, adaAmount);
        IMockERC20(BCH).mint(deployer, bchAmount);

        console2.log("Tokens minted successfully");
        console2.log("");

        // Approve Position Manager
        console2.log("Approving Position Manager...");
        IERC20(USDT).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(WBNB).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(BTCB).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(ETH).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(ADA).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(BCH).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        console2.log("Approvals complete");
        console2.log("");

        console2.log("========================================");
        console2.log("Setting up Concentrated Liquidity Pools");
        console2.log("========================================");
        console2.log("");

        // Setup pools with concentrated liquidity (use existing V2 pool fees, range: -50% to +100%)
        setupConcentratedPool(factory, WBNB, "WBNB", wbnbPrice, FEE_LOW, TICK_SPACING_LOW, deployer);
        setupConcentratedPool(factory, BTCB, "BTCB", btcbPrice, FEE_MEDIUM, TICK_SPACING_MEDIUM, deployer);
        setupConcentratedPool(factory, ETH, "ETH", ethPrice, FEE_MEDIUM, TICK_SPACING_MEDIUM, deployer);
        setupConcentratedPool(factory, ADA, "ADA", adaPrice, FEE_LOW, TICK_SPACING_LOW, deployer);
        setupConcentratedPool(factory, BCH, "BCH", bchPrice, FEE_LOW, TICK_SPACING_LOW, deployer);

        vm.stopBroadcast();

        console2.log("");
        console2.log("========================================");
        console2.log("Concentrated Liquidity Addition Complete");
        console2.log("========================================");
        console2.log("All 5 positions created in existing V2 pools");
        console2.log("Using V2 pool fee tiers (500 and 2500)");
        console2.log("Position NFTs sent to:", deployer);
    }

    function setupConcentratedPool(
        IUniswapV3Factory factory,
        address token,
        string memory symbol,
        uint256 tokenPrice,
        uint24 fee,
        int24 tickSpacing,
        address recipient
    ) internal {
        console2.log("--------------------------------------------------");
        console2.log("Adding concentrated liquidity to", symbol, "/USDT pool");
        console2.log("--------------------------------------------------");

        // Check if pool exists
        address existingPool = factory.getPool(token, USDT, fee);
        if (existingPool == address(0)) {
            console2.log("ERROR: Pool does not exist!");
            console2.log("  Expected fee tier:", fee);
            console2.log("Skipping...");
            console2.log("");
            return;
        }

        console2.log("  Using existing pool:", existingPool);
        console2.log("  Token:", token);
        console2.log("  Price from oracle:", tokenPrice / 1e18, "USD");
        console2.log("  Fee tier:", fee);
        console2.log("  Price range: -50% to +100%");
        console2.log("  NFT recipient:", recipient);
        console2.log("");

        // Calculate price bounds (token price in USDT)
        // Lower price = current price * 0.5 (50% of current)
        // Upper price = current price * 2.0 (200% of current, i.e., +100%)
        uint256 priceLower = (tokenPrice * (10000 - LOWER_RANGE_BPS)) / 10000;
        uint256 priceUpper = (tokenPrice * (10000 + UPPER_RANGE_BPS)) / 10000;

        console2.log("  Price range:");
        console2.log("    Lower:", priceLower / 1e18, "USD");
        console2.log("    Current:", tokenPrice / 1e18, "USD");
        console2.log("    Upper:", priceUpper / 1e18, "USD");

        // Convert prices to ticks
        int24 tickLower = priceToTick(priceLower, tokenPrice);
        int24 tickUpper = priceToTick(priceUpper, tokenPrice);

        // Round to nearest valid tick based on tick spacing
        tickLower = roundToTickSpacing(tickLower, tickSpacing);
        tickUpper = roundToTickSpacing(tickUpper, tickSpacing);

        console2.log("  Tick range:");
        console2.log("    Lower tick:", vm.toString(tickLower));
        console2.log("    Upper tick:", vm.toString(tickUpper));
        console2.log("");

        // Calculate token amounts
        uint256 tokenAmount = (LIQUIDITY_USDT_PER_POOL * 1e18) / tokenPrice;

        // Determine token order
        address token0;
        address token1;
        uint256 amount0Desired;
        uint256 amount1Desired;

        if (token < USDT) {
            token0 = token;
            token1 = USDT;
            amount0Desired = tokenAmount;
            amount1Desired = LIQUIDITY_USDT_PER_POOL;
        } else {
            token0 = USDT;
            token1 = token;
            amount0Desired = LIQUIDITY_USDT_PER_POOL;
            amount1Desired = tokenAmount;
        }

        console2.log("  Token amounts:");
        console2.log("    Token0:", token0);
        console2.log("    Amount0:", amount0Desired / 1e18);
        console2.log("    Token1:", token1);
        console2.log("    Amount1:", amount1Desired / 1e18);
        console2.log("");

        // Create position (pool already exists, no need to create/initialize)
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: recipient,
            deadline: block.timestamp + 1 hours
        });

        try INonfungiblePositionManager(PANCAKE_V3_POSITION_MANAGER).mint(params) returns (
            uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1
        ) {
            console2.log("V3 Pool created successfully!");
            console2.log("  Position NFT ID:", tokenId);
            console2.log("  Liquidity:", liquidity);
            console2.log("  Amount0 used:", amount0 / 1e18);
            console2.log("  Amount1 used:", amount1 / 1e18);

            // Calculate actual TVL
            uint256 tvl0;
            uint256 tvl1;
            if (token0 == USDT) {
                tvl0 = amount0;
                tvl1 = (amount1 * tokenPrice) / 1e18;
            } else {
                tvl0 = (amount0 * tokenPrice) / 1e18;
                tvl1 = amount1;
            }
            uint256 totalTvl = tvl0 + tvl1;

            console2.log("  Actual TVL: $", totalTvl / 1e18);
            console2.log(
                "  Effective liquidity (concentrated): ~$", (totalTvl * 5) / 1e18, "- $", (totalTvl * 10) / 1e18
            );
        } catch Error(string memory reason) {
            console2.log("Failed to create pool:", reason);
        } catch {
            console2.log("Failed to create pool: unknown error");
        }

        console2.log("");
    }

    /**
     * @notice Convert price to approximate tick
     * @dev Simplified conversion: tick ≈ log1.0001(price)
     *      For concentrated liquidity, we use relative price adjustment
     */
    function priceToTick(uint256 adjustedPrice, uint256 currentPrice) internal pure returns (int24) {
        // Calculate relative price change in basis points
        int256 priceChangeBps;
        if (adjustedPrice > currentPrice) {
            priceChangeBps = int256(((adjustedPrice - currentPrice) * 10000) / currentPrice);
        } else {
            priceChangeBps = -int256(((currentPrice - adjustedPrice) * 10000) / currentPrice);
        }

        // Approximate: 1 tick ≈ 0.01% price change
        // So 1 bp (0.01%) ≈ 1 tick
        return int24(priceChangeBps);
    }

    /**
     * @notice Round tick to nearest valid tick based on tick spacing
     */
    function roundToTickSpacing(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        int24 rounded = (tick / tickSpacing) * tickSpacing;

        // Ensure we don't exceed V3 tick bounds
        int24 MIN_TICK = -887272;
        int24 MAX_TICK = 887272;

        if (rounded < MIN_TICK) return MIN_TICK;
        if (rounded > MAX_TICK) return MAX_TICK;

        return rounded;
    }

    /**
     * @notice Calculate square root using Babylonian method
     * @param y The number to find square root of
     * @return z The square root
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

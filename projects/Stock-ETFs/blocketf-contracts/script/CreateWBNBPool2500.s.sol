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
 * @title CreateWBNBPool2500
 * @notice Create new WBNB/USDT pool with 0.25% (2500) fee tier and correct oracle price
 * @dev Usage: forge script script/CreateWBNBPool2500.s.sol --rpc-url bnb_testnet --broadcast
 */
contract CreateWBNBPool2500 is Script {
    // Contracts
    address constant PANCAKE_V3_FACTORY = 0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865;
    address constant PANCAKE_V3_POSITION_MANAGER = 0x427bF5b37357632377eCbEC9de3626C71A5396c1;
    address constant PRICE_ORACLE = 0x33bFB48F9f7203259247f6A12265fCb8571e1951;

    // Tokens
    address constant WBNB = 0xFaDc475b03E3bd7813a71446369204271a0a9843;
    address constant USDT = 0xe364204ad025bbcDFF6DCb4291f89F532b0a8C35;

    // Pool configuration
    uint24 constant FEE = 2500; // 0.25%
    int24 constant TICK_SPACING = 50; // Tick spacing for 0.25% fee tier

    // Liquidity amount
    uint256 constant LIQUIDITY_USDT = 25_000_000 * 1e18; // $25M USDT

    // Price range: -50% to +100%
    uint256 constant LOWER_RANGE_BPS = 5000; // -50%
    uint256 constant UPPER_RANGE_BPS = 10000; // +100%

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Create WBNB/USDT Pool (0.25% fee)");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Fee tier: 2500 (0.25%)");
        console2.log("");

        IPriceOracle oracle = IPriceOracle(PRICE_ORACLE);
        IUniswapV3Factory factory = IUniswapV3Factory(PANCAKE_V3_FACTORY);

        // Get oracle price
        uint256 wbnbPrice = oracle.getPrice(WBNB);
        console2.log("WBNB Oracle Price:", wbnbPrice / 1e18, "USD");
        console2.log("");

        // Check if pool exists
        address existingPool = factory.getPool(WBNB, USDT, FEE);
        address pool;

        if (existingPool != address(0)) {
            console2.log("Pool already exists at:", existingPool);
            console2.log("Will add liquidity to existing pool");
            pool = existingPool;
        } else {
            console2.log("Pool does not exist - will create new pool");
        }
        console2.log("");

        // Calculate sqrtPriceX96 for initial price
        // For WBNB/USDT pool, we need to determine token order first
        address token0 = USDT < WBNB ? USDT : WBNB;
        address token1 = USDT < WBNB ? WBNB : USDT;

        console2.log("Token order:");
        console2.log("  token0:", token0);
        console2.log("  token1:", token1);
        console2.log("");

        // Calculate sqrtPriceX96
        // sqrtPriceX96 = sqrt(token1/token0) * 2^96
        uint160 sqrtPriceX96;

        if (token0 == USDT) {
            // token0 = USDT, token1 = WBNB
            // sqrtPriceX96 = sqrt(WBNB_price_in_USDT) * 2^96
            // WBNB price = 1311 USDT, so sqrt(1311) * 2^96
            sqrtPriceX96 = calculateSqrtPriceX96(wbnbPrice, 1e18);
        } else {
            // token0 = WBNB, token1 = USDT
            // sqrtPriceX96 = sqrt(USDT_price_in_WBNB) * 2^96
            // USDT price in WBNB = 1/1311, so sqrt(1/1311) * 2^96
            sqrtPriceX96 = calculateSqrtPriceX96(1e18, wbnbPrice);
        }

        console2.log("Initial sqrtPriceX96:", uint256(sqrtPriceX96));
        console2.log("");

        // Calculate token amounts
        uint256 wbnbAmount = (LIQUIDITY_USDT * 1e18) / wbnbPrice * 2; // 2x safety factor

        console2.log("Minting tokens...");
        console2.log("  USDT:", (LIQUIDITY_USDT * 2) / 1e18);
        console2.log("  WBNB:", wbnbAmount / 1e18);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Mint tokens
        IMockERC20(USDT).mint(deployer, LIQUIDITY_USDT * 2);
        IMockERC20(WBNB).mint(deployer, wbnbAmount);

        // Approve Position Manager
        console2.log("Approving tokens...");
        IERC20(USDT).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        IERC20(WBNB).approve(PANCAKE_V3_POSITION_MANAGER, type(uint256).max);
        console2.log("");

        // Create and initialize pool if needed
        if (existingPool == address(0)) {
            console2.log("Creating and initializing pool...");
            pool = INonfungiblePositionManager(PANCAKE_V3_POSITION_MANAGER).createAndInitializePoolIfNecessary(
                token0, token1, FEE, sqrtPriceX96
            );
            console2.log("Pool created at:", pool);
        } else {
            console2.log("Using existing pool - skipping creation");
        }
        console2.log("");

        // Use full range liquidity to ensure it covers current price
        // V3 tick range: -887272 to 887272 (max range)
        // For 0.25% fee tier, tick spacing is 50
        // Use near-full range: -887200 to 887200 (divisible by 50)

        int24 tickLower = -887200;  // Near min tick, divisible by 50
        int24 tickUpper = 887200;   // Near max tick, divisible by 50

        console2.log("Using full range liquidity:");
        console2.log("  Tick Lower:", vm.toString(tickLower));
        console2.log("  Tick Upper:", vm.toString(tickUpper));
        console2.log("  Oracle price:", wbnbPrice / 1e18, "USD");
        console2.log("  This ensures liquidity at ANY price");
        console2.log("");

        console2.log("Tick range:");
        console2.log("  Lower:", vm.toString(tickLower));
        console2.log("  Upper:", vm.toString(tickUpper));
        console2.log("");

        // Determine amounts based on token order
        uint256 amount0Desired;
        uint256 amount1Desired;

        if (token0 == USDT) {
            amount0Desired = LIQUIDITY_USDT;
            amount1Desired = (LIQUIDITY_USDT * 1e18) / wbnbPrice;
        } else {
            amount0Desired = (LIQUIDITY_USDT * 1e18) / wbnbPrice;
            amount1Desired = LIQUIDITY_USDT;
        }

        console2.log("Adding liquidity...");
        console2.log("  Amount0:", amount0Desired / 1e18);
        console2.log("  Amount1:", amount1Desired / 1e18);
        console2.log("");

        // Add liquidity
        INonfungiblePositionManager.MintParams memory params = INonfungiblePositionManager.MintParams({
            token0: token0,
            token1: token1,
            fee: FEE,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: deployer,
            deadline: block.timestamp + 1 hours
        });

        (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1) =
            INonfungiblePositionManager(PANCAKE_V3_POSITION_MANAGER).mint(params);

        vm.stopBroadcast();

        console2.log("========================================");
        console2.log("Pool Created Successfully!");
        console2.log("========================================");
        console2.log("Pool address:", pool);
        console2.log("Position NFT ID:", tokenId);
        console2.log("Liquidity:", liquidity);
        console2.log("Amount0 used:", amount0 / 1e18);
        console2.log("Amount1 used:", amount1 / 1e18);

        // Calculate TVL
        uint256 tvl;
        if (token0 == USDT) {
            tvl = amount0 + (amount1 * wbnbPrice) / 1e18;
        } else {
            tvl = (amount0 * wbnbPrice) / 1e18 + amount1;
        }

        console2.log("Total TVL: $", tvl / 1e18);
        console2.log("");
    }

    function calculateSqrtPriceX96(uint256 price0, uint256 price1) internal pure returns (uint160) {
        // sqrtPriceX96 = sqrt(price0/price1) * 2^96
        // Both prices are in 1e18, so they cancel out the decimal scaling
        uint256 ratio = (price0 * 1e18) / price1;
        uint256 sqrtRatio = sqrt(ratio);

        // sqrtRatio is in 1e9 (sqrt of 1e18)
        // We need to scale it to Q96 format: sqrtRatio * 2^96 / 1e9
        uint256 Q96 = 2 ** 96;
        uint256 result = (sqrtRatio * Q96) / 1e9;

        return uint160(result);
    }

    function priceToTick(uint256 adjustedPrice, uint256 currentPrice) internal pure returns (int24) {
        int256 priceChangeBps;
        if (adjustedPrice > currentPrice) {
            priceChangeBps = int256(((adjustedPrice - currentPrice) * 10000) / currentPrice);
        } else {
            priceChangeBps = -int256(((currentPrice - adjustedPrice) * 10000) / currentPrice);
        }

        return int24(priceChangeBps);
    }

    function roundToTickSpacing(int24 tick, int24 tickSpacing) internal pure returns (int24) {
        int24 rounded = (tick / tickSpacing) * tickSpacing;

        int24 MIN_TICK = -887272;
        int24 MAX_TICK = 887272;

        if (rounded < MIN_TICK) return MIN_TICK;
        if (rounded > MAX_TICK) return MAX_TICK;

        return rounded;
    }

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

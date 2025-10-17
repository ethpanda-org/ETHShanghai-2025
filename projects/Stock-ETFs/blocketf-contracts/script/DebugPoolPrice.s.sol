// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";

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
            uint32 feeProtocol,
            bool unlocked
        );

    function token0() external view returns (address);
    function token1() external view returns (address);
}

interface IERC20Metadata {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

/**
 * @title DebugPoolPrice
 * @notice Debug script to verify pool price calculation
 */
contract DebugPoolPrice is Script {
    address constant WBNB_POOL = 0xAA2EeCccc51f1F2716Fc531E19eC83d3094f437c;

    function run() public view {
        IUniswapV3Pool pool = IUniswapV3Pool(WBNB_POOL);

        console2.log("========================================");
        console2.log("Debug WBNB Pool Price");
        console2.log("========================================");
        console2.log("Pool:", WBNB_POOL);
        console2.log("");

        // Get pool state
        (uint160 sqrtPriceX96, int24 tick, , , , , ) = pool.slot0();
        address token0 = pool.token0();
        address token1 = pool.token1();

        console2.log("Raw Pool Data:");
        console2.log("  sqrtPriceX96:", uint256(sqrtPriceX96));
        console2.log("  tick:", vm.toString(tick));
        console2.log("  token0:", token0);
        console2.log("  token1:", token1);
        console2.log("");

        // Get token info
        string memory symbol0 = IERC20Metadata(token0).symbol();
        string memory symbol1 = IERC20Metadata(token1).symbol();

        console2.log("Token Info:");
        console2.log("  token0:", symbol0);
        console2.log("  token1:", symbol1);
        console2.log("");

        // Calculate price using exact math
        uint256 Q96 = uint256(1) << 96;
        console2.log("Q96 =", Q96);
        console2.log("");

        // Method 1: Using bit shifts (what Solidity would do)
        console2.log("Method 1: Manual calculation");
        uint256 sqrtPriceX96_uint = uint256(sqrtPriceX96);
        console2.log("  sqrtPriceX96 as uint256:", sqrtPriceX96_uint);

        // We need to calculate: (sqrtPriceX96)^2 / (2^96)^2
        // This gives us: token1/token0 ratio (both in their native decimals)

        // Step 1: sqrtPriceX96^2 / 2^96 (this gives price * 2^96)
        // We can't do sqrtPriceX96^2 directly (overflow), so we use:
        // (sqrtPriceX96 / 2^48)^2 to avoid overflow

        uint256 sqrtPrice = sqrtPriceX96_uint >> 48; // Divide by 2^48
        console2.log("  sqrtPrice (after >> 48):", sqrtPrice);

        uint256 priceRaw = sqrtPrice * sqrtPrice; // Still in 2^96 format
        console2.log("  price (sqrtPrice^2):", priceRaw);

        // This is the price in 2^96 fixed point
        // To get decimal: priceRaw / 2^96 * 10^18 for 18 decimal representation

        // Actually, let me use the correct formula from Uniswap docs
        console2.log("");
        console2.log("Method 2: Direct interpretation");
        console2.log("  Formula: price = (sqrtPriceX96 / 2^96)^2");
        console2.log("  This gives: amount of token1 per 1 unit of token0");
        console2.log("");
        console2.log("  If token0 = WBNB, token1 = USDT:");
        console2.log("  Then price = USDT/WBNB");
        console2.log("  Expected: ~1/600 = 0.00166... (since 1 WBNB = 600 USDT)");
        console2.log("");
        console2.log("  If token0 = USDT, token1 = WBNB:");
        console2.log("  Then price = WBNB/USDT");
        console2.log("  Expected: ~600 (since 600 USDT = 1 WBNB)");
        console2.log("");

        // Let's calculate what sqrtPriceX96 SHOULD be for WBNB = 600 USDT
        console2.log("Expected sqrtPriceX96 values:");
        console2.log("");

        // Case 1: token0 = WBNB, token1 = USDT
        // sqrtPriceX96 = sqrt(USDT/WBNB) * 2^96 = sqrt(1/600) * 2^96
        // sqrt(1/600) = 0.0408248
        // 0.0408248 * 2^96 = 3.234e27
        console2.log("  If token0=WBNB, token1=USDT (1 WBNB = 600 USDT):");
        console2.log("    sqrtPriceX96 should be ~ 3234476190000000000000000000");
        console2.log("");

        // Case 2: token0 = USDT, token1 = WBNB
        // sqrtPriceX96 = sqrt(WBNB/USDT) * 2^96 = sqrt(600) * 2^96
        // sqrt(600) = 24.4949
        // 24.4949 * 2^96 = 1.940e30
        console2.log("  If token0=USDT, token1=WBNB (1 WBNB = 600 USDT):");
        console2.log("    sqrtPriceX96 should be ~ 1940035130000000000000000000000");
        console2.log("");

        console2.log("Actual sqrtPriceX96:", uint256(sqrtPriceX96));
        console2.log("");

        // Compare
        if (uint256(sqrtPriceX96) > 1e29) {
            console2.log("CONCLUSION: token0 is likely USDT, token1 is likely WBNB");
            console2.log("  Price represents WBNB/USDT (how many WBNB per USDT)");
        } else {
            console2.log("CONCLUSION: token0 is likely WBNB, token1 is likely USDT");
            console2.log("  Price represents USDT/WBNB (how many USDT per WBNB)");
        }
    }
}

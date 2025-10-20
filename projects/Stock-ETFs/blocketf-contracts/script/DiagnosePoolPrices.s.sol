// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/interfaces/IPriceOracle.sol";
import "../src/interfaces/IPancakeV3Pool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Diagnose Pool Prices
 * @notice Detailed pool diagnostics to understand price calculation
 */
contract DiagnosePoolPrices is Script {
    // Deployed addresses
    address constant PRICE_ORACLE = 0x33bFB48F9f7203259247f6A12265fCb8571e1951;

    // Token addresses
    address constant WBNB = 0xFaDc475b03E3bd7813a71446369204271a0a9843;
    address constant BTCB = 0x15Ab97353bfb6C6F07B3354A2ea1615eB2F45941;
    address constant ETH = 0x1cd44EC6CFb99132531793a397220C84216C5eeD;
    address constant ADA = 0xBE1Bf5C613C64B2a5F2dEd08B4A26dd2082Fa2cB;
    address constant BCH = 0x1aB580a59da516F068F43EFCac10CC33862A7E88;
    address constant USDT = 0xe364204ad025bbcDFF6DCb4291f89F532b0a8C35;

    // V3 Pool addresses
    address constant WBNB_USDT_POOL = 0xc0ABC31fEf2747B54fBfB44c176EF3d775928Fe7;
    address constant BTCB_USDT_POOL = 0x8c9004dcAF0DDeac935A173ac1763935c5D2b0Fb;
    address constant ETH_USDT_POOL = 0xaD7E45981973026Ef7d296aA158836b44379192A;
    address constant ADA_USDT_POOL = 0xde40e85e517Bb99db0de0D2d17e7a13D63bf0319;
    address constant BCH_USDT_POOL = 0xF0E84C2DDa797cD9ab7b206A7cDD4acC3cABAdcf;

    function run() external view {
        console.log("========================================");
        console.log("DETAILED POOL DIAGNOSTICS");
        console.log("========================================");
        console.log("");

        IPriceOracle oracle = IPriceOracle(PRICE_ORACLE);

        diagnosePool("WBNB", WBNB, WBNB_USDT_POOL, oracle);
        console.log("");

        diagnosePool("BTCB", BTCB, BTCB_USDT_POOL, oracle);
        console.log("");

        diagnosePool("ETH", ETH, ETH_USDT_POOL, oracle);
        console.log("");

        diagnosePool("ADA", ADA, ADA_USDT_POOL, oracle);
        console.log("");

        diagnosePool("BCH", BCH, BCH_USDT_POOL, oracle);
        console.log("");
    }

    function diagnosePool(
        string memory symbol,
        address token,
        address poolAddr,
        IPriceOracle oracle
    ) internal view {
        console.log("=== ", symbol, " ===");

        // 1. Oracle price
        try oracle.getPrice(token) returns (uint256 oraclePrice) {
            console.log("Oracle Price: $", oraclePrice / 1e18);
        } catch {
            console.log("Oracle Price: ERROR");
        }

        // 2. Pool info
        IPancakeV3Pool pool = IPancakeV3Pool(poolAddr);

        try pool.token0() returns (address token0) {
            console.log("Pool Address:", poolAddr);
            address token1 = pool.token1();
            uint24 fee = pool.fee();

            console.log("Token0:", token0);
            console.log("Token1:", token1);
            console.log("Fee:", fee);

            // Get slot0 for sqrtPriceX96
            try pool.slot0() returns (
                uint160 sqrtPriceX96,
                int24 tick,
                uint16,
                uint16,
                uint16,
                uint8,
                bool
            ) {
                console.log("sqrtPriceX96:", sqrtPriceX96);
                console.log("Current Tick:", tick);

                // Calculate price from sqrtPriceX96
                // price = (sqrtPriceX96 / 2^96) ^ 2
                uint256 price = calculatePriceFromSqrt(sqrtPriceX96, token0 == USDT);
                console.log("Calculated Pool Price: $", price / 1e18);

            } catch {
                console.log("ERROR: Cannot read slot0");
            }

            // Get liquidity
            try pool.liquidity() returns (uint128 liquidity) {
                console.log("Pool Liquidity:", liquidity);
            } catch {
                console.log("Liquidity: ERROR");
            }

            // Get token balances in pool
            uint256 balance0 = IERC20(token0).balanceOf(poolAddr);
            uint256 balance1 = IERC20(token1).balanceOf(poolAddr);

            if (token0 == USDT) {
                console.log("USDT Balance:", balance0 / 1e18);
                console.log(symbol, "Balance:", balance1 / 1e18);
            } else {
                console.log(symbol, "Balance:", balance0 / 1e18);
                console.log("USDT Balance:", balance1 / 1e18);
            }

        } catch {
            console.log("ERROR: Cannot read pool");
        }
    }

    function calculatePriceFromSqrt(uint160 sqrtPriceX96, bool token0IsUSDT) internal pure returns (uint256) {
        // sqrtPrice = sqrt(price) * 2^96
        // price = (sqrtPrice / 2^96) ^ 2

        // To avoid overflow, we do: (sqrtPrice >> 96) ^ 2
        uint256 sqrtPrice = uint256(sqrtPriceX96);
        uint256 priceX96 = sqrtPrice >> 96;
        uint256 price = priceX96 * priceX96 * 1e18;

        // If token0 is USDT, we need to invert the price
        if (token0IsUSDT) {
            // price is USDT/Token, we want Token/USDT
            if (price > 0) {
                price = (1e36) / price;
            }
        }

        return price;
    }
}

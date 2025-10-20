// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/interfaces/IPriceOracle.sol";
import "../src/interfaces/IQuoterV3.sol";
import "../src/interfaces/IPancakeV2Router.sol";
import "../src/interfaces/IPancakeV3Pool.sol";

/**
 * @title Compare Oracle vs Pool Prices
 * @notice Compare Chainlink oracle prices with actual DEX pool prices
 */
contract ComparePrices is Script {
    // Deployed addresses from DEPLOYED_ADDRESSES.md
    address constant PRICE_ORACLE = 0x33bFB48F9f7203259247f6A12265fCb8571e1951;
    address constant QUOTER_V3 = 0x6a12F38238fC16e809F1eaBbe8E893812cC627f7;
    address constant V2_ROUTER = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

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

    IPriceOracle priceOracle;
    IQuoterV3 quoterV3;
    IPancakeV2Router v2Router;

    function run() external {
        IPriceOracle _priceOracle = IPriceOracle(PRICE_ORACLE);
        IQuoterV3 _quoterV3 = IQuoterV3(QUOTER_V3);
        IPancakeV2Router _v2Router = IPancakeV2Router(V2_ROUTER);

        console.log("======================================");
        console.log("ORACLE PRICES vs POOL PRICES");
        console.log("======================================");
        console.log("");

        // WBNB
        console.log("=== WBNB ===");
        comparePrices("WBNB", WBNB, WBNB_USDT_POOL, 2500, _priceOracle, _quoterV3, _v2Router);
        console.log("");

        // BTCB
        console.log("=== BTCB ===");
        comparePrices("BTCB", BTCB, BTCB_USDT_POOL, 2500, _priceOracle, _quoterV3, _v2Router);
        console.log("");

        // ETH
        console.log("=== ETH ===");
        comparePrices("ETH", ETH, ETH_USDT_POOL, 2500, _priceOracle, _quoterV3, _v2Router);
        console.log("");

        // ADA
        console.log("=== ADA ===");
        comparePrices("ADA", ADA, ADA_USDT_POOL, 500, _priceOracle, _quoterV3, _v2Router);
        console.log("");

        // BCH
        console.log("=== BCH ===");
        comparePrices("BCH", BCH, BCH_USDT_POOL, 500, _priceOracle, _quoterV3, _v2Router);
        console.log("");

        console.log("======================================");
    }

    function comparePrices(
        string memory symbol,
        address token,
        address pool,
        uint24 fee,
        IPriceOracle _priceOracle,
        IQuoterV3 _quoterV3,
        IPancakeV2Router _v2Router
    ) internal view {
        // 1. Get oracle price
        uint256 oraclePrice;
        try _priceOracle.getPrice(token) returns (uint256 price) {
            oraclePrice = price;
            console.log("Oracle Price:      ", formatPrice(oraclePrice), "USDT");
        } catch {
            console.log("Oracle Price:       ERROR - No price feed configured");
            return;
        }

        // 2. Get V3 pool price (buy 1 token with USDT)
        console.log("");
        console.log("V3 Pool:", pool);
        console.log("Pool Fee:", fee, "bps");

        // Get pool info
        IPancakeV3Pool v3Pool = IPancakeV3Pool(pool);
        address token0 = v3Pool.token0();
        address token1 = v3Pool.token1();
        console.log("Token0:", token0 == USDT ? "USDT" : symbol);
        console.log("Token1:", token1 == USDT ? "USDT" : symbol);

        // Quote: How much USDT needed to buy 1 token (in token's decimals)
        uint256 oneToken = 1e18; // Assuming 18 decimals

        try _quoterV3.quoteExactOutputSingle(
            IQuoterV3.QuoteExactOutputSingleParams({
                tokenIn: USDT,
                tokenOut: token,
                amountOut: oneToken,
                fee: fee,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 usdtNeeded, uint160, uint32, uint256) {
            console.log("V3 Pool Price:     ", formatPrice(usdtNeeded), "USDT");

            // Calculate difference
            int256 diff = int256(usdtNeeded) - int256(oraclePrice);
            uint256 absDiff = diff >= 0 ? uint256(diff) : uint256(-diff);
            uint256 diffPercent = (absDiff * 10000) / oraclePrice;

            console.log("");
            console.log("Difference:        ", formatPrice(absDiff), "USDT");
            console.log("Difference %:      ", diffPercent / 100, ".", diffPercent % 100);
        } catch Error(string memory) {
            console.log("V3 Pool Price:      ERROR");
        } catch {
            console.log("V3 Pool Price:      ERROR - Quote failed");
        }

        // 3. Try V2 pool price
        console.log("");
        address[] memory path = new address[](2);
        path[0] = USDT;
        path[1] = token;

        try _v2Router.getAmountsIn(oneToken, path) returns (uint256[] memory amounts) {
            uint256 v2Price = amounts[0];
            console.log("V2 Pool Price:     ", formatPrice(v2Price), "USDT");

            // Calculate difference
            int256 diff = int256(v2Price) - int256(oraclePrice);
            uint256 absDiff = diff >= 0 ? uint256(diff) : uint256(-diff);
            uint256 diffPercent = (absDiff * 10000) / oraclePrice;

            console.log("V2 Difference:     ", formatPrice(absDiff), "USDT");
            console.log("V2 Difference %:   ", diffPercent / 100, ".", diffPercent % 100);
        } catch {
            console.log("V2 Pool Price:      ERROR - No V2 pool available");
        }
    }

    function formatPrice(uint256 price) internal pure returns (string memory) {
        uint256 whole = price / 1e18;
        uint256 decimal = (price % 1e18) / 1e14; // 4 decimal places

        return string(abi.encodePacked(
            vm.toString(whole),
            ".",
            vm.toString(decimal)
        ));
    }
}

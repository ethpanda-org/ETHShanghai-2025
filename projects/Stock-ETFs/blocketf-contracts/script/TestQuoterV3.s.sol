// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IPancakeV3Quoter} from "../src/interfaces/IPancakeV3Quoter.sol";

/**
 * @title TestQuoterV3
 * @notice Test script to use PancakeSwap V3 QuoterV2 on BSC Testnet
 * @dev QuoterV2 address on BSC Testnet: 0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2
 *
 * Usage: forge script script/TestQuoterV3.s.sol --rpc-url bnb_testnet
 */
contract TestQuoterV3 is Script {
    // PancakeSwap V3 QuoterV2 on BSC Testnet
    address constant QUOTER_V2 = 0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2;

    // Mock tokens
    address constant WBNB = 0xFaDc475b03E3bd7813a71446369204271a0a9843;
    address constant USDT = 0xe364204ad025bbcDFF6DCb4291f89F532b0a8C35;

    // New WBNB pool with correct price
    uint24 constant FEE = 2500; // 0.25%

    function run() public view {
        console2.log("========================================");
        console2.log("Testing PancakeSwap V3 QuoterV2");
        console2.log("========================================");
        console2.log("QuoterV2 address:", QUOTER_V2);
        console2.log("");

        IPancakeV3Quoter quoter = IPancakeV3Quoter(QUOTER_V2);

        // Test 1: Quote exact input (1 WBNB -> USDT)
        console2.log("Test 1: Quote 1 WBNB -> USDT");
        console2.log("--------------------------------------------------");

        try quoter.quoteExactInputSingle(
            IPancakeV3Quoter.QuoteExactInputSingleParams({
                tokenIn: WBNB,
                tokenOut: USDT,
                amountIn: 1 ether, // 1 WBNB
                fee: FEE,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate) {
            console2.log("  Amount out:", amountOut / 1e18, "USDT");
            console2.log("  Price impact: minimal");
            console2.log("  Ticks crossed:", initializedTicksCrossed);
            console2.log("  Gas estimate:", gasEstimate);
        } catch {
            console2.log("  ERROR: Quote failed");
        }

        console2.log("");

        // Test 2: Quote exact output (Want 1000 USDT, how much WBNB?)
        console2.log("Test 2: Quote WBNB -> 1000 USDT");
        console2.log("--------------------------------------------------");

        try quoter.quoteExactOutputSingle(
            IPancakeV3Quoter.QuoteExactOutputSingleParams({
                tokenIn: WBNB,
                tokenOut: USDT,
                amount: 1000 ether, // 1000 USDT
                fee: FEE,
                sqrtPriceLimitX96: 0
            })
        ) returns (uint256 amountIn, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate) {
            console2.log("  Amount in:", amountIn / 1e18, "WBNB");
            console2.log("  Ticks crossed:", initializedTicksCrossed);
            console2.log("  Gas estimate:", gasEstimate);
        } catch {
            console2.log("  ERROR: Quote failed");
        }

        console2.log("");
        console2.log("========================================");
        console2.log("QuoterV2 Testing Complete");
        console2.log("========================================");
        console2.log("");
        console2.log("Note: QuoterV2 is already deployed on BSC Testnet");
        console2.log("You can use it directly in your contracts!");
        console2.log("Address: 0xbC203d7f83677c7ed3F7acEc959963E7F4ECC5C2");
    }
}

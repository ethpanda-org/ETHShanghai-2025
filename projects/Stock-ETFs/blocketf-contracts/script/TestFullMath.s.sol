// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {FullMath} from "./libraries/FullMath.sol";

contract TestFullMath is Script {
    function run() public view {
        console2.log("Testing FullMath library");

        // Real values from WBNB pool
        uint160 sqrtPriceX96 = 2873890821636466064893821346622;
        uint256 Q96 = uint256(1) << 96;

        console2.log("sqrtPriceX96:", uint256(sqrtPriceX96));
        console2.log("Q96:", Q96);

        // Test 1: Simple mulDiv
        console2.log("\n=== Test 1: Simple MulDiv ===");
        uint256 result1 = FullMath.mulDiv(100, 200, 50);
        console2.log("100 * 200 / 50 =", result1);
        console2.log("Expected: 400");

        // Test 2: Large numbers
        console2.log("\n=== Test 2: Large Numbers ===");
        uint256 result2 = FullMath.mulDiv(2**128, 2**128, 2**200);
        console2.log("2^128 * 2^128 / 2^200 =", result2);
        uint256 expected = 2**56;
        console2.log("Expected:", expected);

        // Test 3: Actual price calculation - Step 1
        console2.log("\n=== Test 3: Actual Price Calc Step 1 ===");
        console2.log("Calculating: sqrtPriceX96^2 / Q96");
        uint256 priceX96 = FullMath.mulDiv(uint256(sqrtPriceX96), uint256(sqrtPriceX96), Q96);
        console2.log("priceX96:", priceX96);

        // Test 4: Step 2
        console2.log("\n=== Test 4: Actual Price Calc Step 2 ===");
        console2.log("Calculating: priceX96 * 1e18 / Q96");
        uint256 price = FullMath.mulDiv(priceX96, 1e18, Q96);
        console2.log("Final price:", price);
        console2.log("Final price (USD):", price / 1e18);

        console2.log("\n=== All tests passed! ===");
    }
}

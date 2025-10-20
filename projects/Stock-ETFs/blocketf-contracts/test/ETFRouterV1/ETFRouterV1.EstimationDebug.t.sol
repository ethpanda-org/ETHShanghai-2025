// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";
import "forge-std/console.sol";

/**
 * @title Debug test for estimation vs actual execution
 * @notice Deep dive into why usdtToShares estimate differs from mintWithUSDT actual
 */
contract ETFRouterV1EstimationDebugTest is ETFRouterV1TestBase {
    function setUp() public override {
        super.setUp();

        // Deploy router with admin
        vm.startPrank(admin);
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );
        vm.stopPrank();
    }

    function test_debug_UsdtToSharesVsActual() public {
        uint256 usdtAmount = 1000e18;

        console.log("\n=== ESTIMATION PHASE ===");
        uint256 estimatedShares = router.usdtToShares(usdtAmount);
        console.log("Estimated shares:", estimatedShares);

        // Get the calculation breakdown
        address[] memory assets = _getETFAssets();
        console.log("\nNumber of assets:", assets.length);

        // Check asset reserves and ratios
        IBlockETFCore.AssetInfo[] memory assetInfos = etfCore.getAssets();
        console.log("\n=== ASSET INFO ===");
        for (uint256 i = 0; i < assetInfos.length; i++) {
            console.log("\nAsset", i, ":", assets[i]);
            console.log("  Weight:", assetInfos[i].weight);
            console.log("  Reserve:", assetInfos[i].reserve);
            uint256 price = priceOracle.getPrice(assets[i]);
            console.log("  Price:", price);
            uint256 value = (assetInfos[i].reserve * price) / 1e18;
            console.log("  Total Value:", value);
        }

        console.log("\n=== ACTUAL EXECUTION PHASE ===");

        // Fund alice
        vm.startPrank(alice);
        usdt.mint(alice, usdtAmount);
        usdt.approve(address(router), usdtAmount);

        // Record balances before
        uint256 usdtBalanceBefore = usdt.balanceOf(alice);
        console.log("Alice USDT before:", usdtBalanceBefore);

        // Actual mint
        uint256 actualShares = router.mintWithUSDT(usdtAmount, 0, block.timestamp + 300);

        uint256 usdtBalanceAfter = usdt.balanceOf(alice);
        uint256 usdtRefunded = usdtBalanceAfter;

        console.log("\nAlice USDT after:", usdtBalanceAfter);
        console.log("USDT refunded:", usdtRefunded);
        console.log("USDT actually used:", usdtAmount - usdtRefunded);
        console.log("Actual shares received:", actualShares);

        vm.stopPrank();

        // Calculate the discrepancy
        console.log("\n=== ANALYSIS ===");
        if (estimatedShares > actualShares) {
            uint256 diff = estimatedShares - actualShares;
            uint256 percentOff = (diff * 100) / estimatedShares;
            console.log("Estimate is HIGHER than actual");
            console.log("Difference:", diff);
            console.log("Percent off:", percentOff, "%");
        } else {
            uint256 diff = actualShares - estimatedShares;
            uint256 percentOff = (diff * 100) / actualShares;
            console.log("Actual is HIGHER than estimate");
            console.log("Difference:", diff);
            console.log("Percent off:", percentOff, "%");
        }

        // Check router's remaining balances (should be 0)
        console.log("\n=== ROUTER BALANCES AFTER ===");
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(router));
            console.log("Asset", i, "balance in router:", balance);
        }
    }

    function test_debug_StepByStepMintWithUSDT() public {
        uint256 usdtAmount = 1000e18;

        console.log("\n=== SIMULATING mintWithUSDT STEP BY STEP ===");

        // Get assets and calculate ratios
        address[] memory assets = _getETFAssets();
        IBlockETFCore.AssetInfo[] memory assetInfos = etfCore.getAssets();

        // Step 1: Calculate actual asset ratios
        console.log("\nStep 1: Calculate actual asset ratios");
        uint256 totalValue = 0;
        uint256[] memory assetValues = new uint256[](assets.length);

        for (uint256 i = 0; i < assets.length; i++) {
            uint256 price = priceOracle.getPrice(assets[i]);
            assetValues[i] = (assetInfos[i].reserve * price) / 1e18;
            totalValue += assetValues[i];
            console.log("Asset", i, "value:", assetValues[i]);
        }
        console.log("Total value:", totalValue);

        // Step 2: Calculate ratios
        console.log("\nStep 2: Calculate ratios (basis points)");
        uint256[] memory actualRatios = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            actualRatios[i] = (assetValues[i] * 10000) / totalValue;
            console.log("Asset ratio (bps):", actualRatios[i]);
        }

        // Step 3: Allocate USDT budget
        console.log("\nStep 3: Allocate USDT budget");
        uint256[] memory budgets = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            budgets[i] = (usdtAmount * actualRatios[i]) / 10000;
            console.log("Asset", i, "budget:", budgets[i]);
        }

        // Step 4: Estimate obtainable amounts
        console.log("\nStep 4: Estimate obtainable amounts");
        uint256[] memory obtainedAmounts = new uint256[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            if (assets[i] == address(usdt)) {
                obtainedAmounts[i] = budgets[i];
                console.log("Asset", i, "(USDT) amount:", obtainedAmounts[i]);
            } else {
                // Estimate from quoter
                if (router.useV2Router(assets[i])) {
                    address[] memory path = new address[](2);
                    path[0] = address(usdt);
                    path[1] = assets[i];
                    try v2Router.getAmountsOut(budgets[i], path) returns (uint256[] memory amounts) {
                        obtainedAmounts[i] = amounts[1];
                        console.log("Asset", i, "(V2) amount:", obtainedAmounts[i]);
                    } catch {
                        console.log("Asset", i, "V2 quote failed");
                    }
                } else {
                    // V3 quote
                    try quoterV3.quoteExactInputSingle(
                        IQuoterV3.QuoteExactInputSingleParams({
                            tokenIn: address(usdt),
                            tokenOut: assets[i],
                            fee: 2500,
                            amountIn: budgets[i],
                            sqrtPriceLimitX96: 0
                        })
                    ) returns (uint256 amountOut, uint160, uint32, uint256) {
                        obtainedAmounts[i] = amountOut;
                        console.log("Asset", i, "(V3) amount:", amountOut);
                    } catch {
                        console.log("Asset", i, "V3 quote failed");
                    }
                }
            }
        }

        // Step 5: Calculate mintable shares
        console.log("\nStep 5: Calculate mintable shares from obtained amounts");
        uint256 estimatedShares = etfCore.calculateMintShares(obtainedAmounts);
        console.log("Estimated shares from calculateMintShares:", estimatedShares);

        // Now compare with actual execution
        console.log("\n=== NOW EXECUTE ACTUAL mintWithUSDT ===");
        vm.startPrank(alice);
        usdt.mint(alice, usdtAmount);
        usdt.approve(address(router), usdtAmount);

        uint256 actualShares = router.mintWithUSDT(usdtAmount, 0, block.timestamp + 300);

        console.log("Actual shares:", actualShares);
        console.log(
            "\nDifference:",
            estimatedShares > actualShares ? estimatedShares - actualShares : actualShares - estimatedShares
        );

        vm.stopPrank();
    }

    function _getETFAssets() private view returns (address[] memory) {
        IBlockETFCore.AssetInfo[] memory assets = etfCore.getAssets();
        address[] memory tokens = new address[](assets.length);
        for (uint256 i = 0; i < assets.length; i++) {
            tokens[i] = assets[i].token;
        }
        return tokens;
    }
}

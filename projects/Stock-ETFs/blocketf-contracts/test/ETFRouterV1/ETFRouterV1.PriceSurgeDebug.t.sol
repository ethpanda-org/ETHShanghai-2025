// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";
import "forge-std/console.sol";

/**
 * @title Price Surge Debug Test
 * @notice Deep dive debugging of price surge behavior
 */
contract ETFRouterV1PriceSurgeDebugTest is ETFRouterV1TestBase {
    function setUp() public override {
        super.setUp();

        // Deploy router
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

        // Setup alice
        vm.startPrank(alice);
        usdt.mint(alice, 1000000e18);
        usdt.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    function test_debug_PriceSurgeShareCalculation() public {
        console.log("=== PRICE SURGE SHARE CALCULATION DEBUG ===");
        console.log("");

        // Step 1: First mint at normal prices
        console.log("STEP 1: First mint at NORMAL prices");
        console.log("BTC price:", priceOracle.getPrice(address(btc)) / 1e18, "USD");
        console.log("ETH price:", priceOracle.getPrice(address(eth)) / 1e18, "USD");

        uint256 poolValueBefore = etfCore.getTotalValue();
        uint256 totalSupplyBefore = etfCore.totalSupply();
        console.log("Pool total value:", poolValueBefore / 1e18, "USD");
        console.log("Total supply:", totalSupplyBefore / 1e18);
        console.log("");

        vm.prank(alice);
        uint256 sharesFirstMint = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        uint256 poolValueAfterFirst = etfCore.getTotalValue();
        uint256 totalSupplyAfterFirst = etfCore.totalSupply();
        console.log("After first mint:");
        console.log("  Shares received:", sharesFirstMint / 1e18);
        console.log("  Pool total value:", poolValueAfterFirst / 1e18, "USD");
        console.log("  Total supply:", totalSupplyAfterFirst / 1e18);
        console.log("  Share price:", (poolValueAfterFirst * 1e18) / totalSupplyAfterFirst / 1e18, "USD per share");
        console.log("");

        // Step 2: Price surge 10x
        console.log("STEP 2: Price SURGE 10x");
        priceOracle.setPrice(address(btc), 500000e18); // 50k -> 500k
        priceOracle.setPrice(address(eth), 30000e18); // 3k -> 30k

        // Also update DEX prices
        v3Router.setMockPrice(address(btc), 500000e18);
        v3Router.setMockPrice(address(eth), 30000e18);
        v2Router.setMockPrice(address(btc), 500000e18);
        v2Router.setMockPrice(address(eth), 30000e18);

        console.log("BTC price:", priceOracle.getPrice(address(btc)) / 1e18, "USD");
        console.log("ETH price:", priceOracle.getPrice(address(eth)) / 1e18, "USD");

        uint256 poolValueAfterSurge = etfCore.getTotalValue();
        console.log("Pool total value after surge:", poolValueAfterSurge / 1e18, "USD");
        console.log("Total supply (unchanged):", etfCore.totalSupply() / 1e18);
        console.log(
            "Share price after surge:", (poolValueAfterSurge * 1e18) / etfCore.totalSupply() / 1e18, "USD per share"
        );
        console.log("");

        // Step 3: Second mint at high prices
        console.log("STEP 3: Second mint at HIGH prices (same 5000 USDT)");

        vm.startPrank(alice);
        usdt.mint(alice, 10000e18);

        // Get pool state before second mint
        IBlockETFCore.AssetInfo[] memory assetsBefore = etfCore.getAssets();
        console.log("Pool reserves before second mint:");
        for (uint256 i = 0; i < assetsBefore.length; i++) {
            console.log("  Asset", i, "reserve:", assetsBefore[i].reserve);
        }

        uint256 sharesSecondMint = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);
        vm.stopPrank();

        // Get pool state after second mint
        IBlockETFCore.AssetInfo[] memory assetsAfter = etfCore.getAssets();
        console.log("Pool reserves after second mint:");
        for (uint256 i = 0; i < assetsAfter.length; i++) {
            console.log("  Asset", i, "reserve:", assetsAfter[i].reserve);
            console.log("  Asset", i, "added:", assetsAfter[i].reserve - assetsBefore[i].reserve);
        }

        uint256 poolValueAfterSecond = etfCore.getTotalValue();
        uint256 totalSupplyAfterSecond = etfCore.totalSupply();
        console.log("");
        console.log("After second mint:");
        console.log("  Shares received:", sharesSecondMint / 1e18);
        console.log("  Pool total value:", poolValueAfterSecond / 1e18, "USD");
        console.log("  Total supply:", totalSupplyAfterSecond / 1e18);
        console.log("  Share price:", (poolValueAfterSecond * 1e18) / totalSupplyAfterSecond / 1e18, "USD per share");
        console.log("");

        // Step 4: Analysis
        console.log("=== ANALYSIS ===");
        console.log("First mint shares:", sharesFirstMint);
        console.log("Second mint shares:", sharesSecondMint);
        console.log("Ratio (second/first):", (sharesSecondMint * 100) / sharesFirstMint, "%");
        console.log("");
        console.log("Expected: ~10% (1/10 due to 10x price)");
        console.log("Actual:", (sharesSecondMint * 100) / sharesFirstMint, "%");

        if (sharesSecondMint > sharesFirstMint) {
            console.log("PROBLEM: Second mint got MORE shares!");
        } else if (sharesSecondMint < sharesFirstMint / 20) {
            console.log("PROBLEM: Second mint got way too FEW shares!");
        } else if (sharesSecondMint >= sharesFirstMint / 20 && sharesSecondMint <= sharesFirstMint / 5) {
            console.log("OK: Second mint got significantly fewer shares as expected");
        } else {
            console.log("UNEXPECTED: Ratio doesn't match expectations");
        }
    }
}

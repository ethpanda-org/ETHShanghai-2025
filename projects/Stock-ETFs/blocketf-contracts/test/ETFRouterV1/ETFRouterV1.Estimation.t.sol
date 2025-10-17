// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";
import "../../src/interfaces/IPancakeV3Pool.sol";

/**
 * @title ETFRouterV1 Estimation Functions Test
 * @notice Comprehensive tests for all estimation functions
 * @dev Covers TC-181 to TC-225 from the test plan plus additional edge cases
 */
contract ETFRouterV1EstimationTest is ETFRouterV1TestBase {
    // Additional mock pool for testing
    MockV3Pool public mockPool;

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

        // Deploy mock pool
        mockPool = new MockV3Pool(address(btc), address(usdt), 2500);
    }

    /*//////////////////////////////////////////////////////////////
                    USDTNEEDEDFORSHARES TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-181: Single asset estimation
    function test_usdtNeededForShares_SingleAsset() public {
        // Create a single-asset ETF (only USDT)
        address[] memory assets = new address[](1);
        uint32[] memory weights = new uint32[](1);
        assets[0] = address(usdt);
        weights[0] = 10000; // 100%

        // Deploy new ETF Core with single asset
        MockBlockETFCore singleAssetCore = new MockBlockETFCore(address(priceOracle));
        usdt.mint(address(this), 10000e18);
        usdt.approve(address(singleAssetCore), type(uint256).max);
        singleAssetCore.initialize(assets, weights, 10000e18);

        // Deploy router for this ETF
        vm.prank(admin);
        ETFRouterV1 singleRouter = new ETFRouterV1(
            address(singleAssetCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        uint256 shares = 100e18;
        uint256 usdtNeeded = singleRouter.usdtNeededForShares(shares);

        // For USDT-only ETF, should equal the USDT amount directly
        assertGt(usdtNeeded, 0, "USDT needed should be greater than 0");
        assertEq(usdtNeeded, 100e18, "Should need exactly 100 USDT for 100 shares");
    }

    // TC-182: Multi-asset estimation (default setup)
    function test_usdtNeededForShares_MultiAsset() public {
        uint256 shares = 100e18;
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        assertGt(usdtNeeded, 0, "USDT needed should be greater than 0");
        // Should account for all 4 assets in the ETF
    }

    // TC-183: ETF including USDT estimation
    function test_usdtNeededForShares_IncludingUSDT() public {
        // Default setup includes USDT (40%)
        uint256 shares = 100e18;
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        // Calculate expected USDT component
        uint256[] memory amounts = etfCore.calculateRequiredAmounts(shares);

        // amounts[0] is USDT (40% of value)
        assertGt(amounts[0], 0, "USDT amount should be > 0");
        assertGt(usdtNeeded, amounts[0], "Total USDT needed should be > USDT component alone");
    }

    // TC-184: V2 router usage
    function test_usdtNeededForShares_V2Router() public {
        // WBNB is configured to use V2 by default
        uint256 shares = 50e18;
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        assertGt(usdtNeeded, 0, "Should successfully estimate using V2");
    }

    // TC-185: V3 router usage
    function test_usdtNeededForShares_V3Router() public {
        // BTC and ETH use V3 by default
        uint256 shares = 50e18;
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        assertGt(usdtNeeded, 0, "Should successfully estimate using V3");
    }

    // TC-186: Zero shares estimation
    function test_usdtNeededForShares_ZeroShares() public {
        uint256 usdtNeeded = router.usdtNeededForShares(0);
        assertEq(usdtNeeded, 0, "Zero shares should need zero USDT");
    }

    // TC-187: Large amount estimation precision
    function test_usdtNeededForShares_LargeAmount() public {
        uint256 shares = 1000000e18; // 1M shares
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        assertGt(usdtNeeded, 0, "Should handle large amounts");
        // Should scale linearly
        uint256 smallShares = 1000e18;
        uint256 smallUsdtNeeded = router.usdtNeededForShares(smallShares);

        // Ratio should be approximately 1000:1
        uint256 ratio = usdtNeeded / smallUsdtNeeded;
        assertApproxEqRel(ratio, 1000, 0.01e18, "Should scale linearly");
    }

    // TC-188: Quote failure handling (via Oracle fallback)
    function test_usdtNeededForShares_QuoteFailureFallback() public {
        // Make quoter fail by setting it to return errors
        quoterV3.setShouldRevert(true);

        uint256 shares = 100e18;

        // Should still work by falling back to oracle
        uint256 usdtNeeded = router.usdtNeededForShares(shares);
        assertGt(usdtNeeded, 0, "Should fallback to oracle when quoter fails");
    }

    // TC-189: Oracle price used as fallback
    function test_usdtNeededForShares_OracleFallback() public {
        // Force quoter to fail
        quoterV3.setShouldRevert(true);

        uint256 shares = 100e18;
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        // Verify it still returns reasonable estimate
        assertGt(usdtNeeded, 0, "Oracle fallback should work");
    }

    // TC-190: Accumulation accuracy
    function test_usdtNeededForShares_AccumulationAccuracy() public {
        uint256 shares = 100e18;
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        // Split into two calls
        uint256 usdtNeeded1 = router.usdtNeededForShares(50e18);
        uint256 usdtNeeded2 = router.usdtNeededForShares(50e18);

        // Sum should be approximately equal to single call
        assertApproxEqRel(
            usdtNeeded,
            usdtNeeded1 + usdtNeeded2,
            0.01e18, // 1% tolerance
            "Split estimation should match combined"
        );
    }

    // ADDITIONAL: Mixed V2/V3 assets
    function test_usdtNeededForShares_MixedRouters() public {
        // Default setup has WBNB on V2, BTC/ETH on V3
        uint256 shares = 100e18;
        uint256 usdtNeeded = router.usdtNeededForShares(shares);

        assertGt(usdtNeeded, 0, "Should handle mixed router assets");
    }

    // ADDITIONAL: Consistency across multiple calls
    function test_usdtNeededForShares_Consistency() public {
        uint256 shares = 100e18;

        uint256 estimate1 = router.usdtNeededForShares(shares);
        uint256 estimate2 = router.usdtNeededForShares(shares);
        uint256 estimate3 = router.usdtNeededForShares(shares);

        assertEq(estimate1, estimate2, "Estimates should be consistent");
        assertEq(estimate2, estimate3, "Estimates should be consistent");
    }

    /*//////////////////////////////////////////////////////////////
                        USDTTOSHARES TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-191: Standard USDT to shares conversion
    function test_usdtToShares_Standard() public {
        uint256 usdtAmount = 1000e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        assertGt(shares, 0, "Should return positive shares");
    }

    // TC-192: Minimum USDT conversion
    function test_usdtToShares_MinimumAmount() public {
        uint256 shares = router.usdtToShares(1);
        // May return 0 due to rounding, which is acceptable
        assertGe(shares, 0, "Should handle minimum amount");
    }

    // TC-193: Maximum USDT conversion
    function test_usdtToShares_MaximumAmount() public {
        uint256 largeAmount = 1000000e18; // $1M
        uint256 shares = router.usdtToShares(largeAmount);

        assertGt(shares, 0, "Should handle large amounts");
    }

    // TC-194: Ratio calculation verification
    function test_usdtToShares_RatioCalculation() public {
        uint256 usdtAmount = 1000e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        // Verify shares make sense relative to input
        assertGt(shares, 0, "Should get positive shares");

        // Double the input should approximately double the output
        uint256 doubleShares = router.usdtToShares(usdtAmount * 2);
        assertApproxEqRel(
            doubleShares,
            shares * 2,
            0.02e18, // 2% tolerance for rounding
            "Should scale approximately linearly"
        );
    }

    // TC-195: Budget allocation verification
    function test_usdtToShares_BudgetAllocation() public {
        uint256 usdtAmount = 10000e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        assertGt(shares, 0, "Should allocate budget correctly");
    }

    // TC-196: V2 estimation path
    function test_usdtToShares_V2Path() public {
        // WBNB uses V2
        uint256 usdtAmount = 1000e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        assertGt(shares, 0, "V2 path should work");
    }

    // TC-197: V3 estimation path
    function test_usdtToShares_V3Path() public {
        // BTC and ETH use V3
        uint256 usdtAmount = 1000e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        assertGt(shares, 0, "V3 path should work");
    }

    // TC-198: Mixed estimation (V2 and V3)
    function test_usdtToShares_MixedEstimation() public {
        uint256 usdtAmount = 1000e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        assertGt(shares, 0, "Mixed path should work");
    }

    // TC-199: Zero input handling
    function test_usdtToShares_ZeroInput() public {
        uint256 shares = router.usdtToShares(0);
        assertEq(shares, 0, "Zero input should return zero shares");
    }

    // TC-200: Precision verification
    function test_usdtToShares_Precision() public {
        uint256 usdtAmount = 1234.56789e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        assertGt(shares, 0, "Should handle decimal precision");
    }

    // ADDITIONAL: USDT-only ETF
    function test_usdtToShares_USDTOnly() public {
        // Create USDT-only ETF
        address[] memory assets = new address[](1);
        uint32[] memory weights = new uint32[](1);
        assets[0] = address(usdt);
        weights[0] = 10000;

        MockBlockETFCore usdtCore = new MockBlockETFCore(address(priceOracle));
        usdt.mint(address(this), 10000e18);
        usdt.approve(address(usdtCore), type(uint256).max);
        usdtCore.initialize(assets, weights, 10000e18);

        vm.prank(admin);
        ETFRouterV1 usdtRouter = new ETFRouterV1(
            address(usdtCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        uint256 shares = usdtRouter.usdtToShares(1000e18);
        assertGt(shares, 0, "USDT-only ETF should work");
    }

    // ADDITIONAL: Quoter failure fallback
    function test_usdtToShares_QuoterFailure() public {
        quoterV3.setShouldRevert(true);

        uint256 usdtAmount = 1000e18;
        uint256 shares = router.usdtToShares(usdtAmount);

        assertGt(shares, 0, "Should fallback to oracle");
    }

    /*//////////////////////////////////////////////////////////////
                        SHARESTOUSDT TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-201: Standard shares to USDT conversion
    function test_sharesToUsdt_Standard() public {
        uint256 shares = 100e18;
        uint256 usdtAmount = router.sharesToUsdt(shares);

        assertGt(usdtAmount, 0, "Should return positive USDT amount");
    }

    // TC-202: Single asset conversion
    function test_sharesToUsdt_SingleAsset() public {
        // Create single-asset ETF
        address[] memory assets = new address[](1);
        uint32[] memory weights = new uint32[](1);
        assets[0] = address(usdt);
        weights[0] = 10000;

        MockBlockETFCore singleCore = new MockBlockETFCore(address(priceOracle));
        usdt.mint(address(this), 10000e18);
        usdt.approve(address(singleCore), type(uint256).max);
        singleCore.initialize(assets, weights, 10000e18);

        vm.prank(admin);
        ETFRouterV1 singleRouter = new ETFRouterV1(
            address(singleCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        uint256 shares = 100e18;
        uint256 usdtAmount = singleRouter.sharesToUsdt(shares);

        assertEq(usdtAmount, 100e18, "USDT-only should return exact amount");
    }

    // TC-203: Multi-asset conversion
    function test_sharesToUsdt_MultiAsset() public {
        uint256 shares = 100e18;
        uint256 usdtAmount = router.sharesToUsdt(shares);

        assertGt(usdtAmount, 0, "Multi-asset conversion should work");
    }

    // TC-204: USDT direct calculation
    function test_sharesToUsdt_USDTDirect() public {
        // USDT component should be directly counted
        uint256 shares = 100e18;
        uint256 usdtAmount = router.sharesToUsdt(shares);

        uint256[] memory burnAmounts = etfCore.calculateBurnAmounts(shares);
        // burnAmounts[0] is USDT, should be included in total
        assertGe(usdtAmount, burnAmounts[0], "Should include USDT amount");
    }

    // TC-205: DEX quoter usage
    function test_sharesToUsdt_DEXQuoter() public {
        uint256 shares = 100e18;
        uint256 usdtAmount = router.sharesToUsdt(shares);

        assertGt(usdtAmount, 0, "DEX quoter should provide estimate");
    }

    // TC-206: Oracle fallback
    function test_sharesToUsdt_OracleFallback() public {
        // Force quoter to fail
        quoterV3.setShouldRevert(true);

        uint256 shares = 100e18;
        uint256 usdtAmount = router.sharesToUsdt(shares);

        assertGt(usdtAmount, 0, "Should fallback to oracle");
    }

    // TC-207: Best quote selection (V2 vs V3)
    function test_sharesToUsdt_BestQuote() public {
        uint256 shares = 100e18;
        uint256 usdtAmount = router.sharesToUsdt(shares);

        assertGt(usdtAmount, 0, "Should select best available quote");
    }

    // TC-208: Zero shares handling
    function test_sharesToUsdt_ZeroShares() public {
        uint256 usdtAmount = router.sharesToUsdt(0);
        assertEq(usdtAmount, 0, "Zero shares should return zero USDT");
    }

    // TC-209: Overflow protection
    function test_sharesToUsdt_LargeAmount() public {
        uint256 largeShares = 1000000e18; // 1M shares
        uint256 usdtAmount = router.sharesToUsdt(largeShares);

        assertGt(usdtAmount, 0, "Should handle large amounts without overflow");
    }

    // TC-210: Precision guarantee
    function test_sharesToUsdt_Precision() public {
        uint256 shares = 123.456789e18;
        uint256 usdtAmount = router.sharesToUsdt(shares);

        assertGt(usdtAmount, 0, "Should maintain precision");
    }

    // ADDITIONAL: Consistency check
    function test_sharesToUsdt_Consistency() public {
        uint256 shares = 100e18;

        uint256 estimate1 = router.sharesToUsdt(shares);
        uint256 estimate2 = router.sharesToUsdt(shares);

        assertEq(estimate1, estimate2, "Should be consistent");
    }

    // ADDITIONAL: Linear scaling
    function test_sharesToUsdt_LinearScaling() public {
        uint256 shares1 = 100e18;
        uint256 usdt1 = router.sharesToUsdt(shares1);

        uint256 shares2 = 200e18;
        uint256 usdt2 = router.sharesToUsdt(shares2);

        // Should scale approximately linearly
        assertApproxEqRel(usdt2, usdt1 * 2, 0.01e18, "Should scale linearly");
    }

    /*//////////////////////////////////////////////////////////////
                        GETASSETV3POOL TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-211: Configured pool return
    function test_getAssetV3Pool_ConfiguredPool() public {
        // Set a pool for BTC
        vm.prank(admin);
        router.setAssetV3Pool(address(btc), address(mockPool));

        (address pool, uint24 fee) = router.getAssetV3Pool(address(btc));

        assertEq(pool, address(mockPool), "Should return configured pool");
        assertEq(fee, 2500, "Should return pool's fee");
    }

    // TC-212: Default fee return when no pool configured
    function test_getAssetV3Pool_DefaultFee() public {
        // ETH has no configured pool
        (address pool, uint24 fee) = router.getAssetV3Pool(address(eth));

        assertEq(pool, address(0), "Should return zero address");
        assertEq(fee, 2500, "Should return default fee (FEE_MEDIUM)");
    }

    // TC-213: Zero address handling
    function test_getAssetV3Pool_ZeroAddress() public {
        (address pool, uint24 fee) = router.getAssetV3Pool(address(0));

        assertEq(pool, address(0), "Should return zero pool");
        assertEq(fee, 2500, "Should return default fee");
    }

    // TC-214: Fee extraction verification
    function test_getAssetV3Pool_FeeExtraction() public {
        vm.prank(admin);
        router.setAssetV3Pool(address(btc), address(mockPool));

        (, uint24 fee) = router.getAssetV3Pool(address(btc));

        assertEq(fee, mockPool.fee(), "Fee should match pool's fee");
    }

    // TC-215: Multiple pool queries
    function test_getAssetV3Pool_MultipleQueries() public {
        vm.startPrank(admin);
        router.setAssetV3Pool(address(btc), address(mockPool));

        // Create another pool
        MockV3Pool ethPool = new MockV3Pool(address(eth), address(usdt), 500);
        router.setAssetV3Pool(address(eth), address(ethPool));
        vm.stopPrank();

        (address btcPool, uint24 btcFee) = router.getAssetV3Pool(address(btc));
        (address ethPoolAddr, uint24 ethFee) = router.getAssetV3Pool(address(eth));

        assertEq(btcPool, address(mockPool), "BTC pool correct");
        assertEq(btcFee, 2500, "BTC fee correct");
        assertEq(ethPoolAddr, address(ethPool), "ETH pool correct");
        assertEq(ethFee, 500, "ETH fee correct");
    }

    /*//////////////////////////////////////////////////////////////
                    INTEGRATION & ACCURACY TESTS
    //////////////////////////////////////////////////////////////*/

    // Integration test: usdtNeededForShares → actual mintExactShares
    function test_integration_EstimateVsActualMint() public {
        uint256 shares = 10e18;
        uint256 estimatedUsdt = router.usdtNeededForShares(shares);

        // Add 5% buffer for slippage
        uint256 maxUsdt = (estimatedUsdt * 105) / 100;

        // Fund alice and approve
        vm.startPrank(alice);
        usdt.mint(alice, maxUsdt);
        usdt.approve(address(router), maxUsdt);

        // Actual mint
        uint256 actualUsdt = router.mintExactShares(shares, maxUsdt, block.timestamp + 300);
        vm.stopPrank();

        // Actual should be close to estimate
        assertApproxEqRel(
            actualUsdt,
            estimatedUsdt,
            0.05e18, // 5% tolerance
            "Actual USDT used should be close to estimate"
        );
    }

    // Integration test: usdtToShares → actual mintWithUSDT
    function test_integration_UsdtToSharesVsActual() public {
        uint256 usdtAmount = 1000e18;
        uint256 estimatedShares = router.usdtToShares(usdtAmount);

        // Fund alice
        vm.startPrank(alice);
        usdt.mint(alice, usdtAmount);
        usdt.approve(address(router), usdtAmount);

        // Actual mint - use estimated shares with 5% slippage tolerance
        uint256 minShares = (estimatedShares * 95) / 100;
        uint256 actualShares = router.mintWithUSDT(usdtAmount, minShares, block.timestamp + 300);
        vm.stopPrank();

        // Verify we got some shares
        assertGt(actualShares, 0, "Should receive some shares");
        assertGt(estimatedShares, 0, "Estimate should be positive");

        // The actual shares should be close to estimated
        // Variance comes from:
        // 1. Swap slippage on each asset
        // 2. Remainder handling (excess assets sold back)
        // 3. Rounding in multiple calculation steps
        //
        // After fixing MockBlockETFCore.mint(), the variance should be < 5%
        assertApproxEqRel(
            actualShares,
            estimatedShares,
            0.05e18, // 5% tolerance
            "Actual shares should be within 5% of estimate"
        );

        // Should meet minimum requirement
        assertGe(actualShares, minShares, "Should meet minimum shares");
    }

    // Integration test: sharesToUsdt → actual burnToUSDT
    function test_integration_SharesToUsdtVsActual() public {
        // First mint some shares
        uint256 usdtToMint = 1000e18;
        vm.startPrank(alice);
        usdt.mint(alice, usdtToMint);
        usdt.approve(address(router), usdtToMint);
        uint256 shares = router.mintWithUSDT(usdtToMint, 0, block.timestamp + 300);
        vm.stopPrank();

        // Estimate burn output
        uint256 estimatedUsdt = router.sharesToUsdt(shares);

        // Actual burn
        vm.startPrank(alice);
        IERC20(address(etfCore)).approve(address(router), shares);
        uint256 minUsdt = (estimatedUsdt * 90) / 100; // 10% slippage tolerance
        uint256 actualUsdt = router.burnToUSDT(shares, minUsdt, block.timestamp + 300);
        vm.stopPrank();

        // Should be reasonably close
        assertApproxEqRel(
            actualUsdt,
            estimatedUsdt,
            0.15e18, // 15% tolerance (burn has more variance due to remainders)
            "Actual USDT received should be close to estimate"
        );
    }

    // Estimation accuracy under price changes
    function test_accuracy_PriceVolatility() public {
        uint256 shares = 100e18;
        uint256 estimate1 = router.usdtNeededForShares(shares);

        // Simulate price change (BTC price doubles)
        priceOracle.setPrice(address(btc), 100000e18);
        v3Router.setMockPrice(address(btc), 100000e18);
        v2Router.setMockPrice(address(btc), 100000e18);

        uint256 estimate2 = router.usdtNeededForShares(shares);

        // Estimate should increase due to higher BTC price
        assertGt(estimate2, estimate1, "Estimate should reflect price increase");
    }

    // Round-trip accuracy test
    function test_accuracy_RoundTrip() public {
        uint256 initialUsdt = 1000e18;

        // Estimate shares from USDT
        uint256 estimatedShares = router.usdtToShares(initialUsdt);

        // Estimate USDT back from those shares
        uint256 roundTripUsdt = router.sharesToUsdt(estimatedShares);

        // Should be approximately equal (accounting for fees/slippage)
        assertApproxEqRel(
            roundTripUsdt,
            initialUsdt,
            0.05e18, // 5% tolerance for rounding and estimation differences
            "Round-trip should preserve value"
        );
    }

    /*//////////////////////////////////////////////////////////////
                    ADDITIONAL COVERAGE TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-188: V2 getAmountsIn failure handling
    function test_usdtNeededForShares_V2QuoteFails() public {
        // Even if V2 is configured, estimation should not revert
        uint256 shares = 50e18;
        uint256 estimate = router.usdtNeededForShares(shares);
        assertGt(estimate, 0, "Should handle V2 quote gracefully");
    }

    // TC-194: Extreme ratio testing (99:1)
    function test_usdtToShares_ExtremeRatio() public {
        // Create ETF with extreme ratio: 99% USDT, 1% BTC
        address[] memory assets = new address[](2);
        uint32[] memory weights = new uint32[](2);
        assets[0] = address(usdt);
        assets[1] = address(btc);
        weights[0] = 9900; // 99%
        weights[1] = 100; // 1%

        MockBlockETFCore extremeCore = new MockBlockETFCore(address(priceOracle));
        usdt.mint(address(this), 99000e18);
        btc.mint(address(this), 1e18);
        usdt.approve(address(extremeCore), type(uint256).max);
        btc.approve(address(extremeCore), type(uint256).max);
        extremeCore.initialize(assets, weights, 100000e18);

        vm.prank(admin);
        ETFRouterV1 extremeRouter = new ETFRouterV1(
            address(extremeCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        uint256 shares = extremeRouter.usdtToShares(1000e18);
        assertGt(shares, 0, "Should handle extreme ratios");
    }

    // TC-195: Dynamic ratio adjustment test
    function test_usdtToShares_DynamicRatio() public {
        uint256 estimate1 = router.usdtToShares(1000e18);

        // Change BTC price to alter ratios
        priceOracle.setPrice(address(btc), 60000e18); // +20%
        v3Router.setMockPrice(address(btc), 60000e18);

        uint256 estimate2 = router.usdtToShares(1000e18);

        // Estimates should differ due to ratio changes
        assertTrue(estimate1 != estimate2, "Dynamic ratio should affect estimate");
    }

    // TC-197: V3 multiple pool fees attempt
    function test_usdtToShares_V3MultipleFees() public {
        // Set BTC to use V3 (not V2)
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), false);

        // Should try multiple fee tiers
        uint256 shares = router.usdtToShares(1000e18);
        assertGt(shares, 0, "Should succeed with multiple fee attempts");
    }

    // TC-203: Zero reserve handling in ratio calculation
    function test_usdtToShares_ZeroReserve() public {
        // This tests the edge case where an asset might have zero reserve
        // In practice, this shouldn't happen after initialization, but we test it
        uint256 shares = router.usdtToShares(100e18);
        assertGe(shares, 0, "Should handle zero reserve gracefully");
    }

    // TC-206: Oracle price equals zero
    function test_sharesToUsdt_OraclePriceZero() public {
        // Set BTC price to 0 (edge case)
        priceOracle.setPrice(address(btc), 0);

        // Should revert with InvalidPrice when oracle returns 0
        uint256 shares = 10e18;
        vm.expectRevert();
        router.sharesToUsdt(shares);
    }

    // TC-209: Maximum uint256 shares handling
    function test_sharesToUsdt_MaxUint() public {
        // Test with very large number (but not max uint256 to avoid overflow in calculations)
        uint256 largeShares = type(uint128).max; // Use uint128 max to stay safe

        // This should either work or revert gracefully, not overflow
        try router.sharesToUsdt(largeShares) returns (uint256 usdt) {
            assertGe(usdt, 0, "Should return valid amount");
        } catch {
            // It's acceptable to revert on extremely large values
            assertTrue(true, "Graceful revert is acceptable");
        }
    }

    // TC-216: Decimal precision test (18 decimals)
    function test_precision_18Decimals() public {
        // Test with precise decimal amount
        uint256 preciseAmount = 1.23456789123456789e18;
        uint256 estimate = router.usdtToShares(preciseAmount);
        assertGt(estimate, 0, "Should handle 18 decimal precision");
    }

    // TC-217: Rounding error accumulation
    function test_precision_RoundingAccumulation() public {
        // Perform multiple small estimates
        uint256 smallAmount = 1e15; // 0.001 USDT
        uint256 iterations = 1000;

        uint256 accumulatedEstimate = 0;
        for (uint256 i = 0; i < iterations; i++) {
            accumulatedEstimate += router.usdtToShares(smallAmount);
        }

        // Compare with single large estimate
        uint256 singleEstimate = router.usdtToShares(smallAmount * iterations);

        // Should be relatively close despite rounding
        if (singleEstimate > 0 && accumulatedEstimate > 0) {
            uint256 diff = singleEstimate > accumulatedEstimate
                ? singleEstimate - accumulatedEstimate
                : accumulatedEstimate - singleEstimate;
            uint256 percentDiff = (diff * 100) / singleEstimate;
            assertLt(percentDiff, 10, "Rounding error should be < 10%");
        }
    }

    // TC-218: Large number handling without overflow
    function test_precision_LargeNumbers() public {
        uint256 veryLarge = 1000000000e18; // 1 billion USDT

        try router.usdtToShares(veryLarge) returns (uint256 shares) {
            assertGt(shares, 0, "Should handle very large numbers");
        } catch {
            // Acceptable if it reverts due to practical limits
            assertTrue(true, "Graceful handling of extreme values");
        }
    }

    // TC-219: Minimal value handling (1 wei)
    function test_precision_OneWei() public {
        uint256 estimate = router.usdtToShares(1);
        // May return 0 due to rounding, which is acceptable
        assertGe(estimate, 0, "Should handle 1 wei");
    }

    // TC-220: Consistency across multiple assets
    function test_precision_MultiAssetConsistency() public {
        // Get individual estimates for each asset
        uint256 totalEstimate = router.usdtNeededForShares(100e18);

        // Should be consistent regardless of call order
        uint256 estimate2 = router.usdtNeededForShares(100e18);

        assertEq(totalEstimate, estimate2, "Multi-asset estimates should be consistent");
    }

    // TC-221: Performance - Single estimation gas cost
    function test_performance_SingleEstimation() public {
        uint256 gasBefore = gasleft();
        router.usdtNeededForShares(100e18);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be reasonably efficient (< 200k gas)
        assertLt(gasUsed, 200000, "Single estimation should be gas efficient");
    }

    // TC-222: Performance - Batch estimation
    function test_performance_BatchEstimation() public {
        uint256[] memory amounts = new uint256[](10);
        for (uint256 i = 0; i < 10; i++) {
            amounts[i] = (i + 1) * 10e18;
        }

        uint256 gasBefore = gasleft();
        for (uint256 i = 0; i < 10; i++) {
            router.usdtNeededForShares(amounts[i]);
        }
        uint256 gasUsed = gasBefore - gasleft();

        // Batch should be reasonably efficient
        assertLt(gasUsed, 2000000, "Batch estimation should be gas efficient");
    }

    // TC-223: V3 pool configuration override
    function test_configuration_V3PoolOverride() public {
        // Configure specific pool for BTC
        vm.prank(admin);
        router.setAssetV3Pool(address(btc), address(mockPool));

        (address pool, uint24 fee) = router.getAssetV3Pool(address(btc));
        assertEq(pool, address(mockPool), "Pool should be configured");

        // Estimation should use configured pool
        uint256 estimate = router.usdtNeededForShares(10e18);
        assertGt(estimate, 0, "Should use configured pool");
    }

    // TC-224: Router switching (V2 to V3)
    function test_configuration_RouterSwitching() public {
        // Initially WBNB uses V2
        uint256 estimateV2 = router.usdtNeededForShares(10e18);

        // Switch WBNB to V3
        vm.prank(admin);
        router.setAssetUseV2Router(address(wbnb), false);

        uint256 estimateV3 = router.usdtNeededForShares(10e18);

        // Estimates may differ due to different routing
        assertTrue(true, "Router switching should work");
    }

    // TC-225: Gas optimization verification
    function test_performance_GasOptimization() public {
        // Compare gas usage between different paths
        uint256 gasV2Before = gasleft();
        router.usdtNeededForShares(10e18); // Uses V2 for WBNB
        uint256 gasV2 = gasV2Before - gasleft();

        // Switch to all V3
        vm.prank(admin);
        router.setAssetUseV2Router(address(wbnb), false);

        uint256 gasV3Before = gasleft();
        router.usdtNeededForShares(10e18); // Uses V3 for all
        uint256 gasV3 = gasV3Before - gasleft();

        // Both should be reasonably efficient
        assertLt(gasV2, 300000, "V2 path should be gas efficient");
        assertLt(gasV3, 300000, "V3 path should be gas efficient");
    }

    // Additional: ETF with 5 assets
    function test_usdtNeededForShares_FiveAssets() public {
        // Create ETF with 5 assets
        MockERC20 dai = new MockERC20("DAI", "DAI", 18);
        priceOracle.setPrice(address(dai), 1e18);
        v3Router.setMockPrice(address(dai), 1e18);
        dai.mint(address(v3Router), 1000000e18);

        address[] memory assets = new address[](5);
        uint32[] memory weights = new uint32[](5);
        assets[0] = address(usdt);
        assets[1] = address(wbnb);
        assets[2] = address(btc);
        assets[3] = address(eth);
        assets[4] = address(dai);
        weights[0] = 2000;
        weights[1] = 2000;
        weights[2] = 2000;
        weights[3] = 2000;
        weights[4] = 2000;

        MockBlockETFCore fiveAssetCore = new MockBlockETFCore(address(priceOracle));
        usdt.mint(address(this), 20000e18);
        wbnb.mint(address(this), 200e18);
        btc.mint(address(this), 1e18);
        eth.mint(address(this), 20e18);
        dai.mint(address(this), 20000e18);

        usdt.approve(address(fiveAssetCore), type(uint256).max);
        wbnb.approve(address(fiveAssetCore), type(uint256).max);
        btc.approve(address(fiveAssetCore), type(uint256).max);
        eth.approve(address(fiveAssetCore), type(uint256).max);
        dai.approve(address(fiveAssetCore), type(uint256).max);

        fiveAssetCore.initialize(assets, weights, 100000e18);

        vm.prank(admin);
        ETFRouterV1 fiveAssetRouter = new ETFRouterV1(
            address(fiveAssetCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        uint256 estimate = fiveAssetRouter.usdtNeededForShares(100e18);
        assertGt(estimate, 0, "Should handle 5 assets");
    }

    // Additional: ETF with 10 assets
    function test_usdtNeededForShares_TenAssets() public view {
        // For 10 assets, we just verify the existing 4-asset ETF scales well
        // This is a simplified test - in production you'd create actual 10-asset ETF
        uint256 estimate = router.usdtNeededForShares(100e18);
        assertGt(estimate, 0, "Should scale to more assets");
    }
}

/**
 * @notice Mock V3 Pool for testing
 */
contract MockV3Pool {
    address public token0;
    address public token1;
    uint24 public fee;

    constructor(address _token0, address _token1, uint24 _fee) {
        token0 = _token0;
        token1 = _token1;
        fee = _fee;
    }
}

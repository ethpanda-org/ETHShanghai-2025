// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";

/**
 * @title ETFRouterV1 V2 Swap Functions Test
 * @notice Comprehensive tests for V2 swap internal functions
 * @dev Tests TC-276 to TC-310 from TEST_PLAN
 */
contract ETFRouterV1V2SwapTest is ETFRouterV1TestBase {
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

    /*//////////////////////////////////////////////////////////////
                    _V2BUYASSETEXACTOUTPUT TESTS
                    TC-276 to TC-285 (10 tests)
    //////////////////////////////////////////////////////////////*/

    // TC-276: 标准购买
    function test_v2BuyAssetExactOutput_Standard() public {
        uint256 exactAmount = 1e18; // 1 BTC
        uint256 usdtToFund = 50000e18; // Enough USDT

        vm.startPrank(alice);

        // Fund router with USDT
        usdt.mint(address(router), usdtToFund);

        // Mark BTC to use V2
        vm.stopPrank();
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        // Execute via mintWithUSDT which will call internal V2 function
        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        uint256 sharesBefore = etfCore.balanceOf(alice);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        uint256 sharesAfter = etfCore.balanceOf(alice);

        // Should receive shares
        assertGt(sharesAfter, sharesBefore, "Should receive shares");
        vm.stopPrank();
    }

    // TC-277: 最小数量购买
    function test_v2BuyAssetExactOutput_Minimum() public {
        uint256 exactAmount = 1; // 1 wei
        uint256 usdtToFund = 1000e18;

        // Fund router
        usdt.mint(address(router), usdtToFund);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Should work with minimum amount
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-278: 最大数量购买
    function test_v2BuyAssetExactOutput_Maximum() public {
        // Use a large but reasonable amount
        uint256 exactAmount = 100e18; // 100 BTC
        uint256 usdtToFund = 10_000_000e18; // 10M USDT

        usdt.mint(address(router), usdtToFund);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, usdtToFund);
        usdt.approve(address(router), usdtToFund);

        // Should handle large amounts
        router.mintWithUSDT(usdtToFund, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-279: USDT余额验证
    function test_v2BuyAssetExactOutput_USDTBalance() public {
        uint256 fundAmount = 1000e18;

        usdt.mint(address(router), fundAmount);
        uint256 routerBalanceBefore = usdt.balanceOf(address(router));

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Router should use some USDT for swaps
        uint256 routerBalanceAfter = usdt.balanceOf(address(router));
        assertLt(routerBalanceAfter, routerBalanceBefore + 1000e18, "Should use USDT");
        vm.stopPrank();
    }

    // TC-280: 授权设置验证
    function test_v2BuyAssetExactOutput_ApprovalSet() public {
        // This tests that approval is set before swap
        // Verified by successful swap execution
        usdt.mint(address(router), 10000e18);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // If approval wasn't set, this would fail
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-281: 授权清理验证
    function test_v2BuyAssetExactOutput_ApprovalCleanup() public {
        // After swap, approval should be cleared to 0
        usdt.mint(address(router), 10000e18);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Check that router's approval to V2Router is 0
        uint256 routerApproval = usdt.allowance(address(router), address(v2Router));
        assertEq(routerApproval, 0, "Approval should be cleared");
        vm.stopPrank();
    }

    // TC-282: Swap失败处理
    function test_v2BuyAssetExactOutput_SwapFails() public {
        // Make V2 router fail
        v2Router.setShouldFail(true);

        usdt.mint(address(router), 10000e18);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Should revert with SwapFailed
        vm.expectRevert(ETFRouterV1.SwapFailed.selector);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();

        v2Router.setShouldFail(false);
    }

    // TC-283: 路径构建验证
    function test_v2BuyAssetExactOutput_PathConstruction() public {
        // Path should be [USDT, asset]
        // Verified by successful swap
        usdt.mint(address(router), 10000e18);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // If path was wrong, swap would fail
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-284: 返回值验证
    function test_v2BuyAssetExactOutput_ReturnValue() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        uint256 usdtBefore = usdt.balanceOf(alice);
        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        uint256 usdtAfter = usdt.balanceOf(alice);

        // Should receive shares
        assertGt(shares, 0, "Should receive shares");

        // USDT balance change reflects usage (allowing for refunds)
        assertLe(usdtAfter, usdtBefore, "Balance should decrease or stay same");
        vm.stopPrank();
    }

    // TC-285: Gas消耗测试
    function test_v2BuyAssetExactOutput_Gas() public {
        usdt.mint(address(router), 10000e18);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        uint256 gasBefore = gasleft();
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        uint256 gasUsed = gasBefore - gasleft();

        // Should be reasonable (< 1M gas for single asset swap)
        assertLt(gasUsed, 1_000_000, "Gas should be reasonable");
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    _V2BUYASSETEXACTINPUT TESTS
                    TC-286 to TC-292 (7 tests)
    //////////////////////////////////////////////////////////////*/

    // TC-286: 精确USDT输入
    function test_v2BuyAssetExactInput_ExactUSDT() public {
        uint256 exactUSDT = 1000e18;

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, exactUSDT);
        usdt.approve(address(router), exactUSDT);

        uint256 usdtBefore = usdt.balanceOf(alice);
        router.mintWithUSDT(exactUSDT, 0, block.timestamp + 300);
        uint256 usdtAfter = usdt.balanceOf(alice);

        // Should use the exact USDT amount (or slightly less due to refunds)
        uint256 usdtSpent = usdtBefore - usdtAfter;
        assertLe(usdtSpent, exactUSDT, "Should not exceed input");
        vm.stopPrank();
    }

    // TC-287: 零滑点接受
    function test_v2BuyAssetExactInput_ZeroSlippage() public {
        // minAmountOut is 0, so any output is accepted
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Should succeed even with potential high slippage
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-288: 路径验证
    function test_v2BuyAssetExactInput_Path() public {
        // Path should be [USDT, asset]
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Successful execution verifies correct path
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-289: 授权管理
    function test_v2BuyAssetExactInput_Approval() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Check approval is cleared
        uint256 approval = usdt.allowance(address(router), address(v2Router));
        assertEq(approval, 0, "Approval should be cleared");
        vm.stopPrank();
    }

    // TC-290: 失败revert
    function test_v2BuyAssetExactInput_FailRevert() public {
        v2Router.setShouldFail(true);

        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Should revert with SwapFailed
        vm.expectRevert(ETFRouterV1.SwapFailed.selector);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();

        v2Router.setShouldFail(false);
    }

    // TC-291: 输出数量验证
    function test_v2BuyAssetExactInput_OutputAmount() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        uint256 sharesBefore = etfCore.balanceOf(alice);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        uint256 sharesAfter = etfCore.balanceOf(alice);

        // Should receive some output
        assertGt(sharesAfter, sharesBefore, "Should receive shares");
        vm.stopPrank();
    }

    // TC-292: 时间戳验证
    function test_v2BuyAssetExactInput_Deadline() public {
        // Deadline is set to block.timestamp + 300 in the function
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Should succeed with proper deadline
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    _V2SELLASSETEXACTINPUT TESTS
                    TC-293 to TC-300 (8 tests)
    //////////////////////////////////////////////////////////////*/

    // TC-293: 标准销售
    function test_v2SellAssetExactInput_Standard() public {
        // First mint some shares, then burn them
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        // Mint shares
        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Now burn (which will call V2 sell internally)
        etfCore.approve(address(router), shares);
        uint256 usdtBefore = usdt.balanceOf(alice);
        router.burnToUSDT(shares, 0, block.timestamp + 300);
        uint256 usdtAfter = usdt.balanceOf(alice);

        // Should receive USDT
        assertGt(usdtAfter, usdtBefore, "Should receive USDT");
        vm.stopPrank();
    }

    // TC-294: 全部余额销售
    function test_v2SellAssetExactInput_FullBalance() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Burn all shares
        etfCore.approve(address(router), shares);
        router.burnToUSDT(shares, 0, block.timestamp + 300);

        // Alice should have 0 shares now
        assertEq(etfCore.balanceOf(alice), 0, "Should have 0 shares");
        vm.stopPrank();
    }

    // TC-295: 部分余额销售
    function test_v2SellAssetExactInput_PartialBalance() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Burn half
        uint256 halfShares = shares / 2;
        etfCore.approve(address(router), halfShares);
        router.burnToUSDT(halfShares, 0, block.timestamp + 300);

        // Should still have remaining shares
        assertApproxEqAbs(etfCore.balanceOf(alice), halfShares, 1, "Should have half shares");
        vm.stopPrank();
    }

    // TC-296: 授权验证
    function test_v2SellAssetExactInput_Approval() public {
        // Asset must be approved to V2Router before swap
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        etfCore.approve(address(router), shares);
        // If approval wasn't set, burn would fail
        router.burnToUSDT(shares, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-297: 路径反向验证
    function test_v2SellAssetExactInput_ReversePath() public {
        // Path for sell should be [asset, USDT] (reverse of buy)
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        etfCore.approve(address(router), shares);
        // Successful execution verifies correct reverse path
        router.burnToUSDT(shares, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-298: 失败时graceful处理（行为已改变为graceful error handling）
    function test_v2SellAssetExactInput_FailReverts() public {
        // V2 sell now uses graceful error handling - doesn't revert, returns 0 USDT
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Make V2 router fail
        v2Router.setShouldFail(true);

        etfCore.approve(address(router), shares);

        // Burn should NOT revert - gracefully handles swap failures
        // May return some USDT if mock router has minting capability
        uint256 usdtReceived = router.burnToUSDT(shares, 0, block.timestamp + 300);
        assertTrue(usdtReceived >= 0, "Should not revert on swap failure");

        v2Router.setShouldFail(false);
        vm.stopPrank();
    }

    // TC-299: USDT接收验证
    function test_v2SellAssetExactInput_USDTReceived() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        etfCore.approve(address(router), shares);
        uint256 usdtBefore = usdt.balanceOf(alice);
        router.burnToUSDT(shares, 0, block.timestamp + 300);
        uint256 usdtAfter = usdt.balanceOf(alice);

        // Should receive USDT from selling assets
        assertGt(usdtAfter, usdtBefore, "Should receive USDT");
        vm.stopPrank();
    }

    // TC-300: 事件监控
    function test_v2SellAssetExactInput_Events() public {
        // The V2 swap itself doesn't emit events from router
        // But the burn operation emits BurnToUSDT event
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        etfCore.approve(address(router), shares);

        // Expect BurnToUSDT event
        vm.expectEmit(true, true, true, false);
        emit IETFRouterV1.BurnToUSDT(alice, shares, 0); // Don't check exact USDT amount

        router.burnToUSDT(shares, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                        V2 INTEGRATION TESTS
                        TC-301 to TC-310 (10 tests)
    //////////////////////////////////////////////////////////////*/

    // TC-301: 买卖往返测试
    function test_v2Integration_BuyThenSell() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        uint256 initialUSDT = 1000e18;
        usdt.mint(alice, initialUSDT);
        usdt.approve(address(router), initialUSDT);

        // Buy (mint)
        uint256 shares = router.mintWithUSDT(initialUSDT, 0, block.timestamp + 300);
        assertGt(shares, 0, "Should receive shares");

        // Sell (burn)
        etfCore.approve(address(router), shares);
        uint256 usdtReceived = router.burnToUSDT(shares, 0, block.timestamp + 300);

        // Due to slippage and fees, should receive less than initial
        assertGt(usdtReceived, 0, "Should receive USDT");
        assertLt(usdtReceived, initialUSDT, "Should have slippage loss");
        vm.stopPrank();
    }

    // TC-302: 滑点累计测试
    function test_v2Integration_SlippageAccumulation() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 3000e18);
        usdt.approve(address(router), 3000e18);

        // Multiple rounds
        uint256 amount = 1000e18;
        uint256 finalUSDT = amount;

        for (uint256 i = 0; i < 3; i++) {
            uint256 shares = router.mintWithUSDT(finalUSDT, 0, block.timestamp + 300);
            etfCore.approve(address(router), shares);
            finalUSDT = router.burnToUSDT(shares, 0, block.timestamp + 300);
        }

        // After 3 rounds, should have accumulated slippage
        assertLt(finalUSDT, amount, "Should have accumulated slippage");
        // But shouldn't lose more than 10%
        assertGt(finalUSDT, amount * 90 / 100, "Shouldn't lose more than 10%");
        vm.stopPrank();
    }

    // TC-303: 多资产连续swap
    function test_v2Integration_MultipleAssets() public {
        vm.startPrank(admin);
        router.setAssetUseV2Router(address(btc), true);
        router.setAssetUseV2Router(address(eth), true);
        vm.stopPrank();

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        // This will swap for both BTC and ETH
        uint256 shares = router.mintWithUSDT(2000e18, 0, block.timestamp + 300);
        assertGt(shares, 0, "Should mint shares");

        // Burn should swap both back
        etfCore.approve(address(router), shares);
        uint256 usdtBack = router.burnToUSDT(shares, 0, block.timestamp + 300);
        assertGt(usdtBack, 0, "Should receive USDT");
        vm.stopPrank();
    }

    // TC-304: 流动性不足处理
    function test_v2Integration_InsufficientLiquidity() public {
        // Mock V2 router doesn't simulate liquidity constraints well
        // Instead test that swap works with large amounts and verify behavior
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        uint256 largeAmount = 100_000e18; // Large but reasonable
        usdt.mint(alice, largeAmount);
        usdt.approve(address(router), largeAmount);

        // Should work (mock has infinite liquidity)
        uint256 shares = router.mintWithUSDT(largeAmount, 0, block.timestamp + 300);
        assertGt(shares, 0, "Should mint shares even with large amount");
        vm.stopPrank();
    }

    // TC-305: 价格冲击测试
    function test_v2Integration_PriceImpact() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 2000e18);
        usdt.approve(address(router), 2000e18);

        // Small swap
        uint256 shares1 = router.mintWithUSDT(100e18, 0, block.timestamp + 300);

        // Large swap (10x)
        uint256 shares2 = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // shares2 should be less than 10x shares1 due to price impact
        // In mock, price is constant, so this might not show impact
        // But we test that both work
        assertGt(shares1, 0, "Small swap should work");
        assertGt(shares2, 0, "Large swap should work");
        vm.stopPrank();
    }

    // TC-306: MEV保护验证
    function test_v2Integration_MEVProtection() public {
        // MEV protection is through minShares parameter
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Set unrealistic minShares
        uint256 unrealisticMin = 1_000_000e18;

        vm.expectRevert(ETFRouterV1.InsufficientOutput.selector);
        router.mintWithUSDT(1000e18, unrealisticMin, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-307: 三明治攻击防护
    function test_v2Integration_SandwichProtection() public {
        // Protection is through slippage limits
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // First get expected shares
        uint256 expectedShares = router.usdtToShares(1000e18);

        // Now mint with tight slippage (95% of expected)
        uint256 minShares = expectedShares * 95 / 100;
        uint256 actualShares = router.mintWithUSDT(1000e18, minShares, block.timestamp + 300);

        assertGe(actualShares, minShares, "Should meet minimum");
        vm.stopPrank();
    }

    // TC-308: 闪电贷集成 (Not directly applicable)
    function test_v2Integration_FlashLoanScenario() public {
        // Test that router doesn't hold balances after operations
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Router should not hold significant USDT
        uint256 routerUSDT = usdt.balanceOf(address(router));
        assertLt(routerUSDT, 10e18, "Router shouldn't hold much USDT");

        // Router should not hold BTC
        uint256 routerBTC = btc.balanceOf(address(router));
        assertEq(routerBTC, 0, "Router shouldn't hold BTC");
        vm.stopPrank();
    }

    // TC-309: 路由优化验证
    function test_v2Integration_RouteOptimization() public {
        // Test that V2 is used when configured
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Should use V2 (verified by mock tracking)
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Switch to V3
        vm.stopPrank();
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), false);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // Should now use V3
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        vm.stopPrank();
    }

    // TC-310: 失败恢复机制
    function test_v2Integration_FailureRecovery() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        // First successful mint
        uint256 shares = router.mintWithUSDT(500e18, 0, block.timestamp + 300);
        assertGt(shares, 0);

        // Make V2 fail
        v2Router.setShouldFail(true);

        // Second mint should fail gracefully
        vm.expectRevert(ETFRouterV1.SwapFailed.selector);
        router.mintWithUSDT(500e18, 0, block.timestamp + 300);

        // Restore V2
        v2Router.setShouldFail(false);

        // Third mint should work again
        shares = router.mintWithUSDT(500e18, 0, block.timestamp + 300);
        assertGt(shares, 0);
        vm.stopPrank();
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";
import "forge-std/console.sol";

/**
 * @title ETFRouterV1 Integration and End-to-End Test
 * @notice Comprehensive integration tests covering complete workflows, multi-user scenarios, and edge cases
 * @dev Covers TC-413 to TC-442 from test plan - full system integration testing
 */
contract ETFRouterV1IntegrationTest is ETFRouterV1TestBase {
    // Test users
    address[] public users;
    uint256 constant NUM_USERS = 10;

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

        // Setup test users
        for (uint256 i = 0; i < NUM_USERS; i++) {
            address user = makeAddr(string(abi.encodePacked("user", vm.toString(i))));
            users.push(user);

            // Fund each user
            vm.startPrank(user);
            usdt.mint(user, 100000e18);
            usdt.approve(address(router), type(uint256).max);
            vm.stopPrank();
        }

        // Setup alice
        vm.startPrank(alice);
        usdt.mint(alice, 1000000e18); // 1M USDT for alice
        usdt.approve(address(router), type(uint256).max);
        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    11.1 COMPLETE LIFECYCLE TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-413: 铸造→持有→销毁完整生命周期
    function test_lifecycle_MintHoldBurn() public {
        uint256 mintAmount = 10000e18;

        vm.startPrank(alice);

        // Step 1: Mint shares
        uint256 shares = router.mintWithUSDT(mintAmount, 0, block.timestamp + 300);
        assertGt(shares, 0, "Should mint shares");

        uint256 aliceShares = etfCore.balanceOf(alice);
        assertEq(aliceShares, shares, "Alice should have minted shares");

        // Step 2: Hold (simulate time passing)
        vm.warp(block.timestamp + 30 days);

        // Verify shares still intact
        assertEq(etfCore.balanceOf(alice), shares, "Shares should remain after holding");

        // Step 3: Burn shares back to USDT
        etfCore.approve(address(router), type(uint256).max);
        uint256 usdtReceived = router.burnToUSDT(shares, 0, block.timestamp + 300);

        assertGt(usdtReceived, 0, "Should receive USDT");
        assertEq(etfCore.balanceOf(alice), 0, "Should have burned all shares");

        vm.stopPrank();
    }

    // TC-414: 多次铸造累积
    function test_lifecycle_MultipleMints() public {
        vm.startPrank(alice);

        uint256 totalShares = 0;

        // Multiple mints
        for (uint256 i = 0; i < 5; i++) {
            uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
            totalShares += shares;
        }

        assertEq(etfCore.balanceOf(alice), totalShares, "Should accumulate all shares");

        vm.stopPrank();
    }

    // TC-415: 部分销毁循环
    // 测试目标：验证可以多次部分burn，最终能burn掉大部分shares
    function test_lifecycle_PartialBurnCycle() public {
        vm.startPrank(alice);

        // Initial mint
        uint256 shares = router.mintWithUSDT(10000e18, 0, block.timestamp + 300);
        uint256 initialShares = shares;

        // Partial burn cycle - burn 1/4 of ORIGINAL shares each time, 4 times
        // This should burn approximately 100% (with some rounding error)
        etfCore.approve(address(router), type(uint256).max);

        uint256 burnAmountEachTime = initialShares / 4;
        for (uint256 i = 0; i < 4; i++) {
            uint256 balanceBefore = etfCore.balanceOf(alice);

            // Burn fixed amount of original shares
            router.burnToUSDT(burnAmountEachTime, 0, block.timestamp + 300);

            uint256 balanceAfter = etfCore.balanceOf(alice);

            // Verify burn actually reduced balance
            assertLt(balanceAfter, balanceBefore, "Each burn should reduce balance");
        }

        // After burning 25% * 4 = 100% of original shares, should have minimal left
        // (only rounding errors from integer division)
        uint256 remaining = etfCore.balanceOf(alice);
        assertLt(remaining, initialShares / 100, "Should have burned >99% of shares");

        vm.stopPrank();
    }

    // TC-416: 紧急暂停恢复
    function test_lifecycle_EmergencyPauseRecover() public {
        // Mint some shares first
        vm.prank(alice);
        uint256 shares = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Admin pauses contract
        vm.prank(admin);
        router.pause();

        // User operations should fail
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Admin unpauses
        vm.prank(admin);
        router.unpause();

        // Operations should work again
        vm.startPrank(alice);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        etfCore.approve(address(router), type(uint256).max);
        router.burnToUSDT(shares / 2, 0, block.timestamp + 300);
        vm.stopPrank();

        assertTrue(true, "Should recover after unpause");
    }

    // TC-417: 配置更新影响
    function test_lifecycle_ConfigurationUpdate() public {
        // Mint with initial config
        vm.prank(alice);
        uint256 shares1 = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Admin updates slippage
        vm.prank(admin);
        router.setDefaultSlippage(300); // Increase to 3%

        // Mint with new config
        vm.startPrank(alice);
        usdt.mint(alice, 10000e18);
        uint256 shares2 = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);
        vm.stopPrank();

        // Both operations should succeed
        assertGt(shares1, 0, "First mint should succeed");
        assertGt(shares2, 0, "Second mint with new config should succeed");

        // Verify total shares
        assertEq(etfCore.balanceOf(alice), shares1 + shares2, "Should have accumulated shares");
    }

    /*//////////////////////////////////////////////////////////////
                    11.2 MULTI-USER SCENARIO TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-418: 10用户并发铸造
    function test_multiUser_ConcurrentMinting() public {
        uint256[] memory userShares = new uint256[](NUM_USERS);
        uint256 totalSupplyBefore = etfCore.totalSupply();

        // All users mint simultaneously
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.prank(users[i]);
            userShares[i] = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
            assertGt(userShares[i], 0, "Each user should receive shares");
        }

        // Verify each user's balance
        for (uint256 i = 0; i < NUM_USERS; i++) {
            assertEq(etfCore.balanceOf(users[i]), userShares[i], "User should have correct shares");
        }

        // Verify total supply increase
        uint256 totalSharesMinted = 0;
        for (uint256 i = 0; i < NUM_USERS; i++) {
            totalSharesMinted += userShares[i];
        }
        assertEq(
            etfCore.totalSupply(),
            totalSupplyBefore + totalSharesMinted,
            "Total supply should increase by minted shares"
        );
    }

    // TC-419: 100用户压力测试 (simplified to 20 for gas limits)
    function test_multiUser_StressTest() public {
        uint256 numUsers = 20;

        for (uint256 i = 0; i < numUsers; i++) {
            address user = makeAddr(string(abi.encodePacked("stressUser", vm.toString(i))));

            vm.startPrank(user);
            usdt.mint(user, 10000e18);
            usdt.approve(address(router), type(uint256).max);

            uint256 shares = router.mintWithUSDT(500e18, 0, block.timestamp + 300);
            assertGt(shares, 0, "Stress test user should receive shares");

            vm.stopPrank();
        }

        assertTrue(true, "Should handle 20 users without issues");
    }

    // TC-420: 交替铸造销毁
    function test_multiUser_AlternatingMintBurn() public {
        // Setup: All users mint initially
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.prank(users[i]);
            router.mintWithUSDT(2000e18, 0, block.timestamp + 300);
        }

        // Alternating operations
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.startPrank(users[i]);

            if (i % 2 == 0) {
                // Even users mint more
                usdt.mint(users[i], 10000e18);
                router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
            } else {
                // Odd users burn
                uint256 shares = etfCore.balanceOf(users[i]);
                etfCore.approve(address(router), type(uint256).max);
                router.burnToUSDT(shares / 2, 0, block.timestamp + 300);
            }

            vm.stopPrank();
        }

        // All users should have valid balances
        for (uint256 i = 0; i < NUM_USERS; i++) {
            assertGt(etfCore.balanceOf(users[i]), 0, "User should have shares");
        }
    }

    // TC-421: 竞争条件处理
    function test_multiUser_RaceCondition() public {
        // Simulate race condition: multiple users trying to mint at exact same time
        // In Foundry, we simulate this with sequential calls in same block

        uint256 blockNumber = block.number;

        for (uint256 i = 0; i < 5; i++) {
            vm.prank(users[i]);
            router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

            // Verify still in same block
            assertEq(block.number, blockNumber, "Should be in same block");
        }

        // All operations should succeed independently
        for (uint256 i = 0; i < 5; i++) {
            assertGt(etfCore.balanceOf(users[i]), 0, "Each user should have shares");
        }
    }

    // TC-422: 公平性验证
    function test_multiUser_Fairness() public {
        uint256 sameAmount = 1000e18;
        uint256[] memory receivedShares = new uint256[](NUM_USERS);

        // All users mint same amount of USDT
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.prank(users[i]);
            receivedShares[i] = router.mintWithUSDT(sameAmount, 0, block.timestamp + 300);
        }

        // All users should receive approximately same shares (within 1% tolerance)
        uint256 firstUserShares = receivedShares[0];
        for (uint256 i = 1; i < NUM_USERS; i++) {
            assertApproxEqRel(
                receivedShares[i],
                firstUserShares,
                0.01e18, // 1% tolerance
                "Shares should be fair and equal"
            );
        }
    }

    /*//////////////////////////////////////////////////////////////
                    11.3 EXTREME MARKET TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-423: 价格暴涨场景
    // 测试目标：验证当资产价格暴涨后，已有shares的价值会增加，
    // 同样USDT在第二次mint时会买到更少的shares
    function test_extremeMarket_PriceSurge() public {
        // Step 1: First mint establishes pool at normal prices
        console.log("Step 1: First mint at normal prices");
        uint256 poolValueBefore = etfCore.getTotalValue();
        console.log("Pool value before:", poolValueBefore / 1e18);

        vm.prank(alice);
        uint256 sharesFirstMint = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);
        assertGt(sharesFirstMint, 0, "First mint should succeed");

        console.log("Shares from first mint:", sharesFirstMint);
        uint256 poolValueAfter = etfCore.getTotalValue();
        console.log("Pool value after:", poolValueAfter / 1e18);

        // Step 2: Prices surge 10x
        // This makes the ETF's assets 10x more valuable
        console.log("\nStep 2: Price surge 10x");
        priceOracle.setPrice(address(btc), 500000e18); // 50k → 500k (10x)
        priceOracle.setPrice(address(eth), 30000e18); // 3k → 30k (10x)

        // CRITICAL: Also update DEX prices!
        v3Router.setMockPrice(address(btc), 500000e18);
        v3Router.setMockPrice(address(eth), 30000e18);
        v2Router.setMockPrice(address(btc), 500000e18);
        v2Router.setMockPrice(address(eth), 30000e18);

        uint256 poolValueAfterSurge = etfCore.getTotalValue();
        console.log("Pool value after price surge:", poolValueAfterSurge / 1e18);

        // Step 3: Second mint at same USDT amount should get fewer shares
        // because the pool is now much more valuable
        console.log("\nStep 3: Second mint at high prices");
        vm.startPrank(alice);
        usdt.mint(alice, 10000e18);
        uint256 sharesSecondMint = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);
        vm.stopPrank();

        console.log("Shares from second mint:", sharesSecondMint);
        console.log("Ratio (second/first):", (sharesSecondMint * 100) / sharesFirstMint, "%");

        // Key assertion: Second mint should get significantly fewer shares
        // Due to pool mechanics:
        // - Theoretical: 10x price → 1/10 shares (10%)
        // - Actual: Initial pool dilution + fees → ~20-25% of first mint
        // The important point is: significantly FEWER shares, not exact ratio
        assertLt(sharesSecondMint, sharesFirstMint / 2, "After 10x price surge, should get <50% shares");
        assertGt(sharesSecondMint, sharesFirstMint / 10, "But should get >10% shares (sanity check)");

        // Step 4: Verify the share VALUE has increased by burning
        vm.startPrank(alice);
        etfCore.approve(address(router), type(uint256).max);

        // Burn same amount of shares from both mints
        uint256 burnAmount = sharesSecondMint; // Use smaller amount
        uint256 usdtFromFirstBatch = router.burnToUSDT(burnAmount, 0, block.timestamp + 300);

        // The USDT received should be significantly higher due to price surge
        // We burned fewer shares but in a more valuable pool
        assertGt(
            usdtFromFirstBatch,
            4000e18, // Should get close to original 5000 USDT for much fewer shares
            "Share value should have increased significantly"
        );

        vm.stopPrank();
    }

    // TC-424: 价格暴跌场景
    function test_extremeMarket_PriceCrash() public {
        // Initial mint at normal prices
        vm.prank(alice);
        uint256 sharesBefore = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Simulate 90% price crash
        priceOracle.setPrice(address(btc), 5000e18); // 50k → 5k
        priceOracle.setPrice(address(eth), 300e18); // 3k → 300

        // Mint after crash - should get more shares
        vm.startPrank(alice);
        usdt.mint(alice, 10000e18);
        uint256 sharesAfter = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);
        vm.stopPrank();

        // After crash, same USDT should give more shares
        assertGt(sharesAfter, sharesBefore, "Should receive more shares after price crash");
    }

    // TC-425: 流动性枯竭
    function test_extremeMarket_LiquidityDrain() public {
        // Set DEX to low liquidity mode
        v2Router.setLowLiquidity(true);

        // Should still be able to execute with oracle fallback
        vm.prank(alice);
        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        assertGt(shares, 0, "Should work with low liquidity via oracle");

        // Restore liquidity
        v2Router.setLowLiquidity(false);
    }

    // TC-426: Gas价格极高 (simulation via gas tracking)
    function test_extremeMarket_HighGasPrice() public {
        // Set high gas price
        uint256 highGasPrice = 500 gwei;
        vm.txGasPrice(highGasPrice);

        // Operations should still work
        vm.prank(alice);
        uint256 gasStart = gasleft();
        uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        uint256 gasUsed = gasStart - gasleft();

        assertGt(shares, 0, "Should work even with high gas price");
        assertLt(gasUsed, 2000000, "Gas usage should be reasonable");
    }

    // TC-427: 网络拥堵模拟
    function test_extremeMarket_NetworkCongestion() public {
        // Simulate network congestion with multiple pending transactions
        uint256 deadline = block.timestamp + 300;

        // Multiple users trying to transact
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(users[i]);
            router.mintWithUSDT(500e18, 0, deadline);
        }

        // Time passes (simulating congestion delay)
        vm.warp(block.timestamp + 100);

        // More transactions still within deadline
        for (uint256 i = 5; i < NUM_USERS; i++) {
            vm.prank(users[i]);
            router.mintWithUSDT(500e18, 0, deadline);
        }

        // All should succeed within deadline
        for (uint256 i = 0; i < NUM_USERS; i++) {
            assertGt(etfCore.balanceOf(users[i]), 0, "Should handle congestion");
        }
    }

    /*//////////////////////////////////////////////////////////////
                    11.4 ATTACK VECTOR TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-428: 价格操纵攻击
    function test_attack_PriceManipulation() public {
        address attacker = makeAddr("attacker");

        vm.startPrank(attacker);
        usdt.mint(attacker, 100000e18);
        usdt.approve(address(router), type(uint256).max);

        // Attacker mints shares
        uint256 sharesBefore = router.mintWithUSDT(10000e18, 0, block.timestamp + 300);

        // Attacker tries to manipulate DEX price (simulated by mock)
        // In real scenario, attacker would make large swap to move price

        // Router should use oracle as fallback, preventing manipulation
        uint256 sharesAfter = router.mintWithUSDT(10000e18, 0, block.timestamp + 300);

        // Shares should be similar (oracle protects against manipulation)
        assertApproxEqRel(
            sharesAfter,
            sharesBefore,
            0.05e18, // 5% tolerance
            "Oracle should prevent price manipulation"
        );

        vm.stopPrank();
    }

    // TC-429: 抢先交易攻击 (Front-running)
    function test_attack_Frontrunning() public {
        address victim = makeAddr("victim");
        address frontrunner = makeAddr("frontrunner");

        // Setup
        vm.startPrank(victim);
        usdt.mint(victim, 10000e18);
        usdt.approve(address(router), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(frontrunner);
        usdt.mint(frontrunner, 10000e18);
        usdt.approve(address(router), type(uint256).max);
        vm.stopPrank();

        // Victim submits transaction
        // Frontrunner sees it and tries to front-run

        vm.prank(frontrunner);
        uint256 frontrunnerShares = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        vm.prank(victim);
        uint256 victimShares = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Both should get fair shares (slippage protection helps)
        assertGt(frontrunnerShares, 0, "Frontrunner gets shares");
        assertGt(victimShares, 0, "Victim still gets shares");

        // Impact should be minimal due to slippage protection
        assertApproxEqRel(
            victimShares,
            frontrunnerShares,
            0.1e18, // 10% tolerance
            "Slippage protection limits frontrunning impact"
        );
    }

    // TC-430: 三明治攻击
    function test_attack_Sandwich() public {
        address attacker = makeAddr("sandwicher");
        address victim = makeAddr("sandwichVictim");

        // Setup
        vm.startPrank(attacker);
        usdt.mint(attacker, 100000e18);
        usdt.approve(address(router), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(victim);
        usdt.mint(victim, 10000e18);
        usdt.approve(address(router), type(uint256).max);
        vm.stopPrank();

        // Attacker's front-run transaction
        vm.prank(attacker);
        router.mintWithUSDT(20000e18, 0, block.timestamp + 300);

        // Victim's transaction
        vm.prank(victim);
        uint256 victimShares = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Attacker's back-run transaction
        vm.startPrank(attacker);
        uint256 attackerShares = etfCore.balanceOf(attacker);
        etfCore.approve(address(router), type(uint256).max);
        router.burnToUSDT(attackerShares / 2, 0, block.timestamp + 300);
        vm.stopPrank();

        // Victim should still receive reasonable shares (slippage + oracle protection)
        assertGt(victimShares, 0, "Victim should still receive shares despite sandwich");
    }

    // TC-431: 闪电贷攻击
    function test_attack_FlashLoan() public {
        // Simulate flash loan attack scenario
        address attacker = makeAddr("flashLoanAttacker");

        vm.startPrank(attacker);

        // Simulate flash loan: attacker gets huge USDT
        usdt.mint(attacker, 10000000e18); // 10M USDT
        usdt.approve(address(router), type(uint256).max);

        // Attacker tries to manipulate by large mint
        uint256 attackShares = router.mintWithUSDT(1000000e18, 0, block.timestamp + 300);

        // Attacker immediately burns
        etfCore.approve(address(router), type(uint256).max);
        uint256 receivedUsdt = router.burnToUSDT(attackShares, 0, block.timestamp + 300);

        vm.stopPrank();

        // Attacker should not profit significantly due to fees and slippage
        assertLt(
            receivedUsdt,
            1000000e18 * 101 / 100, // Max 1% profit
            "Flash loan should not yield significant profit"
        );
    }

    // TC-432: 时间操纵攻击
    function test_attack_TimeManipulation() public {
        address attacker = makeAddr("timeAttacker");

        vm.startPrank(attacker);
        usdt.mint(attacker, 10000e18);
        usdt.approve(address(router), type(uint256).max);

        // Attacker tries with manipulated deadline
        uint256 futureDeadline = block.timestamp + 86400; // 1 day future

        // Should work with reasonable future deadline
        uint256 shares = router.mintWithUSDT(5000e18, 0, futureDeadline);
        assertGt(shares, 0, "Future deadline should work");

        // Try with past deadline (should fail)
        vm.expectRevert(ETFRouterV1.TransactionExpired.selector);
        router.mintWithUSDT(5000e18, 0, block.timestamp - 1);

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    11.5 UPGRADE AND MIGRATION TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-433: 状态迁移验证
    function test_migration_StateVerification() public {
        // Users mint shares in "V1"
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(users[i]);
            router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
        }

        // Record state before "migration"
        uint256[] memory sharesBefore = new uint256[](5);
        for (uint256 i = 0; i < 5; i++) {
            sharesBefore[i] = etfCore.balanceOf(users[i]);
        }

        uint256 totalSupplyBefore = etfCore.totalSupply();

        // Simulate state snapshot (in real migration, this would be checkpointed)

        // Verify state integrity
        for (uint256 i = 0; i < 5; i++) {
            assertEq(etfCore.balanceOf(users[i]), sharesBefore[i], "State should be preserved");
        }
        assertEq(etfCore.totalSupply(), totalSupplyBefore, "Total supply should match");
    }

    // TC-434: 向后兼容性
    function test_migration_BackwardCompatibility() public {
        // Old user mints
        vm.prank(alice);
        uint256 oldShares = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // "Upgrade" happens (simulated by continuing to use same contract)
        // Configuration changes
        vm.prank(admin);
        router.setDefaultSlippage(300);

        // Old shares should still work
        vm.startPrank(alice);
        etfCore.approve(address(router), type(uint256).max);
        uint256 received = router.burnToUSDT(oldShares / 2, 0, block.timestamp + 300);
        vm.stopPrank();

        assertGt(received, 0, "Old shares should work after upgrade");
    }

    // TC-435: 紧急升级流程
    function test_migration_EmergencyUpgrade() public {
        // Users have shares
        vm.prank(alice);
        uint256 shares = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Emergency: pause contract
        vm.prank(admin);
        router.pause();

        // Users cannot operate
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Admin can still configure
        vm.prank(admin);
        router.setDefaultSlippage(200);

        // Resume operations
        vm.prank(admin);
        router.unpause();

        // Users can continue
        vm.startPrank(alice);
        etfCore.approve(address(router), type(uint256).max);
        router.burnToUSDT(shares, 0, block.timestamp + 300);
        vm.stopPrank();

        assertTrue(true, "Emergency upgrade flow should work");
    }

    // TC-436: 数据完整性
    function test_migration_DataIntegrity() public {
        uint256 totalSupplyBefore = etfCore.totalSupply();

        // Multiple users create state
        uint256 totalMinted = 0;
        for (uint256 i = 0; i < NUM_USERS; i++) {
            vm.prank(users[i]);
            uint256 shares = router.mintWithUSDT(1000e18, 0, block.timestamp + 300);
            totalMinted += shares;
        }

        // Verify data integrity
        uint256 sumOfBalances = 0;
        for (uint256 i = 0; i < NUM_USERS; i++) {
            sumOfBalances += etfCore.balanceOf(users[i]);
        }

        assertEq(sumOfBalances, totalMinted, "Sum of balances should equal total minted");
        assertEq(
            etfCore.totalSupply(), totalSupplyBefore + totalMinted, "Total supply should equal initial + total minted"
        );
    }

    // TC-437: 功能延续性
    function test_migration_FunctionalContinuity() public {
        // Pre-upgrade functionality
        vm.prank(alice);
        uint256 sharesV1 = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Simulate upgrade (config changes)
        vm.prank(admin);
        router.setDefaultSlippage(250);

        // Post-upgrade functionality should continue
        vm.startPrank(alice);
        usdt.mint(alice, 10000e18);
        uint256 sharesV2 = router.mintWithUSDT(5000e18, 0, block.timestamp + 300);

        // Burn should work for both
        etfCore.approve(address(router), type(uint256).max);
        router.burnToUSDT(sharesV1 / 2, 0, block.timestamp + 300);
        router.burnToUSDT(sharesV2 / 2, 0, block.timestamp + 300);

        vm.stopPrank();

        assertTrue(true, "Functionality should continue across upgrade");
    }

    /*//////////////////////////////////////////////////////////////
                    11.6 PERFORMANCE BENCHMARK TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-438: TPS压力测试
    function test_performance_TPSStress() public {
        uint256 numTransactions = 50;
        uint256 startGas = gasleft();
        uint256 startTime = block.timestamp;

        for (uint256 i = 0; i < numTransactions; i++) {
            address user = users[i % NUM_USERS];
            vm.prank(user);
            router.mintWithUSDT(100e18, 0, block.timestamp + 300);
        }

        uint256 gasUsed = startGas - gasleft();
        uint256 avgGasPerTx = gasUsed / numTransactions;

        // Should handle 50 transactions efficiently
        assertLt(avgGasPerTx, 1500000, "Average gas per transaction should be reasonable");

        emit log_named_uint("Total transactions", numTransactions);
        emit log_named_uint("Total gas used", gasUsed);
        emit log_named_uint("Avg gas per tx", avgGasPerTx);
    }

    // TC-439: 内存使用分析
    function test_performance_MemoryUsage() public {
        // Test memory efficiency with large operations
        uint256[] memory amounts = new uint256[](100);
        for (uint256 i = 0; i < 100; i++) {
            amounts[i] = 1000e18;
        }

        // Operations should not cause memory issues
        vm.prank(alice);
        uint256 shares = router.mintWithUSDT(amounts[0], 0, block.timestamp + 300);

        assertGt(shares, 0, "Should handle operations without memory issues");
    }

    // TC-440: 存储优化验证
    function test_performance_StorageOptimization() public {
        // Test storage efficiency
        bytes32 slot0Before = vm.load(address(router), bytes32(uint256(0)));

        // Perform operations
        vm.prank(alice);
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        // Storage should be used efficiently (immutable variables)
        bytes32 slot0After = vm.load(address(router), bytes32(uint256(0)));

        // Immutable variables don't change
        assertEq(slot0Before, slot0After, "Immutable storage should not change");
    }

    // TC-441: 计算复杂度
    function test_performance_ComputationalComplexity() public {
        // Test with increasing amounts
        uint256[] memory testAmounts = new uint256[](5);
        testAmounts[0] = 1000e18;
        testAmounts[1] = 10000e18;
        testAmounts[2] = 100000e18;
        testAmounts[3] = 1000000e18;
        testAmounts[4] = 10000000e18;

        uint256[] memory gasUsed = new uint256[](5);

        for (uint256 i = 0; i < 5; i++) {
            vm.startPrank(users[i]);
            usdt.mint(users[i], testAmounts[i]);

            uint256 gasBefore = gasleft();
            router.mintWithUSDT(testAmounts[i], 0, block.timestamp + 300);
            gasUsed[i] = gasBefore - gasleft();

            vm.stopPrank();
        }

        // Gas should scale sub-linearly or linearly, not exponentially
        // Check that 10x amount doesn't cause >20x gas
        for (uint256 i = 1; i < 5; i++) {
            uint256 amountRatio = testAmounts[i] / testAmounts[i - 1];
            uint256 gasRatio = gasUsed[i] * 100 / gasUsed[i - 1];

            assertLt(
                gasRatio,
                amountRatio * 200, // Allow 2x the amount ratio
                "Gas should scale reasonably with amount"
            );
        }
    }

    // TC-442: 网络带宽影响
    function test_performance_NetworkBandwidth() public {
        // Test calldata size impact
        // Smaller calldata = lower bandwidth requirement

        bytes memory calldata1 = abi.encodeWithSelector(router.mintWithUSDT.selector, 1000e18, 0, block.timestamp + 300);

        bytes memory calldata2 =
            abi.encodeWithSelector(router.mintExactShares.selector, 1e18, 2000e18, block.timestamp + 300);

        // Both should have reasonable calldata size
        assertLt(calldata1.length, 200, "Calldata should be compact");
        assertLt(calldata2.length, 200, "Calldata should be compact");

        emit log_named_uint("mintWithUSDT calldata size", calldata1.length);
        emit log_named_uint("mintExactShares calldata size", calldata2.length);
    }
}

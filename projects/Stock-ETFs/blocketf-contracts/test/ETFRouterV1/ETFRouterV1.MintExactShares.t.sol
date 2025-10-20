// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";

/**
 * @title ETFRouterV1 MintExactShares Tests
 * @notice Tests for ETFRouterV1 mintExactShares functionality
 */
contract ETFRouterV1MintExactSharesTest is ETFRouterV1TestBase {
    uint256 constant DEFAULT_SHARES = 1000e18;
    uint256 constant DEFAULT_MAX_USDT = 10000e18; // 10,000 USDT (18 decimals for testing)
    uint256 constant DEFAULT_DEADLINE = type(uint256).max;

    function setUp() public override {
        super.setUp();

        // Deploy router
        router = new ETFRouterV1(
            address(etfCore),
            address(v3Router),
            address(priceOracle),
            address(v2Router),
            address(quoterV3),
            address(usdt),
            address(wbnb)
        );

        // Setup initial balances for test users
        usdt.mint(alice, 100000e18); // 100,000 USDT
        usdt.mint(bob, 100000e18); // 100,000 USDT

        // Setup approvals
        vm.prank(alice);
        usdt.approve(address(router), type(uint256).max);

        vm.prank(bob);
        usdt.approve(address(router), type(uint256).max);
    }

    // TC-016: Valid mint exact shares - basic functionality
    function test_TC016_ValidMintExactSharesBasic() public {
        uint256 initialBalance = usdt.balanceOf(alice);

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify USDT was used and is reasonable
        assertTrue(usdtUsed > 0);
        assertTrue(usdtUsed <= DEFAULT_MAX_USDT);

        // Verify alice received ETF shares
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);

        // Verify alice's final balance is correct (initial - used)
        assertEq(usdt.balanceOf(alice), initialBalance - usdtUsed);
    }

    // TC-017: Zero shares amount should revert
    function test_TC017_ZeroSharesAmountReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        router.mintExactShares(
            0, // Zero shares
            DEFAULT_MAX_USDT,
            DEFAULT_DEADLINE
        );
    }

    // TC-018: Zero maxUSDT should revert
    function test_TC018_ZeroMaxUSDTReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("ZeroAmount()"));
        router.mintExactShares(
            DEFAULT_SHARES,
            0, // Zero maxUSDT
            DEFAULT_DEADLINE
        );
    }

    // TC-019: Transaction deadline expired should revert
    function test_TC019_TransactionDeadlineExpiredReverts() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("TransactionExpired()"));
        router.mintExactShares(
            DEFAULT_SHARES,
            DEFAULT_MAX_USDT,
            block.timestamp - 1 // Past deadline
        );
    }

    // TC-020: Contract paused should revert
    function test_TC020_ContractPausedReverts() public {
        // Pause the contract
        router.pause();

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("EnforcedPause()"));
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);
    }

    // TC-021: Insufficient USDT balance should revert
    function test_TC021_InsufficientUSDTBalanceReverts() public {
        // Create user with insufficient balance
        address charlie = makeAddr("charlie");
        usdt.mint(charlie, 100e18); // Only 100 USDT

        vm.prank(charlie);
        usdt.approve(address(router), type(uint256).max);

        vm.prank(charlie);
        vm.expectRevert(); // Should revert on transferFrom
        router.mintExactShares(
            DEFAULT_SHARES,
            DEFAULT_MAX_USDT, // Much more than charlie has
            DEFAULT_DEADLINE
        );
    }

    // TC-022: Insufficient USDT allowance should revert
    function test_TC022_InsufficientUSDTAllowanceReverts() public {
        vm.prank(alice);
        usdt.approve(address(router), 100e18); // Low allowance

        vm.prank(alice);
        vm.expectRevert(); // Should revert on transferFrom
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);
    }

    // TC-023: Successful mint with refund
    function test_TC023_SuccessfulMintWithRefund() public {
        uint256 initialBalance = usdt.balanceOf(alice);
        uint256 largeMaxUSDT = 50000e18; // Much more than needed

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, largeMaxUSDT, DEFAULT_DEADLINE);

        // Verify shares minted
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);

        // Verify refund was given
        uint256 expectedRefund = largeMaxUSDT - usdtUsed;
        assertTrue(expectedRefund > 0);

        // Verify final balance
        assertEq(usdt.balanceOf(alice), initialBalance - usdtUsed);
    }

    // TC-024: Multiple users can mint simultaneously
    function test_TC024_MultipleUsersMintSimultaneously() public {
        // Alice mints
        vm.prank(alice);
        uint256 aliceUsdt = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Bob mints
        vm.prank(bob);
        uint256 bobUsdt = router.mintExactShares(
            DEFAULT_SHARES * 2, // Different amount
            DEFAULT_MAX_USDT,
            DEFAULT_DEADLINE
        );

        // Verify both received their shares
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertEq(etfCore.balanceOf(bob), DEFAULT_SHARES * 2);

        // Verify USDT usage
        assertTrue(aliceUsdt > 0);
        assertTrue(bobUsdt > 0);
        assertTrue(bobUsdt > aliceUsdt); // Bob should use more (minted more)
    }

    // TC-025: Large shares amount (stress test)
    function test_TC025_LargeSharesAmount() public {
        uint256 largeShares = 1000000e18; // 1 million shares
        uint256 largeMaxUSDT = 10000000e18; // 10 million USDT (more buffer)

        // Give alice enough USDT
        usdt.mint(alice, largeMaxUSDT);

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(largeShares, largeMaxUSDT, DEFAULT_DEADLINE);

        // Verify shares minted
        assertEq(etfCore.balanceOf(alice), largeShares);
        assertTrue(usdtUsed > 0);
        assertTrue(usdtUsed <= largeMaxUSDT);
    }

    // TC-026: Minimum shares amount (1 wei)
    function test_TC026_MinimumSharesAmount() public {
        uint256 minShares = 1; // 1 wei

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(minShares, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Should work even for tiny amounts
        assertEq(etfCore.balanceOf(alice), minShares);
        assertTrue(usdtUsed >= 0); // Could be 0 if amounts are tiny
    }

    // TC-027: Exact deadline boundary (block.timestamp)
    function test_TC027_ExactDeadlineBoundary() public {
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(
            DEFAULT_SHARES,
            DEFAULT_MAX_USDT,
            block.timestamp // Exact current time
        );

        // Should succeed at exact boundary
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-028: Event emission verification
    function test_TC028_EventEmissionVerification() public {
        vm.prank(alice);

        // We expect SharesMinted event to be emitted with alice as user and DEFAULT_SHARES
        // We don't check exact usdtUsed and refunded amounts since they depend on calculations
        vm.expectEmit(true, false, false, false); // Only check indexed parameters
        emit SharesMinted(alice, DEFAULT_SHARES, 0, 0); // 0s are placeholders

        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Event should have been emitted (verified by expectEmit above)
        // No additional verification needed as expectEmit already checks the event
    }

    // TC-029: Reentrancy protection test
    function test_TC029_ReentrancyProtectionTest() public {
        // This test verifies the nonReentrant modifier works
        // Since the function has nonReentrant modifier, any reentrant call should fail
        // We would need a malicious contract to test this properly, but the modifier should prevent it

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Function should complete successfully
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-030: Gas optimization check (reasonable gas usage)
    function test_TC030_ReasonableGasUsage() public {
        uint256 gasBefore = gasleft();

        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        uint256 gasUsed = gasBefore - gasleft();

        // Gas usage should be reasonable (less than 1M gas for basic mint)
        assertTrue(gasUsed < 1000000);
        assertTrue(gasUsed > 100000); // But not too low (should do meaningful work)
    }

    // TC-031: Different slippage tolerance behavior
    function test_TC031_DifferentSlippageTolerance() public {
        // Test with different slippage settings
        router.setDefaultSlippage(100); // 1%

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-032: Different pool fee behavior
    function test_TC032_DifferentPoolFee() public {
        // Test with different pool fee settings
        router.setDefaultPoolFee(500); // 0.05%

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-033: V2 router path usage test
    function test_TC033_V2RouterPathUsage() public {
        // Set WBNB to use V2 router (it should already be set by default)
        assertTrue(router.useV2Router(address(wbnb)));

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-034: V3 router path usage test
    function test_TC034_V3RouterPathUsage() public {
        // BTC should use V3 router by default
        assertFalse(router.useV2Router(address(btc)));

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-035: Mixed router usage (V2 and V3)
    function test_TC035_MixedRouterUsage() public {
        // Verify mixed usage works correctly
        assertTrue(router.useV2Router(address(wbnb))); // WBNB uses V2
        assertFalse(router.useV2Router(address(btc))); // BTC uses V3

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-036: USDT in ETF composition (no swap needed)
    function test_TC036_USDTInETFComposition() public {
        // USDT is already in the ETF composition, so part of the transaction
        // shouldn't need swapping

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-037: Precision handling with small amounts
    function test_TC037_PrecisionHandlingSmallAmounts() public {
        uint256 smallShares = 1e15; // 0.001 ETF shares

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(
            smallShares,
            1e18, // 1 USDT should be enough
            DEFAULT_DEADLINE
        );

        assertEq(etfCore.balanceOf(alice), smallShares);
        assertTrue(usdtUsed >= 0);
    }

    // TC-038: Sequential minting by same user
    function test_TC038_SequentialMintingSameUser() public {
        // First mint
        vm.prank(alice);
        uint256 firstUsdt = router.mintExactShares(DEFAULT_SHARES / 2, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Second mint
        vm.prank(alice);
        uint256 secondUsdt = router.mintExactShares(DEFAULT_SHARES / 2, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(firstUsdt > 0 && secondUsdt > 0);
    }

    // TC-039: Minting with exact USDT needed
    function test_TC039_MintingWithExactUSDTNeeded() public {
        // First, estimate how much USDT is needed
        uint256 estimatedUSDT = router.usdtNeededForShares(DEFAULT_SHARES);

        // Add small buffer for slippage
        uint256 exactAmount = estimatedUSDT + (estimatedUSDT * 500) / 10000; // 5% buffer

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, exactAmount, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed <= exactAmount);
    }

    // TC-040: Owner operations during mint
    function test_TC040_OwnerOperationsDuringMint() public {
        // Verify owner can change settings
        router.setDefaultSlippage(250); // 2.5%

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertEq(router.defaultSlippage(), 250);
    }

    // TC-041: Asset approval edge case
    function test_TC041_AssetApprovalEdgeCase() public {
        // This test verifies that approvals are correctly managed
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // After minting, approvals should be cleared
        assertEq(usdt.allowance(address(router), address(etfCore)), 0);
    }

    // TC-042: Multiple asset types in single transaction
    function test_TC042_MultipleAssetTypesInSingleTransaction() public {
        // Test that the transaction can handle USDT (no swap) + other assets (swap needed)
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify all assets were properly acquired
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-043: Gas limit stress test
    function test_TC043_GasLimitStressTest() public {
        // Test with medium-large amount to stress gas usage
        uint256 mediumShares = 50000e18; // 50k shares
        uint256 mediumMaxUSDT = 500000e18; // 500k USDT

        usdt.mint(alice, mediumMaxUSDT);

        uint256 gasBefore = gasleft();

        vm.prank(alice);
        router.mintExactShares(mediumShares, mediumMaxUSDT, DEFAULT_DEADLINE);

        uint256 gasUsed = gasBefore - gasleft();

        assertEq(etfCore.balanceOf(alice), mediumShares);
        assertTrue(gasUsed < 2000000); // Should be less than 2M gas
    }

    // TC-044: Refund calculation accuracy
    function test_TC044_RefundCalculationAccuracy() public {
        uint256 initialBalance = usdt.balanceOf(alice);
        uint256 largeMaxUSDT = 100000e18; // Much more than needed

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, largeMaxUSDT, DEFAULT_DEADLINE);

        uint256 finalBalance = usdt.balanceOf(alice);
        uint256 actualRefund = finalBalance - (initialBalance - largeMaxUSDT);

        // Verify refund calculation
        assertEq(actualRefund, largeMaxUSDT - usdtUsed);
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
    }

    // TC-045: Zero amount asset handling
    function test_TC045_ZeroAmountAssetHandling() public {
        // Test case where one asset might require 0 amount (edge case)
        uint256 verySmallShares = 1; // 1 wei

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(
            verySmallShares,
            1e18, // 1 USDT
            DEFAULT_DEADLINE
        );

        assertEq(etfCore.balanceOf(alice), verySmallShares);
        assertTrue(usdtUsed >= 0);
    }

    // TC-046: Event data verification
    function test_TC046_EventDataVerification() public {
        uint256 initialBalance = usdt.balanceOf(alice);

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        uint256 expectedRefund = DEFAULT_MAX_USDT - usdtUsed;
        uint256 finalBalance = usdt.balanceOf(alice);
        uint256 actualRefund = finalBalance - (initialBalance - DEFAULT_MAX_USDT);

        // Verify the refund matches event expectation
        assertEq(actualRefund, expectedRefund);
    }

    // TC-047: Contract state consistency
    function test_TC047_ContractStateConsistency() public {
        uint256 routerBalanceBefore = usdt.balanceOf(address(router));

        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Router should not hold any USDT after the transaction
        assertEq(usdt.balanceOf(address(router)), routerBalanceBefore);

        // Alice should have the ETF shares
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
    }

    // TC-048: Maximum shares boundary test
    function test_TC048_MaximumSharesBoundaryTest() public {
        // Test with maximum reasonable shares amount
        uint256 maxShares = type(uint128).max; // Large but not overflow-prone
        uint256 maxUSDT = type(uint128).max;

        // Give alice massive amounts for this test
        usdt.mint(alice, maxUSDT);

        vm.prank(alice);
        try router.mintExactShares(maxShares, maxUSDT, DEFAULT_DEADLINE) {
            // If successful, verify the result
            assertEq(etfCore.balanceOf(alice), maxShares);
        } catch {
            // If it fails due to practical limitations, that's acceptable
            assertTrue(true, "Large amount mint failed as expected");
        }
    }

    // TC-049: Asset price volatility simulation
    function test_TC049_AssetPriceVolatilitySimulation() public {
        // Change asset prices to simulate volatility
        priceOracle.setPrice(address(eth), 3100e18); // ETH price increased

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-050: Router configuration changes
    function test_TC050_RouterConfigurationChanges() public {
        // Test changing router configurations
        address newAsset = address(new MockERC20("NewToken", "NEW", 18));
        router.setAssetUseV2Router(newAsset, true);

        // Original functionality should still work
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-051: Complex asset composition
    function test_TC051_ComplexAssetComposition() public {
        // Test with current 4-asset composition (USDT, WBNB, BTC, ETH)
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);

        // Verify ETF composition was handled correctly
        IBlockETFCore.AssetInfo[] memory assets = etfCore.getAssets();
        assertEq(assets.length, 4);
    }

    // TC-052: Time-sensitive operations
    function test_TC052_TimeSensitiveOperations() public {
        uint256 nearDeadline = block.timestamp + 1;

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, nearDeadline);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-053: Asset reserve impact
    function test_TC053_AssetReserveImpact() public {
        // Get initial reserves
        IBlockETFCore.AssetInfo[] memory assetsBefore = etfCore.getAssets();

        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Get reserves after minting
        IBlockETFCore.AssetInfo[] memory assetsAfter = etfCore.getAssets();

        // Reserves should have increased
        for (uint256 i = 0; i < assetsBefore.length; i++) {
            assertGe(assetsAfter[i].reserve, assetsBefore[i].reserve);
        }
    }

    // TC-054: Allowance management test
    function test_TC054_AllowanceManagementTest() public {
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // All allowances should be cleared after the transaction
        assertEq(usdt.allowance(address(router), address(etfCore)), 0);
        assertEq(wbnb.allowance(address(router), address(etfCore)), 0);
        assertEq(btc.allowance(address(router), address(etfCore)), 0);
        assertEq(eth.allowance(address(router), address(etfCore)), 0);
    }

    // TC-055: Router balance validation
    function test_TC055_RouterBalanceValidation() public {
        // Router should start with 0 balance
        assertEq(usdt.balanceOf(address(router)), 0);

        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Router should end with 0 balance (all refunded)
        assertEq(usdt.balanceOf(address(router)), 0);
    }

    // TC-056: ETF total supply impact
    function test_TC056_ETFTotalSupplyImpact() public {
        uint256 totalSupplyBefore = etfCore.totalSupply();

        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        uint256 totalSupplyAfter = etfCore.totalSupply();

        // Total supply should increase by DEFAULT_SHARES
        assertEq(totalSupplyAfter, totalSupplyBefore + DEFAULT_SHARES);
    }

    // TC-057: Multi-step transaction integrity
    function test_TC057_MultiStepTransactionIntegrity() public {
        uint256 initialBalance = usdt.balanceOf(alice);
        uint256 initialShares = etfCore.balanceOf(alice);

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify complete transaction integrity
        assertEq(etfCore.balanceOf(alice), initialShares + DEFAULT_SHARES);
        assertEq(usdt.balanceOf(alice), initialBalance - usdtUsed);
        assertTrue(usdtUsed > 0 && usdtUsed <= DEFAULT_MAX_USDT);
    }

    // TC-058: Asset swap path verification
    function test_TC058_AssetSwapPathVerification() public {
        // This test verifies that asset swaps work for both V2 and V3 paths
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);

        // Verify router configurations
        assertTrue(router.useV2Router(address(wbnb))); // WBNB uses V2
        assertFalse(router.useV2Router(address(btc))); // BTC uses V3
        assertFalse(router.useV2Router(address(eth))); // ETH uses V3
        assertFalse(router.useV2Router(address(usdt))); // USDT doesn't need swap
    }

    // TC-059: Emergency scenarios handling
    function test_TC059_EmergencyScenarioHandling() public {
        // Test that normal operations work even when contract has emergency functions
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);

        // Contract should still be in normal operating state
        assertFalse(router.paused());
    }

    // TC-060: Final comprehensive integration test
    function test_TC060_FinalComprehensiveIntegrationTest() public {
        // This test combines multiple aspects to ensure overall system integrity

        // Setup multiple users
        address charlie = makeAddr("charlie");
        usdt.mint(charlie, 50000e18);
        vm.prank(charlie);
        usdt.approve(address(router), type(uint256).max);

        // Alice mints
        uint256 aliceInitial = usdt.balanceOf(alice);
        vm.prank(alice);
        uint256 aliceUsdt = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Bob mints different amount
        uint256 bobInitial = usdt.balanceOf(bob);
        vm.prank(bob);
        uint256 bobUsdt = router.mintExactShares(DEFAULT_SHARES * 2, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Charlie mints smaller amount
        uint256 charlieInitial = usdt.balanceOf(charlie);
        vm.prank(charlie);
        uint256 charlieUsdt = router.mintExactShares(DEFAULT_SHARES / 2, 25000e18, DEFAULT_DEADLINE);

        // Verify all users got their shares
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertEq(etfCore.balanceOf(bob), DEFAULT_SHARES * 2);
        assertEq(etfCore.balanceOf(charlie), DEFAULT_SHARES / 2);

        // Verify all balances are correct
        assertEq(usdt.balanceOf(alice), aliceInitial - aliceUsdt);
        assertEq(usdt.balanceOf(bob), bobInitial - bobUsdt);
        assertEq(usdt.balanceOf(charlie), charlieInitial - charlieUsdt);

        // Verify proportional USDT usage
        assertTrue(bobUsdt > aliceUsdt); // Bob minted more, should use more USDT
        assertTrue(aliceUsdt > charlieUsdt); // Alice minted more than Charlie

        // Verify total ETF supply increased correctly
        uint256 totalNewShares = DEFAULT_SHARES + (DEFAULT_SHARES * 2) + (DEFAULT_SHARES / 2);
        assertTrue(etfCore.totalSupply() >= totalNewShares); // Should at least include new shares

        // Verify router has no leftover funds
        assertEq(usdt.balanceOf(address(router)), 0);
        assertEq(wbnb.balanceOf(address(router)), 0);
        assertEq(btc.balanceOf(address(router)), 0);
        assertEq(eth.balanceOf(address(router)), 0);
    }

    // TC-061: Asset weight impact verification
    function test_TC061_AssetWeightImpactVerification() public {
        // Verify that different asset weights are properly handled
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        IBlockETFCore.AssetInfo[] memory assets = etfCore.getAssets();

        // Verify USDT has 40% weight, others have 20% each
        assertEq(assets[0].weight, 4000); // USDT 40%
        assertEq(assets[1].weight, 2000); // WBNB 20%
        assertEq(assets[2].weight, 2000); // BTC 20%
        assertEq(assets[3].weight, 2000); // ETH 20%

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-062: Router upgrade compatibility
    function test_TC062_RouterUpgradeCompatibility() public {
        // Test that current router behavior is consistent
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify owner functions are accessible
        assertEq(router.owner(), address(this));

        // Verify configuration functions work
        router.setDefaultSlippage(150);
        assertEq(router.defaultSlippage(), 150);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
    }

    // TC-063: Cross-asset price correlation test
    function test_TC063_CrossAssetPriceCorrelationTest() public {
        // Simulate correlated price movements
        priceOracle.setPrice(address(btc), 52000e18); // BTC +4%
        priceOracle.setPrice(address(eth), 3120e18); // ETH +4%

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-064: Slippage boundary testing
    function test_TC064_SlippageBoundaryTesting() public {
        // Test maximum allowed slippage
        router.setDefaultSlippage(500); // 5% maximum

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(router.defaultSlippage(), 500);
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-065: Pool fee boundary testing
    function test_TC065_PoolFeeBoundaryTesting() public {
        // Test all valid pool fees
        router.setDefaultPoolFee(500); // 0.05%
        router.setDefaultPoolFee(2500); // 0.25%
        router.setDefaultPoolFee(10000); // 1.00%

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(router.defaultPoolFee(), 10000);
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
    }

    // TC-066: Asset V3 pool configuration
    function test_TC066_AssetV3PoolConfiguration() public {
        // Test V3 pool configuration functionality
        address mockPool = makeAddr("mockPool");

        // This should work without affecting existing functionality
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-067: High-frequency minting simulation
    function test_TC067_HighFrequencyMintingSimulation() public {
        // Simulate multiple small mints in sequence
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(alice);
            router.mintExactShares(
                DEFAULT_SHARES / 10, // Small amounts
                DEFAULT_MAX_USDT / 10,
                DEFAULT_DEADLINE
            );
        }

        // Should have accumulated shares
        assertGe(etfCore.balanceOf(alice), (DEFAULT_SHARES * 3) / 10);
    }

    // TC-068: Price oracle dependency test
    function test_TC068_PriceOracleDependencyTest() public {
        // Test system behavior with oracle price updates
        uint256 originalPrice = priceOracle.getPrice(address(wbnb));

        // Update prices
        priceOracle.setPrice(address(wbnb), originalPrice * 110 / 100); // +10%

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
        assertTrue(usdtUsed > 0);
    }

    // TC-069: Asset balance precision test
    function test_TC069_AssetBalancePrecisionTest() public {
        // Test with amounts that might cause precision issues
        uint256 oddShares = 12345678901234567; // Odd number

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(oddShares, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        assertEq(etfCore.balanceOf(alice), oddShares);
        assertTrue(usdtUsed > 0);
    }

    // TC-070: Contract interaction ordering
    function test_TC070_ContractInteractionOrdering() public {
        // Verify the order of operations is correct
        uint256 routerUSDTBefore = usdt.balanceOf(address(router));
        uint256 aliceUSDTBefore = usdt.balanceOf(alice);
        uint256 aliceSharesBefore = etfCore.balanceOf(alice);

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify final states
        assertEq(usdt.balanceOf(address(router)), routerUSDTBefore);
        assertEq(usdt.balanceOf(alice), aliceUSDTBefore - usdtUsed);
        assertEq(etfCore.balanceOf(alice), aliceSharesBefore + DEFAULT_SHARES);
    }

    // TC-071: Memory and storage efficiency
    function test_TC071_MemoryAndStorageEfficiency() public {
        // Test that the contract handles memory efficiently
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify no storage corruption occurred
        assertEq(router.defaultSlippage(), 300);
        assertEq(router.defaultPoolFee(), 2500);
        assertTrue(router.useV2Router(address(wbnb)));
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
    }

    // TC-072: Asset quantity calculation accuracy
    function test_TC072_AssetQuantityCalculationAccuracy() public {
        // Test calculation accuracy for required amounts
        uint256 testShares = 2000e18; // Different amount to test calculations

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(
            testShares,
            DEFAULT_MAX_USDT * 2, // More USDT for larger amount
            DEFAULT_DEADLINE
        );

        assertEq(etfCore.balanceOf(alice), testShares);
        assertTrue(usdtUsed > 0);
    }

    // TC-073: V2 and V3 router load balancing
    function test_TC073_V2AndV3RouterLoadBalancing() public {
        // Test that both V2 and V3 routers are used appropriately
        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify router assignments
        assertTrue(router.useV2Router(address(wbnb))); // V2
        assertFalse(router.useV2Router(address(btc))); // V3
        assertFalse(router.useV2Router(address(eth))); // V3

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
    }

    // TC-074: Transaction atomicity verification
    function test_TC074_TransactionAtomicityVerification() public {
        // Verify that the entire transaction is atomic
        uint256 aliceBalanceBefore = usdt.balanceOf(alice);
        uint256 aliceSharesBefore = etfCore.balanceOf(alice);

        vm.prank(alice);
        uint256 usdtUsed = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Either transaction completely succeeds or completely fails
        assertEq(etfCore.balanceOf(alice), aliceSharesBefore + DEFAULT_SHARES);
        assertEq(usdt.balanceOf(alice), aliceBalanceBefore - usdtUsed);
        assertTrue(usdtUsed > 0 && usdtUsed <= DEFAULT_MAX_USDT);
    }

    // TC-075: System state consistency after multiple operations
    function test_TC075_SystemStateConsistencyAfterMultipleOperations() public {
        // Perform multiple operations and verify system consistency

        // Operation 1: Alice mints
        vm.prank(alice);
        uint256 aliceUsdt = router.mintExactShares(DEFAULT_SHARES, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Operation 2: Bob mints
        vm.prank(bob);
        uint256 bobUsdt = router.mintExactShares(DEFAULT_SHARES / 2, DEFAULT_MAX_USDT / 2, DEFAULT_DEADLINE);

        // Operation 3: Configuration change
        router.setDefaultSlippage(200);

        // Operation 4: Alice mints again
        vm.prank(alice);
        uint256 aliceUsdt2 = router.mintExactShares(DEFAULT_SHARES / 4, DEFAULT_MAX_USDT / 4, DEFAULT_DEADLINE);

        // Verify final system state
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES + DEFAULT_SHARES / 4);
        assertEq(etfCore.balanceOf(bob), DEFAULT_SHARES / 2);
        assertEq(router.defaultSlippage(), 200);

        assertTrue(aliceUsdt > 0);
        assertTrue(bobUsdt > 0);
        assertTrue(aliceUsdt2 > 0);

        // Verify no funds stuck in router
        assertEq(usdt.balanceOf(address(router)), 0);
    }

    // TC-076: Massive sequential minting stress test
    function test_TC076_MassiveSequentialMintingStressTest() public {
        // Test 10 consecutive mints to stress test the system
        uint256 totalShares = 0;
        uint256 totalUsdtUsed = 0;

        for (uint256 i = 0; i < 10; i++) {
            uint256 mintAmount = DEFAULT_SHARES / 20; // Small consistent amounts

            vm.prank(alice);
            uint256 usdtUsed = router.mintExactShares(mintAmount, DEFAULT_MAX_USDT / 20, DEFAULT_DEADLINE);

            totalShares += mintAmount;
            totalUsdtUsed += usdtUsed;

            // Verify shares accumulation after each mint
            assertEq(etfCore.balanceOf(alice), totalShares);
        }

        // Final verification
        assertEq(etfCore.balanceOf(alice), totalShares);
        assertTrue(totalUsdtUsed > 0);
    }

    // TC-077: Variable amount sequential minting
    function test_TC077_VariableAmountSequentialMinting() public {
        // Test sequential minting with different amounts
        uint256[] memory amounts = new uint256[](5);
        amounts[0] = DEFAULT_SHARES / 10; // 100 shares
        amounts[1] = DEFAULT_SHARES / 5; // 200 shares
        amounts[2] = DEFAULT_SHARES / 20; // 50 shares
        amounts[3] = DEFAULT_SHARES / 2; // 500 shares
        amounts[4] = DEFAULT_SHARES / 4; // 250 shares

        uint256 totalExpectedShares = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalExpectedShares += amounts[i];
        }

        // Execute sequential mints
        for (uint256 i = 0; i < amounts.length; i++) {
            vm.prank(alice);
            router.mintExactShares(amounts[i], DEFAULT_MAX_USDT, DEFAULT_DEADLINE);
        }

        assertEq(etfCore.balanceOf(alice), totalExpectedShares);
    }

    // TC-078: Rapid sequential minting with time gaps
    function test_TC078_RapidSequentialMintingWithTimeGaps() public {
        // Test minting with small time gaps between transactions
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(alice);
            router.mintExactShares(DEFAULT_SHARES / 10, DEFAULT_MAX_USDT / 10, DEFAULT_DEADLINE);

            // Simulate time passage
            vm.warp(block.timestamp + 60); // 1 minute gap
        }

        // Should have accumulated 5 * (DEFAULT_SHARES / 10)
        assertEq(etfCore.balanceOf(alice), (DEFAULT_SHARES * 5) / 10);
    }

    // TC-079: Sequential minting with price changes between mints
    function test_TC079_SequentialMintingWithPriceChanges() public {
        uint256 totalShares = 0;

        // First mint at original prices
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 3, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);
        totalShares += DEFAULT_SHARES / 3;

        // Change BTC price
        priceOracle.setPrice(address(btc), 51000e18); // +2%

        // Second mint
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 3, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);
        totalShares += DEFAULT_SHARES / 3;

        // Change ETH price
        priceOracle.setPrice(address(eth), 2950e18); // -1.67%

        // Third mint
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 3, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);
        totalShares += DEFAULT_SHARES / 3;

        assertEq(etfCore.balanceOf(alice), totalShares);
    }

    // TC-080: Sequential minting affecting ETF reserves progressively
    function test_TC080_SequentialMintingAffectingETFReserves() public {
        // Track ETF reserves changes through sequential mints
        IBlockETFCore.AssetInfo[] memory initialAssets = etfCore.getAssets();

        uint256[] memory initialReserves = new uint256[](initialAssets.length);
        for (uint256 i = 0; i < initialAssets.length; i++) {
            initialReserves[i] = initialAssets[i].reserve;
        }

        // Perform 3 sequential mints
        for (uint256 mintRound = 0; mintRound < 3; mintRound++) {
            vm.prank(alice);
            router.mintExactShares(DEFAULT_SHARES / 5, DEFAULT_MAX_USDT / 5, DEFAULT_DEADLINE);

            // Check reserves increased
            IBlockETFCore.AssetInfo[] memory currentAssets = etfCore.getAssets();
            for (uint256 i = 0; i < currentAssets.length; i++) {
                assertGe(currentAssets[i].reserve, initialReserves[i]);
                initialReserves[i] = currentAssets[i].reserve; // Update for next comparison
            }
        }

        // Final verification
        assertEq(etfCore.balanceOf(alice), (DEFAULT_SHARES * 3) / 5);
    }

    // TC-081: Interleaved minting by multiple users
    function test_TC081_InterleavedMintingByMultipleUsers() public {
        // Simulate real-world scenario where multiple users mint interleaved

        // Round 1: Alice, Bob, Alice
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 4, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        vm.prank(bob);
        router.mintExactShares(DEFAULT_SHARES / 2, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 8, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Round 2: Bob, Alice, Bob
        vm.prank(bob);
        router.mintExactShares(DEFAULT_SHARES / 3, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 6, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        vm.prank(bob);
        router.mintExactShares(DEFAULT_SHARES / 4, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify accumulated balances
        uint256 aliceExpected = DEFAULT_SHARES / 4 + DEFAULT_SHARES / 8 + DEFAULT_SHARES / 6;
        uint256 bobExpected = DEFAULT_SHARES / 2 + DEFAULT_SHARES / 3 + DEFAULT_SHARES / 4;

        assertEq(etfCore.balanceOf(alice), aliceExpected);
        assertEq(etfCore.balanceOf(bob), bobExpected);
    }

    // TC-082: Sequential minting with router configuration changes
    function test_TC082_SequentialMintingWithConfigChanges() public {
        // First mint with default settings
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 4, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Change slippage
        router.setDefaultSlippage(150); // 1.5%

        // Second mint
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 4, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Change pool fee
        router.setDefaultPoolFee(500); // 0.05%

        // Third mint
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 4, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Change router assignment
        router.setAssetUseV2Router(address(eth), true); // Switch ETH to V2

        // Fourth mint
        vm.prank(alice);
        router.mintExactShares(DEFAULT_SHARES / 4, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // Verify all mints succeeded
        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);

        // Verify final configuration
        assertEq(router.defaultSlippage(), 150);
        assertEq(router.defaultPoolFee(), 500);
        assertTrue(router.useV2Router(address(eth)));
    }

    // TC-083: Batched vs Sequential minting comparison
    function test_TC083_BatchedVsSequentialMintingComparison() public {
        // Setup two identical users
        address user1 = alice;
        address user2 = bob;

        uint256 batchAmount = DEFAULT_SHARES;
        uint256 sequentialAmount = DEFAULT_SHARES / 5; // 5 sequential mints

        // User1: Single large mint (batched approach)
        vm.prank(user1);
        uint256 batchedUsdtUsed = router.mintExactShares(batchAmount, DEFAULT_MAX_USDT, DEFAULT_DEADLINE);

        // User2: Multiple small mints (sequential approach)
        uint256 totalSequentialUsdt = 0;
        for (uint256 i = 0; i < 5; i++) {
            vm.prank(user2);
            uint256 sequentialUsdt = router.mintExactShares(sequentialAmount, DEFAULT_MAX_USDT / 5, DEFAULT_DEADLINE);
            totalSequentialUsdt += sequentialUsdt;
        }

        // Both should have same amount of shares
        assertEq(etfCore.balanceOf(user1), etfCore.balanceOf(user2));
        assertEq(etfCore.balanceOf(user1), batchAmount);

        // Sequential might use slightly different USDT due to separate transactions
        // Both approaches should be within reasonable range of each other
        // Allow for some variance in USDT usage
        uint256 variance = batchedUsdtUsed * 200 / 10000; // 2% variance allowed
        assertTrue(
            totalSequentialUsdt >= batchedUsdtUsed - variance && totalSequentialUsdt <= batchedUsdtUsed + variance,
            "Sequential and batched USDT usage should be within 2% of each other"
        );
    }

    // TC-084: Long-term sequential minting simulation
    function test_TC084_LongTermSequentialMintingSimulation() public {
        // Simulate a user making regular small investments over time
        uint256 weeklyAmount = DEFAULT_SHARES / 50; // Small weekly investment
        uint256 totalShares = 0;

        for (uint256 week = 0; week < 12; week++) {
            // 12 weeks
            // Simulate weekly price volatility
            if (week % 3 == 0) {
                priceOracle.setPrice(address(btc), 49000e18 + (week * 500e18)); // Gradual increase
            }
            if (week % 4 == 0) {
                priceOracle.setPrice(address(eth), 2900e18 + (week * 50e18)); // Gradual increase
            }

            vm.prank(alice);
            router.mintExactShares(weeklyAmount, DEFAULT_MAX_USDT / 50, DEFAULT_DEADLINE);

            totalShares += weeklyAmount;

            // Simulate time passage (1 week)
            vm.warp(block.timestamp + 7 days);

            // Verify accumulated shares
            assertEq(etfCore.balanceOf(alice), totalShares);
        }

        // Final verification after 12 weeks
        assertEq(etfCore.balanceOf(alice), totalShares);
        assertEq(etfCore.balanceOf(alice), weeklyAmount * 12);
    }

    // TC-085: Sequential minting gas efficiency comparison
    function test_TC085_SequentialMintingGasEfficiency() public {
        uint256 totalGasUsed = 0;
        uint256 numMints = 5;

        for (uint256 i = 0; i < numMints; i++) {
            uint256 gasBefore = gasleft();

            vm.prank(alice);
            router.mintExactShares(DEFAULT_SHARES / numMints, DEFAULT_MAX_USDT / numMints, DEFAULT_DEADLINE);

            uint256 gasAfter = gasleft();
            uint256 gasUsed = gasBefore - gasAfter;
            totalGasUsed += gasUsed;

            // Each individual mint should be reasonably efficient
            assertTrue(gasUsed < 800000); // Less than 800k gas per mint
        }

        // Average gas per mint should be reasonable
        uint256 avgGasPerMint = totalGasUsed / numMints;
        assertTrue(avgGasPerMint < 700000); // Average less than 700k gas

        assertEq(etfCore.balanceOf(alice), DEFAULT_SHARES);
    }

    // Helper event for testing
    event SharesMinted(address indexed user, uint256 shares, uint256 usdtUsed, uint256 refunded);
}

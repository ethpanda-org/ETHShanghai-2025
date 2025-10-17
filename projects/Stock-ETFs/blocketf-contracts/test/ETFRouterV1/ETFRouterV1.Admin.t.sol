// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ETFRouterV1Test.Base.sol";
import "../../src/interfaces/IPancakeV3Pool.sol";

/**
 * @title ETFRouterV1 Admin/Management Functions Test
 * @notice Comprehensive tests for all admin/management functions
 * @dev Covers TC-226 to TC-275 from test plan plus additional edge cases
 */
contract ETFRouterV1AdminTest is ETFRouterV1TestBase {
    // Additional test accounts
    address public attacker = makeAddr("attacker");

    // Mock pool for testing
    MockV3Pool public btcPool;
    MockV3Pool public ethPool;

    // Events to test
    event PoolSet(address indexed asset, address indexed pool);
    event Paused(address account);
    event Unpaused(address account);

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

        // Deploy mock pools
        btcPool = new MockV3Pool(address(btc), address(usdt), 2500);
        ethPool = new MockV3Pool(address(eth), address(usdt), 500);
    }

    /*//////////////////////////////////////////////////////////////
                    SETDEFAULTSLIPPAGE TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-226: Normal setting (100 bps = 1%)
    function test_setDefaultSlippage_Normal100() public {
        vm.prank(admin);
        router.setDefaultSlippage(100);

        assertEq(router.defaultSlippage(), 100, "Slippage should be 100");
    }

    // TC-227: Normal setting (300 bps = 3%)
    function test_setDefaultSlippage_Normal300() public {
        vm.prank(admin);
        router.setDefaultSlippage(300);

        assertEq(router.defaultSlippage(), 300, "Slippage should be 300");
    }

    // TC-228: Maximum value (500 bps = 5%)
    function test_setDefaultSlippage_MaxValue() public {
        vm.prank(admin);
        router.setDefaultSlippage(500);

        assertEq(router.defaultSlippage(), 500, "Slippage should be 500");
    }

    // TC-229: Reject above max (501)
    function test_setDefaultSlippage_RejectAboveMax() public {
        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidSlippage.selector);
        router.setDefaultSlippage(501);
    }

    // TC-230: Zero value setting
    function test_setDefaultSlippage_Zero() public {
        vm.prank(admin);
        router.setDefaultSlippage(0);

        assertEq(router.defaultSlippage(), 0, "Slippage should be 0");
    }

    // TC-231: Permission verification (only owner)
    function test_setDefaultSlippage_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        router.setDefaultSlippage(100);
    }

    // TC-232: Event emission - NOTE: No event defined in contract
    function test_setDefaultSlippage_EventEmission() public {
        vm.prank(admin);

        vm.expectEmit(true, true, true, true);
        emit IETFRouterV1.SlippageUpdated(200);

        router.setDefaultSlippage(200);
        assertEq(router.defaultSlippage(), 200);
    }

    // TC-233: State update verification
    function test_setDefaultSlippage_StateUpdate() public {
        uint256 oldSlippage = router.defaultSlippage();

        vm.prank(admin);
        router.setDefaultSlippage(250);

        uint256 newSlippage = router.defaultSlippage();
        assertTrue(newSlippage != oldSlippage, "State should change");
        assertEq(newSlippage, 250, "New value should be 250");
    }

    // ADDITIONAL: Multiple updates
    function test_setDefaultSlippage_MultipleUpdates() public {
        vm.startPrank(admin);

        router.setDefaultSlippage(100);
        assertEq(router.defaultSlippage(), 100);

        router.setDefaultSlippage(200);
        assertEq(router.defaultSlippage(), 200);

        router.setDefaultSlippage(500);
        assertEq(router.defaultSlippage(), 500);

        router.setDefaultSlippage(0);
        assertEq(router.defaultSlippage(), 0);

        vm.stopPrank();
    }

    // ADDITIONAL: Boundary testing
    function test_setDefaultSlippage_BoundaryMax() public {
        vm.prank(admin);
        router.setDefaultSlippage(500); // Exactly MAX_SLIPPAGE
        assertEq(router.defaultSlippage(), 500);
    }

    function test_setDefaultSlippage_BoundaryMaxPlusOne() public {
        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidSlippage.selector);
        router.setDefaultSlippage(501); // MAX_SLIPPAGE + 1
    }

    /*//////////////////////////////////////////////////////////////
                    SETDEFAULTPOOLFEE TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-234: Set FEE_LOW (500 = 0.05%)
    function test_setDefaultPoolFee_FeeLow() public {
        vm.prank(admin);
        router.setDefaultPoolFee(500);

        assertEq(router.defaultPoolFee(), 500, "Fee should be 500");
    }

    // TC-235: Set FEE_MEDIUM (2500 = 0.25%)
    function test_setDefaultPoolFee_FeeMedium() public {
        vm.prank(admin);
        router.setDefaultPoolFee(2500);

        assertEq(router.defaultPoolFee(), 2500, "Fee should be 2500");
    }

    // TC-236: Set FEE_HIGH (10000 = 1%)
    function test_setDefaultPoolFee_FeeHigh() public {
        vm.prank(admin);
        router.setDefaultPoolFee(10000);

        assertEq(router.defaultPoolFee(), 10000, "Fee should be 10000");
    }

    // TC-237: Reject invalid fee (1000)
    function test_setDefaultPoolFee_RejectInvalid() public {
        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidFee.selector);
        router.setDefaultPoolFee(1000);
    }

    // TC-238: Reject zero fee
    function test_setDefaultPoolFee_RejectZero() public {
        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidFee.selector);
        router.setDefaultPoolFee(0);
    }

    // TC-239: Permission check
    function test_setDefaultPoolFee_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        router.setDefaultPoolFee(2500);
    }

    // TC-240: Update verification
    function test_setDefaultPoolFee_UpdateVerification() public {
        vm.startPrank(admin);

        router.setDefaultPoolFee(500);
        assertEq(router.defaultPoolFee(), 500);

        router.setDefaultPoolFee(10000);
        assertEq(router.defaultPoolFee(), 10000);

        vm.stopPrank();
    }

    // ADDITIONAL: All valid fee tiers
    function test_setDefaultPoolFee_AllValidTiers() public {
        vm.startPrank(admin);

        uint24[3] memory validFees = [uint24(500), uint24(2500), uint24(10000)];

        for (uint256 i = 0; i < validFees.length; i++) {
            router.setDefaultPoolFee(validFees[i]);
            assertEq(router.defaultPoolFee(), validFees[i]);
        }

        vm.stopPrank();
    }

    // ADDITIONAL: Other common fees that should be rejected
    function test_setDefaultPoolFee_RejectOtherFees() public {
        vm.startPrank(admin);

        uint24[] memory invalidFees = new uint24[](4);
        invalidFees[0] = 100;
        invalidFees[1] = 3000;
        invalidFees[2] = 5000;
        invalidFees[3] = type(uint24).max;

        for (uint256 i = 0; i < invalidFees.length; i++) {
            vm.expectRevert(ETFRouterV1.InvalidFee.selector);
            router.setDefaultPoolFee(invalidFees[i]);
        }

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    SETASSETV3POOL TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-241: Valid pool setting
    function test_setAssetV3Pool_ValidPool() public {
        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit PoolSet(address(btc), address(btcPool));

        router.setAssetV3Pool(address(btc), address(btcPool));

        (address pool, uint24 fee) = router.getAssetV3Pool(address(btc));
        assertEq(pool, address(btcPool), "Pool should be set");
        assertEq(fee, 2500, "Fee should be pool's fee");
    }

    // TC-242: Zero address clears pool
    function test_setAssetV3Pool_ZeroAddressClear() public {
        // First set a pool
        vm.startPrank(admin);
        router.setAssetV3Pool(address(btc), address(btcPool));

        // Then clear it
        vm.expectEmit(true, true, false, true);
        emit PoolSet(address(btc), address(0));

        router.setAssetV3Pool(address(btc), address(0));

        (address pool,) = router.getAssetV3Pool(address(btc));
        assertEq(pool, address(0), "Pool should be cleared");

        vm.stopPrank();
    }

    // TC-243: Pool validation - token0 check
    function test_setAssetV3Pool_Token0Validation() public {
        // btcPool has btc as token0 and usdt as token1
        assertEq(btcPool.token0(), address(btc));
        assertEq(btcPool.token1(), address(usdt));

        vm.prank(admin);
        router.setAssetV3Pool(address(btc), address(btcPool));

        (address pool,) = router.getAssetV3Pool(address(btc));
        assertEq(pool, address(btcPool));
    }

    // TC-244: Pool validation - token1 check (reversed order)
    function test_setAssetV3Pool_Token1Validation() public {
        // Create pool with reversed token order
        MockV3Pool reversedPool = new MockV3Pool(address(usdt), address(eth), 500);

        assertEq(reversedPool.token0(), address(usdt));
        assertEq(reversedPool.token1(), address(eth));

        vm.prank(admin);
        router.setAssetV3Pool(address(eth), address(reversedPool));

        (address pool,) = router.getAssetV3Pool(address(eth));
        assertEq(pool, address(reversedPool));
    }

    // TC-245: Reject wrong pool
    function test_setAssetV3Pool_RejectWrongPool() public {
        // Try to set BTC pool for ETH asset
        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.PoolNotFound.selector);
        router.setAssetV3Pool(address(eth), address(btcPool));
    }

    // TC-246: Event verification
    function test_setAssetV3Pool_EventEmission() public {
        vm.prank(admin);

        vm.expectEmit(true, true, false, true);
        emit PoolSet(address(btc), address(btcPool));
        router.setAssetV3Pool(address(btc), address(btcPool));
    }

    // TC-247: Override/update pool
    function test_setAssetV3Pool_Override() public {
        vm.startPrank(admin);

        // Set first pool
        router.setAssetV3Pool(address(btc), address(btcPool));
        (address pool1,) = router.getAssetV3Pool(address(btc));
        assertEq(pool1, address(btcPool));

        // Create another pool for same asset
        MockV3Pool btcPool2 = new MockV3Pool(address(btc), address(usdt), 500);

        // Override with new pool
        router.setAssetV3Pool(address(btc), address(btcPool2));
        (address pool2,) = router.getAssetV3Pool(address(btc));
        assertEq(pool2, address(btcPool2));

        vm.stopPrank();
    }

    // TC-248: Batch association test (prepare for batch function)
    function test_setAssetV3Pool_MultipleAssets() public {
        vm.startPrank(admin);

        router.setAssetV3Pool(address(btc), address(btcPool));
        router.setAssetV3Pool(address(eth), address(ethPool));

        (address btcPoolAddr,) = router.getAssetV3Pool(address(btc));
        (address ethPoolAddr,) = router.getAssetV3Pool(address(eth));

        assertEq(btcPoolAddr, address(btcPool));
        assertEq(ethPoolAddr, address(ethPool));

        vm.stopPrank();
    }

    // ADDITIONAL: Zero asset address
    function test_setAssetV3Pool_ZeroAsset() public {
        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidAsset.selector);
        router.setAssetV3Pool(address(0), address(btcPool));
    }

    // ADDITIONAL: Pool with neither token matching
    function test_setAssetV3Pool_CompletelyWrongPool() public {
        // Pool with neither token being the asset or USDT
        MockV3Pool wrongPool = new MockV3Pool(address(wbnb), address(btc), 2500);

        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.PoolNotFound.selector);
        router.setAssetV3Pool(address(eth), address(wrongPool));
    }

    // ADDITIONAL: Attacker cannot set pool
    function test_setAssetV3Pool_AttackerBlocked() public {
        vm.prank(attacker);
        vm.expectRevert();
        router.setAssetV3Pool(address(btc), address(btcPool));
    }

    /*//////////////////////////////////////////////////////////////
                    SETASSETV3POOLSBATCH TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-249: Batch setting success
    function test_setAssetV3PoolsBatch_Success() public {
        address[] memory assets = new address[](2);
        address[] memory pools = new address[](2);

        assets[0] = address(btc);
        assets[1] = address(eth);
        pools[0] = address(btcPool);
        pools[1] = address(ethPool);

        vm.prank(admin);
        router.setAssetV3PoolsBatch(assets, pools);

        (address btcPoolAddr,) = router.getAssetV3Pool(address(btc));
        (address ethPoolAddr,) = router.getAssetV3Pool(address(eth));

        assertEq(btcPoolAddr, address(btcPool));
        assertEq(ethPoolAddr, address(ethPool));
    }

    // TC-250: Array length mismatch
    function test_setAssetV3PoolsBatch_LengthMismatch() public {
        address[] memory assets = new address[](2);
        address[] memory pools = new address[](1);

        assets[0] = address(btc);
        assets[1] = address(eth);
        pools[0] = address(btcPool);

        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidAsset.selector);
        router.setAssetV3PoolsBatch(assets, pools);
    }

    // TC-251: Contains zero address asset
    function test_setAssetV3PoolsBatch_ZeroAddressAsset() public {
        address[] memory assets = new address[](2);
        address[] memory pools = new address[](2);

        assets[0] = address(0); // Zero address
        assets[1] = address(eth);
        pools[0] = address(btcPool);
        pools[1] = address(ethPool);

        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidAsset.selector);
        router.setAssetV3PoolsBatch(assets, pools);
    }

    // TC-252: Partial invalid pool (should revert entire batch)
    function test_setAssetV3PoolsBatch_PartialInvalid() public {
        address[] memory assets = new address[](2);
        address[] memory pools = new address[](2);

        assets[0] = address(btc);
        assets[1] = address(eth);
        pools[0] = address(btcPool); // Valid
        pools[1] = address(btcPool); // Invalid for ETH

        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.PoolNotFound.selector);
        router.setAssetV3PoolsBatch(assets, pools);
    }

    // TC-253: All valid verification
    function test_setAssetV3PoolsBatch_AllValid() public {
        MockERC20 dai = new MockERC20("DAI", "DAI", 18);
        MockV3Pool daiPool = new MockV3Pool(address(dai), address(usdt), 500);

        address[] memory assets = new address[](3);
        address[] memory pools = new address[](3);

        assets[0] = address(btc);
        assets[1] = address(eth);
        assets[2] = address(dai);
        pools[0] = address(btcPool);
        pools[1] = address(ethPool);
        pools[2] = address(daiPool);

        vm.prank(admin);
        router.setAssetV3PoolsBatch(assets, pools);

        // Verify all set correctly
        (address pool0,) = router.getAssetV3Pool(address(btc));
        (address pool1,) = router.getAssetV3Pool(address(eth));
        (address pool2,) = router.getAssetV3Pool(address(dai));

        assertEq(pool0, address(btcPool));
        assertEq(pool1, address(ethPool));
        assertEq(pool2, address(daiPool));
    }

    // TC-254: Event batch emission
    function test_setAssetV3PoolsBatch_EventsEmitted() public {
        address[] memory assets = new address[](2);
        address[] memory pools = new address[](2);

        assets[0] = address(btc);
        assets[1] = address(eth);
        pools[0] = address(btcPool);
        pools[1] = address(ethPool);

        vm.prank(admin);

        // Expect two PoolSet events
        vm.expectEmit(true, true, false, true);
        emit PoolSet(address(btc), address(btcPool));
        vm.expectEmit(true, true, false, true);
        emit PoolSet(address(eth), address(ethPool));

        router.setAssetV3PoolsBatch(assets, pools);
    }

    // TC-255: Gas optimization verification
    function test_setAssetV3PoolsBatch_GasEfficiency() public {
        address[] memory assets = new address[](5);
        address[] memory pools = new address[](5);

        // Create 5 mock tokens and pools
        for (uint256 i = 0; i < 5; i++) {
            MockERC20 token = new MockERC20(string(abi.encodePacked("Token", i)), string(abi.encodePacked("TK", i)), 18);
            MockV3Pool pool = new MockV3Pool(address(token), address(usdt), 2500);

            assets[i] = address(token);
            pools[i] = address(pool);
        }

        vm.prank(admin);
        uint256 gasBefore = gasleft();
        router.setAssetV3PoolsBatch(assets, pools);
        uint256 gasUsed = gasBefore - gasleft();

        // Batch should be more efficient than 5 individual calls
        // Rough estimate: should use less than 500k gas for 5 pools
        assertLt(gasUsed, 500000, "Batch should be gas efficient");
    }

    // ADDITIONAL: Empty arrays
    function test_setAssetV3PoolsBatch_EmptyArrays() public {
        address[] memory assets = new address[](0);
        address[] memory pools = new address[](0);

        vm.prank(admin);
        // Should not revert, just do nothing
        router.setAssetV3PoolsBatch(assets, pools);
    }

    // ADDITIONAL: Single element
    function test_setAssetV3PoolsBatch_SingleElement() public {
        address[] memory assets = new address[](1);
        address[] memory pools = new address[](1);

        assets[0] = address(btc);
        pools[0] = address(btcPool);

        vm.prank(admin);
        router.setAssetV3PoolsBatch(assets, pools);

        (address pool,) = router.getAssetV3Pool(address(btc));
        assertEq(pool, address(btcPool));
    }

    // ADDITIONAL: Clearing multiple pools with batch
    function test_setAssetV3PoolsBatch_ClearMultiple() public {
        // First set pools
        vm.startPrank(admin);
        router.setAssetV3Pool(address(btc), address(btcPool));
        router.setAssetV3Pool(address(eth), address(ethPool));

        // Then clear them in batch
        address[] memory assets = new address[](2);
        address[] memory pools = new address[](2);

        assets[0] = address(btc);
        assets[1] = address(eth);
        pools[0] = address(0);
        pools[1] = address(0);

        router.setAssetV3PoolsBatch(assets, pools);

        (address pool0,) = router.getAssetV3Pool(address(btc));
        (address pool1,) = router.getAssetV3Pool(address(eth));

        assertEq(pool0, address(0));
        assertEq(pool1, address(0));

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    SETASSETUSEV2ROUTER TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-256: Set to use V2
    function test_setAssetUseV2Router_SetTrue() public {
        vm.prank(admin);
        router.setAssetUseV2Router(address(btc), true);

        assertTrue(router.useV2Router(address(btc)), "Should use V2");
    }

    // TC-257: Set to use V3 (false)
    function test_setAssetUseV2Router_SetFalse() public {
        // WBNB uses V2 by default
        assertTrue(router.useV2Router(address(wbnb)));

        vm.prank(admin);
        router.setAssetUseV2Router(address(wbnb), false);

        assertFalse(router.useV2Router(address(wbnb)), "Should use V3");
    }

    // TC-258: Switch routers
    function test_setAssetUseV2Router_Switch() public {
        vm.startPrank(admin);

        // Start with V3
        router.setAssetUseV2Router(address(btc), false);
        assertFalse(router.useV2Router(address(btc)));

        // Switch to V2
        router.setAssetUseV2Router(address(btc), true);
        assertTrue(router.useV2Router(address(btc)));

        // Switch back to V3
        router.setAssetUseV2Router(address(btc), false);
        assertFalse(router.useV2Router(address(btc)));

        vm.stopPrank();
    }

    // TC-259: Zero address rejection
    function test_setAssetUseV2Router_ZeroAddress() public {
        vm.prank(admin);
        vm.expectRevert(ETFRouterV1.InvalidAsset.selector);
        router.setAssetUseV2Router(address(0), true);
    }

    // TC-260: Batch simulation (multiple calls)
    function test_setAssetUseV2Router_MultipleCalls() public {
        vm.startPrank(admin);

        router.setAssetUseV2Router(address(btc), true);
        router.setAssetUseV2Router(address(eth), true);
        router.setAssetUseV2Router(address(usdt), true);

        assertTrue(router.useV2Router(address(btc)));
        assertTrue(router.useV2Router(address(eth)));
        assertTrue(router.useV2Router(address(usdt)));

        vm.stopPrank();
    }

    // TC-261: State persistence
    function test_setAssetUseV2Router_StatePersistence() public {
        vm.startPrank(admin);

        router.setAssetUseV2Router(address(btc), true);

        // State should persist across other operations
        router.setDefaultSlippage(200);
        router.setDefaultPoolFee(500);

        assertTrue(router.useV2Router(address(btc)), "State should persist");

        vm.stopPrank();
    }

    // TC-262: Permission verification
    function test_setAssetUseV2Router_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        router.setAssetUseV2Router(address(btc), true);
    }

    // ADDITIONAL: No event emission (design note)
    function test_setAssetUseV2Router_EventEmission() public {
        vm.prank(admin);

        vm.expectEmit(true, true, true, true);
        emit IETFRouterV1.RouterModeUpdated(address(btc), true);

        router.setAssetUseV2Router(address(btc), true);
        assertTrue(router.useV2Router(address(btc)));
    }

    // ADDITIONAL: Setting same value twice
    function test_setAssetUseV2Router_Idempotent() public {
        vm.startPrank(admin);

        router.setAssetUseV2Router(address(btc), true);
        assertTrue(router.useV2Router(address(btc)));

        // Set again to same value
        router.setAssetUseV2Router(address(btc), true);
        assertTrue(router.useV2Router(address(btc)));

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    PAUSE/UNPAUSE TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-263: Normal pause
    function test_pause_Normal() public {
        assertFalse(router.paused(), "Should start unpaused");

        vm.prank(admin);
        vm.expectEmit(true, false, false, true);
        emit Paused(admin);

        router.pause();

        assertTrue(router.paused(), "Should be paused");
    }

    // TC-264: Repeated pause
    function test_pause_Repeated() public {
        vm.startPrank(admin);

        router.pause();
        assertTrue(router.paused());

        // Try to pause again
        vm.expectRevert(); // Pausable: paused
        router.pause();

        vm.stopPrank();
    }

    // TC-265: Normal unpause
    function test_unpause_Normal() public {
        vm.startPrank(admin);

        router.pause();
        assertTrue(router.paused());

        vm.expectEmit(true, false, false, true);
        emit Unpaused(admin);

        router.unpause();

        assertFalse(router.paused(), "Should be unpaused");

        vm.stopPrank();
    }

    // TC-266: Unpause when not paused
    function test_unpause_NotPaused() public {
        assertFalse(router.paused());

        vm.prank(admin);
        vm.expectRevert(); // Pausable: not paused
        router.unpause();
    }

    // TC-267: Permission verification
    function test_pause_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert();
        router.pause();
    }

    function test_unpause_OnlyOwner() public {
        vm.prank(admin);
        router.pause();

        vm.prank(alice);
        vm.expectRevert();
        router.unpause();
    }

    // TC-268: Function blocking verification
    function test_pause_BlocksMintExactShares() public {
        vm.prank(admin);
        router.pause();

        // Try to mint while paused
        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        vm.expectRevert(); // Pausable: paused
        router.mintExactShares(10e18, 1000e18, block.timestamp + 300);

        vm.stopPrank();
    }

    function test_pause_BlocksMintWithUSDT() public {
        vm.prank(admin);
        router.pause();

        vm.startPrank(alice);
        usdt.mint(alice, 1000e18);
        usdt.approve(address(router), 1000e18);

        vm.expectRevert(); // Pausable: paused
        router.mintWithUSDT(1000e18, 0, block.timestamp + 300);

        vm.stopPrank();
    }

    function test_pause_BlocksBurnToUSDT() public {
        vm.prank(admin);
        router.pause();

        vm.startPrank(alice);
        // Assume alice has shares
        vm.expectRevert(); // Pausable: paused
        router.burnToUSDT(10e18, 0, block.timestamp + 300);

        vm.stopPrank();
    }

    // ADDITIONAL: View functions should work when paused
    function test_pause_ViewFunctionsWork() public {
        vm.prank(admin);
        router.pause();

        // These should not revert
        uint256 estimate1 = router.usdtNeededForShares(100e18);
        uint256 estimate2 = router.usdtToShares(1000e18);
        uint256 estimate3 = router.sharesToUsdt(100e18);
        (address pool,) = router.getAssetV3Pool(address(btc));

        assertGt(estimate1, 0);
        assertGt(estimate2, 0);
        assertGt(estimate3, 0);
        // pool is address(0) which is fine
    }

    // ADDITIONAL: Pause → Unpause → Pause cycle
    function test_pause_Cycle() public {
        vm.startPrank(admin);

        assertFalse(router.paused());

        router.pause();
        assertTrue(router.paused());

        router.unpause();
        assertFalse(router.paused());

        router.pause();
        assertTrue(router.paused());

        router.unpause();
        assertFalse(router.paused());

        vm.stopPrank();
    }

    /*//////////////////////////////////////////////////////////////
                    RECOVERTOKEN TESTS
    //////////////////////////////////////////////////////////////*/

    // TC-269: ERC20 recovery
    function test_recoverToken_ERC20() public {
        // Send some tokens to router "accidentally"
        btc.mint(address(router), 10e18);

        uint256 ownerBalanceBefore = btc.balanceOf(admin);

        vm.prank(admin);
        router.recoverToken(address(btc), 10e18);

        uint256 ownerBalanceAfter = btc.balanceOf(admin);

        assertEq(ownerBalanceAfter - ownerBalanceBefore, 10e18, "Should recover tokens");
        assertEq(btc.balanceOf(address(router)), 0, "Router should have 0 balance");
    }

    // TC-270: USDT recovery
    function test_recoverToken_USDT() public {
        usdt.mint(address(router), 1000e18);

        uint256 ownerBalanceBefore = usdt.balanceOf(admin);

        vm.prank(admin);
        router.recoverToken(address(usdt), 1000e18);

        uint256 ownerBalanceAfter = usdt.balanceOf(admin);

        assertEq(ownerBalanceAfter - ownerBalanceBefore, 1000e18);
    }

    // TC-271: ETF shares recovery
    function test_recoverToken_ETFShares() public {
        // Send ETF shares to router
        vm.prank(address(etfCore));
        IERC20(address(etfCore)).transfer(address(router), 100e18);

        uint256 ownerBalanceBefore = IERC20(address(etfCore)).balanceOf(admin);

        vm.prank(admin);
        router.recoverToken(address(etfCore), 100e18);

        uint256 ownerBalanceAfter = IERC20(address(etfCore)).balanceOf(admin);

        assertEq(ownerBalanceAfter - ownerBalanceBefore, 100e18);
    }

    // TC-272: Zero amount handling
    function test_recoverToken_ZeroAmount() public {
        btc.mint(address(router), 10e18);

        vm.prank(admin);
        router.recoverToken(address(btc), 0);

        // Should not revert, just transfer 0
        assertEq(btc.balanceOf(address(router)), 10e18, "Balance unchanged");
    }

    // TC-273: Balance verification
    function test_recoverToken_ExceedsBalance() public {
        btc.mint(address(router), 10e18);

        vm.prank(admin);
        vm.expectRevert(); // Transfer amount exceeds balance
        router.recoverToken(address(btc), 20e18);
    }

    // TC-274: Permission check
    function test_recoverToken_OnlyOwner() public {
        btc.mint(address(router), 10e18);

        vm.prank(alice);
        vm.expectRevert();
        router.recoverToken(address(btc), 10e18);
    }

    // TC-275: Transfer verification
    function test_recoverToken_TransferToOwner() public {
        eth.mint(address(router), 5e18);

        address owner = router.owner();
        uint256 balanceBefore = eth.balanceOf(owner);

        vm.prank(admin);
        router.recoverToken(address(eth), 5e18);

        uint256 balanceAfter = eth.balanceOf(owner);

        assertEq(balanceAfter, balanceBefore + 5e18, "Should transfer to owner");
    }

    // ADDITIONAL: Recover partial balance
    function test_recoverToken_PartialBalance() public {
        btc.mint(address(router), 100e18);

        vm.prank(admin);
        router.recoverToken(address(btc), 30e18);

        assertEq(btc.balanceOf(address(router)), 70e18, "Should have 70 remaining");
    }

    // ADDITIONAL: Multiple recoveries
    function test_recoverToken_Multiple() public {
        btc.mint(address(router), 100e18);
        eth.mint(address(router), 50e18);
        usdt.mint(address(router), 1000e18);

        vm.startPrank(admin);

        router.recoverToken(address(btc), 100e18);
        router.recoverToken(address(eth), 50e18);
        router.recoverToken(address(usdt), 1000e18);

        assertEq(btc.balanceOf(address(router)), 0);
        assertEq(eth.balanceOf(address(router)), 0);
        assertEq(usdt.balanceOf(address(router)), 0);

        vm.stopPrank();
    }

    // ADDITIONAL: Event emission verification
    function test_recoverToken_EventEmission() public {
        btc.mint(address(router), 10e18);

        vm.prank(admin);

        vm.expectEmit(true, true, true, true);
        emit IETFRouterV1.TokenRecovered(address(btc), admin, 10e18);

        router.recoverToken(address(btc), 10e18);
        assertEq(btc.balanceOf(address(router)), 0);
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

/**
 * @title BlockETFCore Other Functions Tests
 * @notice Comprehensive tests for other Core functions
 * @dev Tests TC-CORE-083 to TC-CORE-092 from COMPLETE_REBALANCE_TEST_PLAN.md
 *
 * Test Coverage:
 * - A-VI-1: getRebalanceInfo (TC-083 to TC-086)
 * - A-VI-2: _calculateWeightDeviation (TC-087 to TC-089)
 * - A-VI-3: Configuration setters (TC-090 to TC-092)
 *
 * Testing Strategy:
 * - Test view functions for correctness
 * - Test weight deviation calculation
 * - Test configuration functions and access control
 * - Test boundary conditions and error cases
 */
contract BlockETFCoreOtherFunctionsTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;

    MockERC20 public usdt;
    MockERC20 public wbnb;
    MockERC20 public btc;
    MockERC20 public eth;

    address public owner;
    address public alice;
    address public bob;

    uint32 constant WEIGHT_PRECISION = 10000;
    uint256 constant INITIAL_TOTAL_VALUE = 100000e18; // $100k

    event RebalancerUpdated(address indexed rebalancer);
    event RebalanceThresholdUpdated(uint256 threshold);
    event MinRebalanceCooldownUpdated(uint256 cooldown);

    function setUp() public {
        owner = address(this);
        alice = makeAddr("alice");
        bob = makeAddr("bob");

        // Deploy oracle
        oracle = new MockPriceOracle();

        // Deploy tokens
        usdt = new MockERC20("USDT", "USDT", 18);
        wbnb = new MockERC20("WBNB", "WBNB", 18);
        btc = new MockERC20("BTC", "BTC", 18);
        eth = new MockERC20("ETH", "ETH", 18);

        // Set realistic prices
        oracle.setPrice(address(usdt), 1e18); // $1
        oracle.setPrice(address(wbnb), 300e18); // $300
        oracle.setPrice(address(btc), 50000e18); // $50,000
        oracle.setPrice(address(eth), 3000e18); // $3,000

        // Deploy ETF
        etf = new BlockETFCore("BlockETF", "BETF", address(oracle));

        // Initialize ETF with balanced weights
        address[] memory assets = new address[](4);
        assets[0] = address(usdt);
        assets[1] = address(wbnb);
        assets[2] = address(btc);
        assets[3] = address(eth);

        uint32[] memory weights = new uint32[](4);
        weights[0] = 4000; // 40%
        weights[1] = 2000; // 20%
        weights[2] = 2000; // 20%
        weights[3] = 2000; // 20%

        // Mint tokens for initialization
        usdt.mint(owner, 100000e18);
        wbnb.mint(owner, 1000e18);
        btc.mint(owner, 10e18);
        eth.mint(owner, 100e18);

        // Approve and initialize
        usdt.approve(address(etf), type(uint256).max);
        wbnb.approve(address(etf), type(uint256).max);
        btc.approve(address(etf), type(uint256).max);
        eth.approve(address(etf), type(uint256).max);

        etf.initialize(assets, weights, INITIAL_TOTAL_VALUE);

        // Set rebalance threshold
        etf.setRebalanceThreshold(500); // 5%
    }

    /*//////////////////////////////////////////////////////////////
                A-VI-1: getRebalanceInfo TESTS
    //////////////////////////////////////////////////////////////*/

    /**
     * TC-CORE-083: 需要rebalance
     *
     * Test that when weight deviation exceeds threshold,
     * getRebalanceInfo correctly returns needsRebalance=true
     * along with accurate current and target weights.
     */
    function test_TC083_GetRebalanceInfo_NeedsRebalance() public {
        // Wait for initial cooldown to pass
        vm.warp(block.timestamp + 2 hours);

        // Create significant weight imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000; // USDT: 40% → 30% (deviation 10%)
        newWeights[1] = 2000; // WBNB: same
        newWeights[2] = 3000; // BTC: 20% → 30%
        newWeights[3] = 2000; // ETH: same

        etf.adjustWeights(newWeights);

        // Get rebalance info
        (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance) = etf.getRebalanceInfo();

        // Verify needsRebalance is true
        assertTrue(needsRebalance, "Should need rebalance");

        // Verify arrays have correct length
        assertEq(currentWeights.length, 4, "Current weights length should be 4");
        assertEq(targetWeights.length, 4, "Target weights length should be 4");

        // Verify target weights match what we set
        assertEq(targetWeights[0], 3000, "USDT target should be 3000");
        assertEq(targetWeights[1], 2000, "WBNB target should be 2000");
        assertEq(targetWeights[2], 3000, "BTC target should be 3000");
        assertEq(targetWeights[3], 2000, "ETH target should be 2000");

        // Verify current weights are different from target (still around initial values)
        // Current is still ~40% for USDT (4000 bps)
        assertApproxEqAbs(currentWeights[0], 4000, 50, "USDT current should be ~4000");

        // At least one asset should have deviation >= threshold (500)
        bool hasDeviation = false;
        for (uint256 i = 0; i < 4; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];
            if (deviation >= 500) {
                hasDeviation = true;
                break;
            }
        }
        assertTrue(hasDeviation, "At least one asset should have >= 5% deviation");
    }

    /**
     * TC-CORE-084: 不需要rebalance
     *
     * Test that when weights are balanced (deviation < threshold),
     * getRebalanceInfo returns needsRebalance=false.
     */
    function test_TC084_GetRebalanceInfo_NotNeeded() public {
        // Initially, ETF is balanced (weights match targets)
        (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance) = etf.getRebalanceInfo();

        // Should not need rebalance initially
        assertFalse(needsRebalance, "Should not need rebalance when balanced");

        // Current weights should be close to target weights
        for (uint256 i = 0; i < currentWeights.length; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];

            // All deviations should be < threshold (500 = 5%)
            assertLt(deviation, 500, "Deviation should be < 5%");
        }
    }

    /**
     * TC-CORE-085: 单个资产严重偏离
     *
     * Test scenario where one asset has severe deviation (30%)
     * by adjusting target weights dramatically.
     */
    function test_TC085_GetRebalanceInfo_SingleAssetDeviation() public {
        // Wait for initial cooldown to pass
        vm.warp(block.timestamp + 2 hours);

        // Create severe imbalance by setting BTC target very high
        // Current BTC ~20%, set target to 50%
        // This creates 30% deviation
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 2000; // USDT: 40% → 20%
        newWeights[1] = 1500; // WBNB: 20% → 15%
        newWeights[2] = 5000; // BTC: 20% → 50% (30% deviation!)
        newWeights[3] = 1500; // ETH: 20% → 15%

        etf.adjustWeights(newWeights);

        // Get rebalance info
        (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance) = etf.getRebalanceInfo();

        // Should need rebalance
        assertTrue(needsRebalance, "Should need rebalance with severe deviation");

        // BTC should have severe deviation
        // Current is ~20% (2000 bps), target is 50% (5000 bps)
        // Deviation = 3000 bps = 30%
        assertEq(targetWeights[2], 5000, "BTC target should be 5000");
        assertApproxEqAbs(currentWeights[2], 2000, 100, "BTC current should be ~2000");

        // Verify BTC deviation
        uint256 btcDeviation = targetWeights[2] - currentWeights[2];
        assertGt(btcDeviation, 2500, "BTC deviation should be >25%");
    }

    /**
     * TC-CORE-086: 多个资产微小偏离
     *
     * Test that when multiple assets have small deviations (1% each),
     * but cumulative is below threshold, rebalance is not needed.
     */
    function test_TC086_GetRebalanceInfo_MultipleSmallDeviations() public {
        // Create small imbalance by slightly adjusting weights
        // Each asset will have ~1% deviation, total ~4% < threshold (5%)
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 4100; // USDT: 40% → 41% (1% deviation)
        newWeights[1] = 1900; // WBNB: 20% → 19% (1% deviation)
        newWeights[2] = 2100; // BTC: 20% → 21% (1% deviation)
        newWeights[3] = 1900; // ETH: 20% → 19% (1% deviation)

        etf.adjustWeights(newWeights);

        // Get rebalance info
        (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance) = etf.getRebalanceInfo();

        // Should NOT need rebalance (all deviations < 5% threshold)
        assertFalse(needsRebalance, "Should not need rebalance with small deviations");

        // Verify all deviations are < threshold
        for (uint256 i = 0; i < currentWeights.length; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];

            assertLt(deviation, 500, "Each deviation should be < 5%");
        }
    }

    /*//////////////////////////////////////////////////////////////
                A-VI-2: _calculateWeightDeviation TESTS
    //////////////////////////////////////////////////////////////*/

    /**
     * TC-CORE-087: 计算权重偏差
     *
     * Test weight deviation calculation with mixed deviations.
     * Note: _calculateWeightDeviation is private, so we test it
     * indirectly through getRebalanceInfo behavior.
     */
    function test_TC087_CalculateWeightDeviation_Mixed() public {
        // Wait for initial cooldown to pass
        vm.warp(block.timestamp + 2 hours);

        // Set specific weights to create known deviation
        // Current: [4000, 2000, 2000, 2000]
        // Target:  [3000, 3000, 2000, 2000]
        // Deviations: [1000, 1000, 0, 0]
        // Total deviation = 1000 + 1000 = 2000 (20%)

        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000; // USDT: 40% → 30% (deviation 1000)
        newWeights[1] = 3000; // WBNB: 20% → 30% (deviation 1000)
        newWeights[2] = 2000; // BTC: same (deviation 0)
        newWeights[3] = 2000; // ETH: same (deviation 0)

        etf.adjustWeights(newWeights);

        (uint256[] memory currentWeights, uint256[] memory targetWeights,) = etf.getRebalanceInfo();

        // Calculate expected total deviation manually
        uint256 totalDeviation = 0;
        for (uint256 i = 0; i < currentWeights.length; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];
            totalDeviation += deviation;
        }

        // Total deviation should be significant (around 2000 bps = 20%)
        assertGt(totalDeviation, 1500, "Total deviation should be >15%");
        assertLt(totalDeviation, 2500, "Total deviation should be <25%");
    }

    /**
     * TC-CORE-088: 零偏差
     *
     * Test that when current equals target, deviation is zero.
     */
    function test_TC088_CalculateWeightDeviation_Zero() public {
        // Initially balanced
        (uint256[] memory currentWeights, uint256[] memory targetWeights,) = etf.getRebalanceInfo();

        // Calculate total deviation
        uint256 totalDeviation = 0;
        for (uint256 i = 0; i < currentWeights.length; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];
            totalDeviation += deviation;
        }

        // Should be very small (near zero, allowing for rounding)
        assertLt(totalDeviation, 50, "Total deviation should be near zero when balanced");
    }

    /**
     * TC-CORE-089: 单向偏差
     *
     * Test deviation calculation when all assets deviate in same direction.
     * This is technically impossible (sum must equal 100%), but we test
     * the calculation logic by creating asymmetric deviations.
     */
    function test_TC089_CalculateWeightDeviation_Unidirectional() public {
        // Wait for initial cooldown to pass
        vm.warp(block.timestamp + 2 hours);

        // Create scenario where most assets are under-weighted
        // One asset must be over-weighted to balance to 100%
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000; // USDT: 40% → 10% (under 30%)
        newWeights[1] = 3000; // WBNB: 20% → 30% (under 10%)
        newWeights[2] = 3000; // BTC: 20% → 30% (under 10%)
        newWeights[3] = 3000; // ETH: 20% → 30% (under 10%)

        etf.adjustWeights(newWeights);

        (uint256[] memory currentWeights, uint256[] memory targetWeights,) = etf.getRebalanceInfo();

        // Calculate deviation
        uint256 totalDeviation = 0;
        for (uint256 i = 0; i < currentWeights.length; i++) {
            uint256 deviation = currentWeights[i] > targetWeights[i]
                ? currentWeights[i] - targetWeights[i]
                : targetWeights[i] - currentWeights[i];
            totalDeviation += deviation;
        }

        // One asset (USDT) is over-weighted by 30%, three are under by 10% each
        // Total = 30% + 10% + 10% + 10% = 60%
        assertGt(totalDeviation, 5000, "Total deviation should be >50%");
        assertLt(totalDeviation, 7000, "Total deviation should be <70%");
    }

    /*//////////////////////////////////////////////////////////////
                A-VI-3: CONFIGURATION SETTERS
    //////////////////////////////////////////////////////////////*/

    /**
     * TC-CORE-090: setRebalanceThreshold
     *
     * Test setting rebalance threshold with valid and invalid values.
     */
    function test_TC090_SetRebalanceThreshold_Valid() public {
        // Test valid threshold (5%)
        vm.expectEmit(true, true, true, true);
        emit RebalanceThresholdUpdated(500);
        etf.setRebalanceThreshold(500);

        assertEq(etf.rebalanceThreshold(), 500, "Threshold should be 500");
    }

    function test_TC090_SetRebalanceThreshold_MaxValid() public {
        // Test maximum valid threshold (20% = 2000 bps)
        etf.setRebalanceThreshold(2000);
        assertEq(etf.rebalanceThreshold(), 2000, "Threshold should be 2000");
    }

    function test_TC090_SetRebalanceThreshold_ExceedsLimit() public {
        // Test threshold exceeding limit (>20%)
        vm.expectRevert(BlockETFCore.ThresholdTooHigh.selector);
        etf.setRebalanceThreshold(2001);
    }

    function test_TC090_SetRebalanceThreshold_OnlyOwner() public {
        // Test non-owner cannot call
        vm.prank(alice);
        vm.expectRevert();
        etf.setRebalanceThreshold(500);
    }

    /**
     * TC-CORE-091: setMinRebalanceCooldown
     *
     * Test setting minimum rebalance cooldown period.
     */
    function test_TC091_SetMinRebalanceCooldown_Valid() public {
        // Test valid cooldown (1 hour)
        vm.expectEmit(true, true, true, true);
        emit MinRebalanceCooldownUpdated(1 hours);
        etf.setMinRebalanceCooldown(1 hours);

        assertEq(etf.minRebalanceCooldown(), 1 hours, "Cooldown should be 1 hour");
    }

    function test_TC091_SetMinRebalanceCooldown_MaxValid() public {
        // Test maximum valid cooldown (7 days)
        etf.setMinRebalanceCooldown(7 days);
        assertEq(etf.minRebalanceCooldown(), 7 days, "Cooldown should be 7 days");
    }

    function test_TC091_SetMinRebalanceCooldown_ExceedsLimit() public {
        // Test cooldown exceeding limit (>7 days)
        vm.expectRevert(BlockETFCore.CooldownTooLong.selector);
        etf.setMinRebalanceCooldown(8 days);
    }

    function test_TC091_SetMinRebalanceCooldown_OnlyOwner() public {
        // Test non-owner cannot call
        vm.prank(alice);
        vm.expectRevert();
        etf.setMinRebalanceCooldown(1 hours);
    }

    /**
     * TC-CORE-092: setRebalancer
     *
     * Test setting rebalancer address and verifying access control.
     */
    function test_TC092_SetRebalancer_UpdatesAddress() public {
        address newRebalancer = makeAddr("newRebalancer");

        // Set new rebalancer
        vm.expectEmit(true, true, true, true);
        emit RebalancerUpdated(newRebalancer);
        etf.setRebalancer(newRebalancer);

        // Verify update
        assertEq(etf.rebalancer(), newRebalancer, "Rebalancer should be updated");
    }

    function test_TC092_SetRebalancer_OldRebalancerCannotCall() public {
        address oldRebalancer = makeAddr("oldRebalancer");
        address newRebalancer = makeAddr("newRebalancer");

        // Set initial rebalancer
        etf.setRebalancer(oldRebalancer);

        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000;
        newWeights[1] = 3000;
        newWeights[2] = 2000;
        newWeights[3] = 2000;
        etf.adjustWeights(newWeights);

        // Wait for cooldown
        vm.warp(block.timestamp + 2 hours);

        // Change rebalancer
        etf.setRebalancer(newRebalancer);

        // Old rebalancer should not be able to call flashRebalance
        vm.prank(oldRebalancer);
        vm.expectRevert(BlockETFCore.Unauthorized.selector);
        etf.flashRebalance(oldRebalancer, "");

        // New rebalancer should be able to call (but will fail due to no callback implementation)
        vm.prank(newRebalancer);
        vm.expectRevert(); // Will revert because newRebalancer doesn't implement callback
        etf.flashRebalance(newRebalancer, "");
    }

    function test_TC092_SetRebalancer_OnlyOwner() public {
        address newRebalancer = makeAddr("newRebalancer");

        // Test non-owner cannot call
        vm.prank(alice);
        vm.expectRevert();
        etf.setRebalancer(newRebalancer);
    }

    function test_TC092_SetRebalancer_EmitsEvent() public {
        address newRebalancer = makeAddr("newRebalancer");

        // Verify event is emitted
        vm.expectEmit(true, true, true, true);
        emit RebalancerUpdated(newRebalancer);

        etf.setRebalancer(newRebalancer);
    }
}

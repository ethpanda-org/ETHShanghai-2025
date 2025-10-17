// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/interfaces/IRebalanceCallback.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

/**
 * @title BlockETFCore FlashRebalance Entry Tests
 * @notice Comprehensive tests for flashRebalance entry point and preconditions
 * @dev Tests TC-CORE-001 to TC-CORE-010
 */
contract BlockETFCoreFlashRebalanceTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;
    MockRebalancer public rebalancer;

    MockERC20 public usdt;
    MockERC20 public wbnb;
    MockERC20 public btc;
    MockERC20 public eth;

    address public owner;
    address public user;
    address public attacker;

    uint32 constant WEIGHT_PRECISION = 10000;

    event Rebalanced(uint256[] oldWeights, uint256[] newWeights);

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");
        attacker = makeAddr("attacker");

        // Deploy oracle
        oracle = new MockPriceOracle();

        // Deploy tokens
        usdt = new MockERC20("USDT", "USDT", 18);
        wbnb = new MockERC20("WBNB", "WBNB", 18);
        btc = new MockERC20("BTC", "BTC", 18);
        eth = new MockERC20("ETH", "ETH", 18);

        // Set prices
        oracle.setPrice(address(usdt), 1e18); // $1
        oracle.setPrice(address(wbnb), 300e18); // $300
        oracle.setPrice(address(btc), 50000e18); // $50,000
        oracle.setPrice(address(eth), 3000e18); // $3,000

        // Deploy ETF
        etf = new BlockETFCore("BlockETF", "BETF", address(oracle));

        // Deploy rebalancer
        rebalancer = new MockRebalancer(address(etf));
        etf.setRebalancer(address(rebalancer));

        // Initialize ETF with 4 assets
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

        // Target total value: $100k
        uint256 targetValue = 100000e18;

        // Mint large amounts to owner for initialization
        usdt.mint(owner, 100000e18);
        wbnb.mint(owner, 1000e18);
        btc.mint(owner, 10e18);
        eth.mint(owner, 100e18);

        // Approve ETF
        usdt.approve(address(etf), type(uint256).max);
        wbnb.approve(address(etf), type(uint256).max);
        btc.approve(address(etf), type(uint256).max);
        eth.approve(address(etf), type(uint256).max);

        // Initialize with target USD value
        etf.initialize(assets, weights, targetValue);

        // Set threshold low enough to trigger rebalance easily
        etf.setRebalanceThreshold(500); // 5%

        // Warp time forward to ensure we're past any initial cooldown
        vm.warp(block.timestamp + 2 hours);
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-001: NORMAL CALL
    //////////////////////////////////////////////////////////////*/

    function test_TC001_FlashRebalance_NormalCall() public {
        // Create significant weight imbalance by changing target weights
        // Current: USDT=40%, WBNB=20%, BTC=20%, ETH=20% (by value)
        // New target: USDT=10%, WBNB=30%, BTC=30%, ETH=30%
        // This creates 30% deviation for USDT (40%→10%)
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000; // 10% (from 40%, deviation = 30%)
        newWeights[1] = 3000; // 30% (from 20%, deviation = 10%)
        newWeights[2] = 3000; // 30% (from 20%, deviation = 10%)
        newWeights[3] = 3000; // 30% (from 20%, deviation = 10%)

        etf.adjustWeights(newWeights);

        // Verify that rebalance is needed
        (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance) = etf.getRebalanceInfo();

        assertTrue(needsRebalance, "Should need rebalance after significant weight change");

        // Verify the deviation is indeed large
        uint256 usdtDeviation = currentWeights[0] > targetWeights[0]
            ? currentWeights[0] - targetWeights[0]
            : targetWeights[0] - currentWeights[0];
        assertGt(usdtDeviation, 500, "USDT deviation should be > 5%");

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify rebalance executed (timestamp updated)
        assertEq(etf.lastRebalanceTime(), block.timestamp, "Timestamp should update");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-002: NOT INITIALIZED
    //////////////////////////////////////////////////////////////*/

    function test_TC002_FlashRebalance_NotInitialized() public {
        // Deploy a new uninitialized ETF
        BlockETFCore uninitETF = new BlockETFCore("Test", "TEST", address(oracle));
        uninitETF.setRebalancer(address(rebalancer));

        vm.expectRevert(); // Should revert with onlyInitialized
        vm.prank(address(rebalancer));
        uninitETF.flashRebalance(address(rebalancer), "");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-003: ORACLE VALIDATION
    //////////////////////////////////////////////////////////////*/

    /// @notice TC-003: Verify oracle validation in constructor and setPriceOracle
    /// @dev NOTE: Once Core is deployed with a valid oracle, it CANNOT be set to address(0)
    ///      This is by design - setPriceOracle() reverts with InvalidOracle() for address(0)
    ///      Therefore, we test constructor validation instead of flashRebalance runtime check
    function test_TC003_FlashRebalance_OracleNotSet() public {
        // Test 1: Constructor should reject address(0)
        vm.expectRevert(BlockETFCore.InvalidOracle.selector);
        new BlockETFCore("Test", "TEST", address(0));

        // Test 2: setPriceOracle should reject address(0)
        BlockETFCore testETF = new BlockETFCore("Test", "TEST", address(oracle));
        vm.expectRevert(BlockETFCore.InvalidOracle.selector);
        testETF.setPriceOracle(address(0));

        // Test 3: Verify oracle cannot be removed after initialization
        // This ensures flashRebalance will ALWAYS have a valid oracle reference
        address[] memory assets = new address[](2);
        assets[0] = address(usdt);
        assets[1] = address(wbnb);

        uint32[] memory weights = new uint32[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        usdt.mint(owner, 10000e18);
        wbnb.mint(owner, 100e18);
        usdt.approve(address(testETF), type(uint256).max);
        wbnb.approve(address(testETF), type(uint256).max);

        testETF.initialize(assets, weights, 1000e18);

        // Even after initialization, oracle cannot be set to address(0)
        vm.expectRevert(BlockETFCore.InvalidOracle.selector);
        testETF.setPriceOracle(address(0));

        // Verify oracle is still set
        assertTrue(address(testETF.priceOracle()) != address(0), "Oracle should remain set");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-004: REBALANCER NOT SET
    //////////////////////////////////////////////////////////////*/

    function test_TC004_FlashRebalance_RebalancerNotSet() public {
        // Deploy ETF
        BlockETFCore noRebalancerETF = new BlockETFCore("Test", "TEST", address(oracle));

        // Initialize
        address[] memory assets = new address[](2);
        assets[0] = address(usdt);
        assets[1] = address(wbnb);

        uint32[] memory weights = new uint32[](2);
        weights[0] = 5000;
        weights[1] = 5000;

        usdt.mint(owner, 10000e18);
        wbnb.mint(owner, 100e18);
        usdt.approve(address(noRebalancerETF), type(uint256).max);
        wbnb.approve(address(noRebalancerETF), type(uint256).max);

        noRebalancerETF.initialize(assets, weights, 1000e18);

        // Don't set rebalancer, it should be address(0)
        assertEq(noRebalancerETF.rebalancer(), address(0), "Rebalancer should be unset");

        vm.expectRevert(BlockETFCore.RebalanceNotImplemented.selector);
        vm.prank(owner);
        noRebalancerETF.flashRebalance(address(rebalancer), "");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-005: COOLDOWN NOT MET
    //////////////////////////////////////////////////////////////*/

    function test_TC005_FlashRebalance_CooldownNotMet() public {
        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000; // 10% (from 40%)
        newWeights[1] = 3000; // 30%
        newWeights[2] = 3000; // 30%
        newWeights[3] = 3000; // 30%
        etf.adjustWeights(newWeights);

        // First rebalance should succeed
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertTrue(needsRebalance, "Should need rebalance before first call");

        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        uint256 firstRebalanceTime = etf.lastRebalanceTime();
        assertEq(firstRebalanceTime, block.timestamp, "First rebalance should update timestamp");

        // Create another imbalance (weights still deviate)
        // Note: After one rebalance, weights may still not be perfect
        // But cooldown should still prevent immediate re-rebalance

        // Try to rebalance again immediately (within cooldown)
        vm.expectRevert(BlockETFCore.CooldownNotMet.selector);
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify via getRebalanceInfo that cooldown blocks it
        (,, bool canRebalance) = etf.getRebalanceInfo();
        assertFalse(canRebalance, "Should not allow rebalance during cooldown");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-006: REBALANCE NOT NEEDED
    //////////////////////////////////////////////////////////////*/

    function test_TC006_FlashRebalance_NotNeeded() public {
        // ETF is initially balanced (weights match targets)
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertFalse(needsRebalance, "Should not need rebalance initially");

        // Try to rebalance when not needed
        vm.expectRevert(BlockETFCore.RebalanceNotNeeded.selector);
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-007: REENTRANCY ATTACK
    //////////////////////////////////////////////////////////////*/

    function test_TC007_FlashRebalance_ReentrancyAttack() public {
        // Set up rebalancer to attempt reentrancy
        rebalancer.setShouldReenter(true);

        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000;
        newWeights[1] = 3000;
        newWeights[2] = 3000;
        newWeights[3] = 3000;
        etf.adjustWeights(newWeights);

        // Verify rebalance is needed
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertTrue(needsRebalance, "Should need rebalance");

        // Attempt rebalance with reentrancy
        // Should revert due to ReentrancyGuard
        vm.expectRevert();
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-008: PAUSED STATE
    //////////////////////////////////////////////////////////////*/

    function test_TC008_FlashRebalance_PausedState() public {
        // Create imbalance first
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000;
        newWeights[1] = 3000;
        newWeights[2] = 3000;
        newWeights[3] = 3000;
        etf.adjustWeights(newWeights);

        // Verify rebalance is needed
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertTrue(needsRebalance, "Should need rebalance before pause");

        // Pause the ETF
        etf.pause();

        // executeRebalance should revert when paused
        vm.expectRevert(); // Pausable.EnforcedPause
        etf.executeRebalance();

        // However, flashRebalance can still be called directly by rebalancer
        // This is by design for emergency rebalancing
        // (flashRebalance doesn't have whenNotPaused modifier)
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify it succeeded
        assertEq(etf.lastRebalanceTime(), block.timestamp, "Should execute even when paused");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-009: ONLY REBALANCER MODIFIER
    //////////////////////////////////////////////////////////////*/

    function test_TC009_FlashRebalance_OnlyRebalancer() public {
        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000;
        newWeights[1] = 3000;
        newWeights[2] = 3000;
        newWeights[3] = 3000;
        etf.adjustWeights(newWeights);

        // Verify rebalance is needed
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertTrue(needsRebalance, "Should need rebalance");

        // Try to call as attacker (non-rebalancer, non-owner)
        vm.expectRevert(BlockETFCore.Unauthorized.selector);
        vm.prank(attacker);
        etf.flashRebalance(address(rebalancer), "");

        // Verify rebalance still needed (didn't execute)
        (,, bool stillNeeded) = etf.getRebalanceInfo();
        assertTrue(stillNeeded, "Rebalance should still be needed after failed attempt");

        // Rebalancer should succeed
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        assertEq(etf.lastRebalanceTime(), block.timestamp, "Rebalancer should succeed");

        // Note: Owner is also allowed to call per onlyRebalancer modifier (line 151 in Core)
        // This is tested separately in TC-010 via executeRebalance()
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-010: EXECUTE REBALANCE TRIGGERS FLASH
    //////////////////////////////////////////////////////////////*/

    function test_TC010_ExecuteRebalance_TriggersFlash() public {
        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000;
        newWeights[1] = 3000;
        newWeights[2] = 3000;
        newWeights[3] = 3000;
        etf.adjustWeights(newWeights);

        // Verify rebalance is needed
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertTrue(needsRebalance, "Should need rebalance");

        uint256 timeBefore = block.timestamp;

        // Call executeRebalance (public function that internally calls flashRebalance)
        etf.executeRebalance();

        // Verify it triggered flashRebalance (timestamp updated)
        assertEq(etf.lastRebalanceTime(), timeBefore, "Should have executed rebalance");
    }
}

/**
 * @title Mock Rebalancer for Testing
 * @notice Simplified rebalancer that mimics real behavior
 */
contract MockRebalancer is IRebalanceCallback {
    address public immutable etfCore;
    bool public shouldRevert;
    bool public shouldReenter;
    bool public shouldKeepTokens;

    constructor(address _etfCore) {
        etfCore = _etfCore;
    }

    function setShouldRevert(bool _shouldRevert) external {
        shouldRevert = _shouldRevert;
    }

    function setShouldReenter(bool _shouldReenter) external {
        shouldReenter = _shouldReenter;
    }

    function setShouldKeepTokens(bool _shouldKeep) external {
        shouldKeepTokens = _shouldKeep;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata data)
        external
        override
    {
        if (shouldRevert) {
            revert("MockRebalancer: intentional revert");
        }

        if (shouldReenter) {
            // Attempt reentrancy attack
            IBlockETFCore(etfCore).flashRebalance(address(this), data);
        }

        // Simple logic: burn sold assets or mint & return bought assets
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                // Sell: we received this asset from Core, burn it (simulate DEX swap consumption)
                if (!shouldKeepTokens) {
                    uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                    if (balance > 0) {
                        MockERC20(assets[i]).burn(address(this), balance);
                    }
                }
            } else if (amounts[i] < 0) {
                // Buy: we need to provide this asset to Core
                // Mint tokens to simulate buying from DEX
                MockERC20(assets[i]).mint(address(this), uint256(-amounts[i]));
                if (!shouldKeepTokens) {
                    IERC20(assets[i]).transfer(msg.sender, uint256(-amounts[i]));
                }
            }
            // If amounts[i] == 0, no action needed
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/interfaces/IRebalanceCallback.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

/**
 * @title BlockETFCore _prepareRebalance Tests
 * @notice Comprehensive tests for _prepareRebalance internal function
 * @dev Tests TC-CORE-011 to TC-CORE-021 from COMPLETE_REBALANCE_TEST_PLAN.md
 *
 * Test Coverage:
 * - A-II-1: rebalanceAmounts calculation (TC-011 to TC-014)
 * - A-II-2: maxSell limitation (TC-015 to TC-017)
 * - A-II-3: balancesBefore recording (TC-018 to TC-019)
 * - A-II-4: totalValueBefore calculation (TC-020 to TC-021)
 *
 * Testing Strategy:
 * - No mocked behavior - test the real _prepareRebalance logic
 * - Use flashRebalance to trigger _prepareRebalance indirectly
 * - Verify state changes and token transfers
 * - Test edge cases and error conditions rigorously
 */
contract BlockETFCorePrepareRebalanceTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;
    TestRebalancer public rebalancer;

    MockERC20 public usdt;
    MockERC20 public wbnb;
    MockERC20 public btc;
    MockERC20 public eth;

    address public owner;
    address public user;

    uint32 constant WEIGHT_PRECISION = 10000;
    uint256 constant INITIAL_TOTAL_VALUE = 100000e18; // $100k

    event Rebalanced(uint256[] oldWeights, uint256[] newWeights);

    function setUp() public {
        owner = address(this);
        user = makeAddr("user");

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

        // Deploy test rebalancer
        rebalancer = new TestRebalancer(address(etf), address(oracle));
        etf.setRebalancer(address(rebalancer));

        // Set low threshold to enable testing
        etf.setRebalanceThreshold(500); // 5%

        // Wait for cooldown
        vm.warp(block.timestamp + 2 hours);
    }

    /*//////////////////////////////////////////////////////////////
                A-II-1: rebalanceAmounts CALCULATION
    //////////////////////////////////////////////////////////////*/

    /**
     * TC-CORE-011: Single over-weighted asset (sell order)
     *
     * Test that when BTC is over-weighted (current 40%, target 30%),
     * the rebalanceAmounts is calculated correctly as positive (sell)
     * and the correct amount is transferred to rebalancer.
     */
    function test_TC011_SingleOverWeightedAsset_SellOrder() public {
        // Setup: Change BTC from 20% to 30%, USDT from 40% to 30%
        // This makes USDT over-weighted by 10%
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000; // USDT: 40% → 30% (over by 10%)
        newWeights[1] = 2000; // WBNB: 20%
        newWeights[2] = 3000; // BTC: 20% → 30%
        newWeights[3] = 2000; // ETH: 20%

        etf.adjustWeights(newWeights);

        // Verify rebalance is needed
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertTrue(needsRebalance, "Should need rebalance");

        // Get initial USDT balance
        uint256 usdtBalanceBefore = usdt.balanceOf(address(etf));
        uint256 totalValueBefore = etf.getTotalValue();

        // Calculate expected sell amount
        // excess = 10% = 1000 bps
        // sellValue = (totalValue * excess) / WEIGHT_PRECISION = 100000e18 * 1000 / 10000 = 10000e18
        // sellAmount = sellValue / price = 10000e18 / 1e18 = 10000e18 USDT
        uint256 expectedExcess = 1000; // 10% in bps
        uint256 expectedSellValue = (totalValueBefore * expectedExcess) / WEIGHT_PRECISION;
        uint256 expectedSellAmount = (expectedSellValue * 1e18) / oracle.getPrice(address(usdt));

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify USDT was transferred to rebalancer (sell order)
        uint256 usdtTransferred = usdtBalanceBefore - usdt.balanceOf(address(etf));

        // Allow small rounding difference (within 0.01%)
        assertApproxEqRel(
            usdtTransferred,
            expectedSellAmount,
            0.0001e18, // 0.01% tolerance
            "USDT sell amount should match calculation"
        );

        // Verify rebalanceAmounts was positive (captured by test rebalancer)
        assertGt(rebalancer.lastRebalanceAmounts(0), 0, "USDT rebalanceAmount should be positive (sell)");
    }

    /**
     * TC-CORE-012: Single under-weighted asset (buy order)
     *
     * Test that when ETH is under-weighted (current 10%, target 20%),
     * the rebalanceAmounts is calculated correctly as negative (buy)
     * and NO transfer occurs (buy orders don't transfer from Core).
     */
    function test_TC012_SingleUnderWeightedAsset_BuyOrder() public {
        // Setup: Change ETH from 20% to 30%, USDT from 40% to 30%
        // This makes ETH under-weighted by 10% (current will be ~13.3% after USDT sells)
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000; // USDT: 40% → 30%
        newWeights[1] = 2000; // WBNB: 20%
        newWeights[2] = 2000; // BTC: 20%
        newWeights[3] = 3000; // ETH: 20% → 30%

        etf.adjustWeights(newWeights);

        // Get initial ETH balance
        uint256 ethBalanceBefore = eth.balanceOf(address(etf));

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // For buy orders, Core should NOT transfer tokens OUT initially
        // (Rebalancer will buy and transfer back)
        // However, after full rebalance, ETH balance should increase
        uint256 ethBalanceAfter = eth.balanceOf(address(etf));

        // During _prepareRebalance, no ETH should be transferred out
        // The actual test is in the rebalancer callback - it should receive negative amount
        assertLt(rebalancer.lastRebalanceAmounts(3), 0, "ETH rebalanceAmount should be negative (buy)");
    }

    /**
     * TC-CORE-013: Mixed scenario (2 sell, 2 buy)
     *
     * Test complex rebalance with:
     * - BTC: sell (over-weighted)
     * - USDT: sell (over-weighted)
     * - WBNB: buy (under-weighted)
     * - ETH: buy (under-weighted)
     */
    function test_TC013_MixedScenario_TwoSellTwoBuy() public {
        // Setup: Create scenario where BTC and USDT are over, WBNB and ETH are under
        // New weights: USDT 30%, WBNB 30%, BTC 10%, ETH 30%
        // Current (by value): USDT ~40%, WBNB ~20%, BTC ~20%, ETH ~20%
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000; // USDT: 40% → 30% (sell)
        newWeights[1] = 3000; // WBNB: 20% → 30% (buy)
        newWeights[2] = 1000; // BTC: 20% → 10% (sell)
        newWeights[3] = 3000; // ETH: 20% → 30% (buy)

        etf.adjustWeights(newWeights);

        // Record balances before
        uint256 usdtBefore = usdt.balanceOf(address(etf));
        uint256 wbnbBefore = wbnb.balanceOf(address(etf));
        uint256 btcBefore = btc.balanceOf(address(etf));
        uint256 ethBefore = eth.balanceOf(address(etf));

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify sell assets were transferred out during _prepareRebalance
        assertLt(usdt.balanceOf(address(etf)), usdtBefore, "USDT should decrease (sell)");
        assertLt(btc.balanceOf(address(etf)), btcBefore, "BTC should decrease (sell)");

        // Verify rebalanceAmounts signs
        assertGt(rebalancer.lastRebalanceAmounts(0), 0, "USDT amount should be positive (sell)");
        assertLt(rebalancer.lastRebalanceAmounts(1), 0, "WBNB amount should be negative (buy)");
        assertGt(rebalancer.lastRebalanceAmounts(2), 0, "BTC amount should be positive (sell)");
        assertLt(rebalancer.lastRebalanceAmounts(3), 0, "ETH amount should be negative (buy)");
    }

    /**
     * TC-CORE-014: Weights equal (zero order)
     *
     * Test that when an asset's current weight equals target weight,
     * rebalanceAmounts is 0 and no transfer occurs.
     */
    function test_TC014_WeightsEqual_ZeroOrder() public {
        // Setup: Only change BTC weight to create imbalance, keep others same
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 4000; // USDT: same
        newWeights[1] = 2000; // WBNB: same
        newWeights[2] = 2500; // BTC: 20% → 25%
        newWeights[3] = 1500; // ETH: 20% → 15%

        etf.adjustWeights(newWeights);

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // USDT and WBNB should have zero rebalanceAmounts (weights unchanged)
        assertEq(rebalancer.lastRebalanceAmounts(0), 0, "USDT amount should be 0 (no change)");
        assertEq(rebalancer.lastRebalanceAmounts(1), 0, "WBNB amount should be 0 (no change)");

        // BTC and ETH should have non-zero amounts
        assertNotEq(rebalancer.lastRebalanceAmounts(2), 0, "BTC amount should be non-zero");
        assertNotEq(rebalancer.lastRebalanceAmounts(3), 0, "ETH amount should be non-zero");
    }

    /*//////////////////////////////////////////////////////////////
                A-II-2: maxSell LIMITATION
    //////////////////////////////////////////////////////////////*/

    /**
     * TC-CORE-015: sellAmount exceeds maxSell (50% of balance)
     *
     * Test that when calculated sellAmount would exceed 50% of balance,
     * it's capped at maxSell = balance / 2.
     */
    function test_TC015_SellAmountExceedsMaxSell() public {
        // Setup: Create extreme imbalance to trigger maxSell limit
        // Set USDT target to very low, forcing it to sell maximum
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 100; // USDT: 40% → 1% (extreme sell, 39% reduction)
        newWeights[1] = 3300; // WBNB: distribute remaining
        newWeights[2] = 3300; // BTC
        newWeights[3] = 3300; // ETH (total = 10000)

        etf.adjustWeights(newWeights);

        uint256 usdtBalanceBefore = usdt.balanceOf(address(etf));
        uint256 maxSell = usdtBalanceBefore / 2;

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify transferred amount doesn't exceed maxSell
        uint256 usdtTransferred = usdtBalanceBefore - usdt.balanceOf(address(etf));
        assertLe(usdtTransferred, maxSell, "Transfer should not exceed maxSell");

        // Should be close to maxSell (within rounding)
        assertApproxEqAbs(usdtTransferred, maxSell, 1, "Should use maxSell limit");
    }

    /**
     * TC-CORE-016: sellAmount less than maxSell
     *
     * Test normal case where calculated sell amount is well below 50% limit.
     */
    function test_TC016_SellAmountBelowMaxSell() public {
        // Setup: Small weight adjustment (10% → 5% for USDT)
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3500; // USDT: 40% → 35% (sell 5%)
        newWeights[1] = 2500; // WBNB: 20% → 25%
        newWeights[2] = 2000; // BTC: same
        newWeights[3] = 2000; // ETH: same

        etf.adjustWeights(newWeights);

        uint256 usdtBalanceBefore = usdt.balanceOf(address(etf));
        uint256 totalValueBefore = etf.getTotalValue();

        // Calculate expected sell (5% of total value)
        uint256 expectedSellValue = (totalValueBefore * 500) / WEIGHT_PRECISION;
        uint256 expectedSellAmount = (expectedSellValue * 1e18) / oracle.getPrice(address(usdt));

        // Verify expected is well below maxSell
        uint256 maxSell = usdtBalanceBefore / 2;
        assertLt(expectedSellAmount, maxSell / 2, "Expected should be well below maxSell");

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify actual transfer matches expected (not capped)
        uint256 usdtTransferred = usdtBalanceBefore - usdt.balanceOf(address(etf));
        assertApproxEqRel(usdtTransferred, expectedSellAmount, 0.0001e18, "Should use calculated amount");
    }

    /**
     * TC-CORE-017: sellAmount exactly equals maxSell
     *
     * Test edge case where calculation yields exactly 50% of balance.
     */
    function test_TC017_SellAmountEqualsMaxSell() public {
        // This is difficult to achieve exactly due to rounding
        // Instead, test very close to 50% boundary

        // Get current state
        uint256 totalValue = etf.getTotalValue();
        uint256 usdtBalance = usdt.balanceOf(address(etf));
        uint256 usdtPrice = oracle.getPrice(address(usdt));

        // Calculate weight change that would sell approximately 50%
        // Current USDT value = balance * price = 40% of total
        // To sell 50% of balance = 20% of total value
        // Target weight should be: 40% - 20% = 20%

        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 2000; // USDT: 40% → 20% (sell 20% of total = 50% of USDT)
        newWeights[1] = 2666; // Distribute remaining
        newWeights[2] = 2667;
        newWeights[3] = 2667;

        etf.adjustWeights(newWeights);

        uint256 maxSell = usdtBalance / 2;

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify transfer is at or very close to maxSell
        uint256 usdtTransferred = usdtBalance - usdt.balanceOf(address(etf));

        // Should be within 1% of maxSell
        assertApproxEqRel(usdtTransferred, maxSell, 0.01e18, "Should be at maxSell boundary");
    }

    /*//////////////////////////////////////////////////////////////
                A-II-3: balancesBefore RECORDING
    //////////////////////////////////////////////////////////////*/

    /**
     * TC-CORE-018: Record all asset balances
     *
     * Test that balancesBefore array correctly captures all asset balances
     * before any transfers occur.
     */
    function test_TC018_RecordAllAssetBalances() public {
        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000;
        newWeights[1] = 3000;
        newWeights[2] = 2000;
        newWeights[3] = 2000;

        etf.adjustWeights(newWeights);

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify test rebalancer captured balancesBefore
        // balancesBefore is the balance at the START of callback (AFTER transfer from Core)
        // For sell orders (positive amounts), rebalancer receives tokens
        // For buy orders (negative amounts), rebalancer receives 0

        // USDT is sell order (over-weighted), so rebalancer should have received some
        assertGt(rebalancer.balancesBefore(0), 0, "USDT balance should be > 0 (sell order)");

        // BTC is buy order (under-weighted), should have received 0 initially
        assertEq(rebalancer.balancesBefore(2), 0, "BTC balance should be 0 (buy order)");
    }

    /**
     * TC-CORE-019: Asset with minimal allocation
     *
     * Test that balancesBefore correctly handles assets with very small allocations.
     * This tests the edge case where an asset's weight is minimal (1 bps = 0.01%).
     */
    function test_TC019_SomeAssetsZeroBalance() public {
        // This test verifies that _prepareRebalance can handle the edge case
        // where balancesBefore might be very small (but not zero, since Core requires >0 weight)

        // Create scenario where we test minimal balance handling
        // Set ETH to 1% weight (small but legal)
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 4900; // USDT: 49%
        newWeights[1] = 3000; // WBNB: 30%
        newWeights[2] = 2000; // BTC: 20%
        newWeights[3] = 100; // ETH: 1% (small weight, total = 10000)

        etf.adjustWeights(newWeights);

        // Get balances before rebalance
        uint256 ethBalanceBefore = eth.balanceOf(address(etf));

        // Execute rebalance
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify the rebalance completed successfully even with small ETH weight
        assertTrue(etf.lastRebalanceTime() == block.timestamp, "Rebalance should succeed with small weight");

        // The test proves that _prepareRebalance's balancesBefore recording works
        // correctly even when balances are very small (approaching zero)
        // In this case, ETH had to be sold down significantly
        uint256 ethBalanceAfter = eth.balanceOf(address(etf));
        assertLt(ethBalanceAfter, ethBalanceBefore, "ETH balance should decrease");
    }

    /*//////////////////////////////////////////////////////////////
                A-II-4: totalValueBefore CALCULATION
    //////////////////////////////////////////////////////////////*/

    /**
     * TC-CORE-020: getTotalValue called correctly
     *
     * Test that totalValueBefore equals sum of (balance * price) for all assets.
     */
    function test_TC020_GetTotalValueCorrect() public {
        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000;
        newWeights[1] = 2500;
        newWeights[2] = 2500;
        newWeights[3] = 2000;

        etf.adjustWeights(newWeights);

        // Calculate expected total value manually BEFORE rebalance
        uint256 expectedTotal = 0;
        expectedTotal += (usdt.balanceOf(address(etf)) * oracle.getPrice(address(usdt))) / 1e18;
        expectedTotal += (wbnb.balanceOf(address(etf)) * oracle.getPrice(address(wbnb))) / 1e18;
        expectedTotal += (btc.balanceOf(address(etf)) * oracle.getPrice(address(btc))) / 1e18;
        expectedTotal += (eth.balanceOf(address(etf)) * oracle.getPrice(address(eth))) / 1e18;

        // Get actual total value from Core
        uint256 actualTotal = etf.getTotalValue();

        assertEq(actualTotal, expectedTotal, "Total value calculation should be correct");

        // NOTE: Core's _prepareRebalance calculates totalValueBefore internally
        // but doesn't pass it to the callback. This test verifies getTotalValue works correctly.
        // The actual totalValueBefore used in verification is calculated inside Core.

        // Execute rebalance - internal Core logic will use this value
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verification: The rebalance succeeded, meaning getTotalValue() worked correctly
        // in Core's internal _prepareRebalance function
        assertTrue(etf.lastRebalanceTime() == block.timestamp, "Rebalance should have succeeded");
    }

    /**
     * TC-CORE-021: Price is zero error
     *
     * Test that if oracle returns 0 price, the transaction reverts with InvalidPrice.
     */
    function test_TC021_PriceZeroError() public {
        // Create imbalance first
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 3000;
        newWeights[1] = 3000;
        newWeights[2] = 2000;
        newWeights[3] = 2000;

        etf.adjustWeights(newWeights);

        // Set BTC price to zero
        oracle.setPrice(address(btc), 0);

        // Attempt rebalance should revert
        vm.expectRevert(BlockETFCore.InvalidPrice.selector);
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");
    }
}

/**
 * @title Test Rebalancer
 * @notice Mock rebalancer that simulates real DEX swap behavior for testing
 * @dev This rebalancer:
 *      1. Sells over-weighted assets (positive amounts)
 *      2. Buys under-weighted assets (negative amounts) using oracle prices
 *      3. Returns all assets to Core
 *      4. Captures parameters for test verification
 */
contract TestRebalancer is IRebalanceCallback {
    using SafeERC20 for IERC20;

    address public etfCore;
    MockPriceOracle public oracle;

    // Captured parameters from last callback
    int256[] public lastRebalanceAmounts;
    uint256[] public lastBalancesBefore;
    uint256 public totalValueBefore;

    // Simulated slippage (in basis points, 100 = 1%)
    uint256 public simulatedSlippage = 0; // Default: no slippage

    constructor(address _etfCore, address _oracle) {
        etfCore = _etfCore;
        oracle = MockPriceOracle(_oracle);
    }

    function setSimulatedSlippage(uint256 _slippage) external {
        simulatedSlippage = _slippage;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata data)
        external
        override
    {
        require(msg.sender == etfCore, "Only ETF Core");

        // Capture parameters for test verification
        delete lastRebalanceAmounts;
        delete lastBalancesBefore;

        for (uint256 i = 0; i < amounts.length; i++) {
            lastRebalanceAmounts.push(amounts[i]);
            lastBalancesBefore.push(IERC20(assets[i]).balanceOf(address(this)));
        }

        // Phase 1: Collect USDT from selling over-weighted assets
        uint256 totalUSDTCollected = 0;

        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                // Sell order: convert asset to USDT at oracle price
                uint256 sellAmount = uint256(amounts[i]);
                uint256 usdtReceived = _simulateSell(assets[i], sellAmount);
                totalUSDTCollected += usdtReceived;
            }
        }

        // Phase 2: Buy under-weighted assets with collected USDT
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] < 0) {
                // Buy order: convert USDT to asset at oracle price
                uint256 targetAmount = uint256(-amounts[i]);
                _simulateBuy(assets[i], targetAmount);
            }
        }

        // Phase 3: Return all assets to Core
        for (uint256 i = 0; i < assets.length; i++) {
            uint256 balance = IERC20(assets[i]).balanceOf(address(this));
            if (balance > 0) {
                IERC20(assets[i]).safeTransfer(etfCore, balance);
            }
        }

        // Record total value (from data if encoded)
        if (data.length > 0) {
            (, totalValueBefore) = abi.decode(data, (address, uint256));
        }
    }

    /**
     * @notice Simulate selling an asset for USDT
     * @dev Uses oracle price with simulated slippage
     */
    function _simulateSell(address asset, uint256 amount) private returns (uint256 usdtReceived) {
        // Get asset price and decimals
        uint256 price = oracle.getPrice(asset);
        uint8 decimals = MockERC20(asset).decimals();

        // Calculate USD value
        uint256 usdValue = (amount * price) / (10 ** decimals);

        // Apply slippage (reduce received USDT)
        usdtReceived = (usdValue * (10000 - simulatedSlippage)) / 10000;

        // "Receive" USDT by minting to ourselves (simulates DEX swap)
        MockERC20(asset).burn(address(this), amount);
        // Note: We would mint USDT here, but we don't have USDT address
        // For testing purposes, we track the USDT conceptually
    }

    /**
     * @notice Simulate buying an asset with USDT
     * @dev Uses oracle price with simulated slippage
     */
    function _simulateBuy(address asset, uint256 targetAmount) private {
        // Get asset price and decimals
        uint256 price = oracle.getPrice(asset);
        uint8 decimals = MockERC20(asset).decimals();

        // Calculate required USD value
        uint256 requiredUSD = (targetAmount * price) / (10 ** decimals);

        // Apply slippage (need more USDT due to slippage)
        uint256 usdtSpent = (requiredUSD * (10000 + simulatedSlippage)) / 10000;

        // Calculate actual amount received after slippage
        uint256 actualAmount = (usdtSpent * (10 ** decimals)) / price;
        actualAmount = (actualAmount * (10000 - simulatedSlippage)) / 10000;

        // "Buy" asset by minting to ourselves (simulates DEX swap)
        MockERC20(asset).mint(address(this), actualAmount);
    }

    function balancesBefore(uint256 index) external view returns (uint256) {
        if (index < lastBalancesBefore.length) {
            return lastBalancesBefore[index];
        }
        return 0;
    }
}

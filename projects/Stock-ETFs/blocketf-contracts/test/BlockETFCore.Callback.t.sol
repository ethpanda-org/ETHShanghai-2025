// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/interfaces/IRebalanceCallback.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

/**
 * @title BlockETFCore Callback Tests
 * @notice Comprehensive tests for rebalanceCallback invocation during flashRebalance
 * @dev Tests TC-CORE-022 to TC-CORE-027 (Part A-III of test plan)
 */
contract BlockETFCoreCallbackTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;
    MockRebalancer public rebalancer;

    MockERC20 public usdt;
    MockERC20 public wbnb;
    MockERC20 public btc;
    MockERC20 public eth;

    address public owner;
    address public user;

    uint32 constant WEIGHT_PRECISION = 10000;

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
                    TC-CORE-022: NORMAL CALLBACK INVOCATION
    //////////////////////////////////////////////////////////////*/

    function test_TC022_Callback_NormalInvocation() public {
        // Deploy a callback tracker rebalancer
        CallbackTrackerRebalancer tracker = new CallbackTrackerRebalancer(address(etf));
        etf.setRebalancer(address(tracker));

        // Create imbalance
        uint32[] memory newWeights = new uint32[](4);
        newWeights[0] = 1000; // 10% (from 40%)
        newWeights[1] = 3000; // 30%
        newWeights[2] = 3000; // 30%
        newWeights[3] = 3000; // 30%
        etf.adjustWeights(newWeights);

        // Verify rebalance is needed
        (,, bool needsRebalance) = etf.getRebalanceInfo();
        assertTrue(needsRebalance, "Should need rebalance");

        // Execute rebalance
        vm.prank(address(tracker));
        etf.flashRebalance(address(tracker), "test-data");

        // Verify callback was invoked
        assertTrue(tracker.wasCallbackInvoked(), "Callback should have been invoked");
        assertEq(tracker.callbackCount(), 1, "Callback should be invoked exactly once");

        // Verify callback parameters
        assertEq(tracker.lastAssetsLength(), 4, "Should pass all 4 assets");
        assertEq(tracker.lastAssetAt(0), address(usdt), "Asset 0 should be USDT");
        assertEq(tracker.lastAssetAt(1), address(wbnb), "Asset 1 should be WBNB");
        assertEq(tracker.lastAssetAt(2), address(btc), "Asset 2 should be BTC");
        assertEq(tracker.lastAssetAt(3), address(eth), "Asset 3 should be ETH");

        assertEq(tracker.lastAmountsLength(), 4, "Should pass all 4 amounts");
        // USDT should be sell (positive rebalanceAmount)
        assertGt(tracker.lastAmountAt(0), 0, "USDT should be sold (positive amount)");

        bytes memory callbackData = tracker.lastData();
        assertEq(callbackData, "test-data", "Should pass custom data");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-023: CALLBACK RETURNS SUCCESS
    //////////////////////////////////////////////////////////////*/

    function test_TC023_Callback_ReturnsSuccess() public {
        // Use normal mock rebalancer (returns success)
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

        uint256 lastRebalanceBefore = etf.lastRebalanceTime();

        // Execute rebalance - callback should succeed
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify Phase 3 (_verifyAndFinalizeRebalance) executed
        uint256 lastRebalanceAfter = etf.lastRebalanceTime();
        assertGt(lastRebalanceAfter, lastRebalanceBefore, "Should proceed to Phase 3 after successful callback");
        assertEq(lastRebalanceAfter, block.timestamp, "Timestamp should update to current time");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-024: CALLBACK REVERT
    //////////////////////////////////////////////////////////////*/

    function test_TC024_Callback_Reverts() public {
        // Configure rebalancer to revert
        rebalancer.setShouldRevert(true);

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

        uint256 lastRebalanceBefore = etf.lastRebalanceTime();

        // Record initial state
        (uint256[] memory weightsBefore,,) = etf.getRebalanceInfo();

        // Attempt rebalance - should revert due to callback failure
        vm.expectRevert("MockRebalancer: intentional revert");
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify state was not modified (rolled back)
        assertEq(etf.lastRebalanceTime(), lastRebalanceBefore, "Timestamp should not update");

        // Verify weights unchanged
        (uint256[] memory weightsAfter,,) = etf.getRebalanceInfo();
        for (uint256 i = 0; i < weightsBefore.length; i++) {
            assertEq(weightsAfter[i], weightsBefore[i], "Weights should not change on revert");
        }
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-025: CALLBACK HIGH GAS CONSUMPTION
    //////////////////////////////////////////////////////////////*/

    function test_TC025_Callback_HighGasConsumption() public {
        // Deploy high gas rebalancer
        HighGasRebalancer gasRebalancer = new HighGasRebalancer(address(etf));
        etf.setRebalancer(address(gasRebalancer));

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

        // Record gas before
        uint256 gasBefore = gasleft();

        // Execute rebalance with high gas callback
        vm.prank(address(gasRebalancer));
        etf.flashRebalance(address(gasRebalancer), "");

        // Record gas after
        uint256 gasUsed = gasBefore - gasleft();

        // Verify execution succeeded despite high gas
        assertEq(etf.lastRebalanceTime(), block.timestamp, "Should complete despite high gas");

        // Log gas consumption for monitoring
        // Note: In production, consider adding gas buffer checks
        emit log_named_uint("Gas used for high-gas callback", gasUsed);

        // Basic sanity check: should not exceed 30M gas (block limit on BSC)
        assertLt(gasUsed, 30_000_000, "Should not exceed block gas limit");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-026: CALLBACK REENTRANCY ATTEMPT
    //////////////////////////////////////////////////////////////*/

    function test_TC026_Callback_ReentrancyAttempt() public {
        // Configure rebalancer to attempt reentrancy
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

        // Verify state unchanged
        assertNotEq(etf.lastRebalanceTime(), block.timestamp, "Timestamp should not update on reentrancy");
    }

    /*//////////////////////////////////////////////////////////////
                    TC-CORE-027: MALICIOUS RECEIVER KEEPS TOKENS
    //////////////////////////////////////////////////////////////*/

    function test_TC027_Callback_MaliciousReceiverKeepsTokens() public {
        // Configure rebalancer to keep tokens (not return them)
        rebalancer.setShouldKeepTokens(true);

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

        // Attempt rebalance with malicious callback
        // Should revert in Phase 3 verification (_verifyNoOrphanedTokens or balance checks)
        vm.expectRevert(); // Could be OrphanedTokens or UnexpectedBalanceChange
        vm.prank(address(rebalancer));
        etf.flashRebalance(address(rebalancer), "");

        // Verify state unchanged (rollback)
        assertNotEq(etf.lastRebalanceTime(), block.timestamp, "Timestamp should not update when tokens not returned");
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

/**
 * @title Callback Tracker Rebalancer
 * @notice Tracks callback invocations for testing TC-022
 */
contract CallbackTrackerRebalancer is IRebalanceCallback {
    address public immutable etfCore;

    bool public callbackInvoked;
    uint256 public callbackCount;
    address[] private _lastAssets;
    int256[] private _lastAmounts;
    bytes public lastData;

    constructor(address _etfCore) {
        etfCore = _etfCore;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata data)
        external
        override
    {
        callbackInvoked = true;
        callbackCount++;

        // Store callback parameters for verification
        delete _lastAssets;
        delete _lastAmounts;

        for (uint256 i = 0; i < assets.length; i++) {
            _lastAssets.push(assets[i]);
            _lastAmounts.push(amounts[i]);
        }
        lastData = data;

        // Properly handle the rebalance like normal mock
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                // Sell: burn received assets (simulate DEX swap consumption)
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            } else if (amounts[i] < 0) {
                // Buy: mint and return
                MockERC20(assets[i]).mint(address(this), uint256(-amounts[i]));
                IERC20(assets[i]).transfer(msg.sender, uint256(-amounts[i]));
            }
        }
    }

    function wasCallbackInvoked() external view returns (bool) {
        return callbackInvoked;
    }

    function lastAssetsLength() external view returns (uint256) {
        return _lastAssets.length;
    }

    function lastAssetAt(uint256 index) external view returns (address) {
        return _lastAssets[index];
    }

    function lastAmountsLength() external view returns (uint256) {
        return _lastAmounts.length;
    }

    function lastAmountAt(uint256 index) external view returns (int256) {
        return _lastAmounts[index];
    }
}

/**
 * @title High Gas Rebalancer
 * @notice Consumes significant gas in callback for testing TC-025
 */
contract HighGasRebalancer is IRebalanceCallback {
    address public immutable etfCore;

    // Storage to consume gas
    mapping(uint256 => uint256) public gasConsumer;

    constructor(address _etfCore) {
        etfCore = _etfCore;
    }

    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata /* data */ )
        external
        override
    {
        // Consume significant gas by writing to storage
        // Write 100 storage slots (each SSTORE ~20k gas = ~2M gas)
        for (uint256 i = 0; i < 100; i++) {
            gasConsumer[i] = block.timestamp;
        }

        // Still properly handle the rebalance
        for (uint256 i = 0; i < assets.length; i++) {
            if (amounts[i] > 0) {
                // Sell: burn received assets (simulate DEX swap consumption)
                uint256 balance = IERC20(assets[i]).balanceOf(address(this));
                if (balance > 0) {
                    MockERC20(assets[i]).burn(address(this), balance);
                }
            } else if (amounts[i] < 0) {
                // Buy: mint and return
                MockERC20(assets[i]).mint(address(this), uint256(-amounts[i]));
                IERC20(assets[i]).transfer(msg.sender, uint256(-amounts[i]));
            }
        }
    }
}

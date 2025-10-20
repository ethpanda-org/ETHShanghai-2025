// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/mocks/MockERC20.sol";
import "../src/mocks/MockPriceOracle.sol";

/**
 * @title BlockETFCore Rebalance Verification Thresholds Tests
 * @notice Tests for configurable rebalance verification thresholds
 */
contract BlockETFCoreThresholdsTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;
    MockERC20 public token1;
    MockERC20 public token2;
    MockERC20 public token3;

    address public owner = address(this);
    address public user1 = address(0x1);

    function setUp() public {
        // Deploy mock tokens
        token1 = new MockERC20("Token 1", "TK1", 18);
        token2 = new MockERC20("Token 2", "TK2", 18);
        token3 = new MockERC20("Token 3", "TK3", 18);

        // Deploy price oracle
        oracle = new MockPriceOracle();
        oracle.setPrice(address(token1), 1e18); // $1
        oracle.setPrice(address(token2), 10e18); // $10
        oracle.setPrice(address(token3), 100e18); // $100

        // Deploy ETF
        etf = new BlockETFCore("Test ETF", "TETF", address(oracle));

        // Setup initial assets
        address[] memory assets = new address[](3);
        assets[0] = address(token1);
        assets[1] = address(token2);
        assets[2] = address(token3);

        uint32[] memory weights = new uint32[](3);
        weights[0] = 5000; // 50%
        weights[1] = 3000; // 30%
        weights[2] = 2000; // 20%

        // Mint tokens for initialization
        token1.mint(owner, 100000e18);
        token2.mint(owner, 100000e18);
        token3.mint(owner, 100000e18);

        // Approve
        token1.approve(address(etf), type(uint256).max);
        token2.approve(address(etf), type(uint256).max);
        token3.approve(address(etf), type(uint256).max);

        // Initialize
        etf.initialize(assets, weights, 100000e18);
    }

    /*//////////////////////////////////////////////////////////////
                        DEFAULT VALUES TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Thresholds_DefaultValues() public view {
        assertEq(etf.maxSellSlippageBps(), 200, "Default max sell slippage should be 200 bps (2%)");
        assertEq(etf.maxBuySlippageBps(), 500, "Default max buy slippage should be 500 bps (5%)");
        assertEq(etf.maxTotalValueLossBps(), 500, "Default max total value loss should be 500 bps (5%)");
        assertEq(etf.weightImprovementToleranceBps(), 200, "Default weight tolerance should be 200 bps (2%)");
        assertEq(etf.unchangedAssetToleranceBps(), 1, "Default unchanged tolerance should be 1 bps (0.01%)");
    }

    /*//////////////////////////////////////////////////////////////
                        SETTER TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Thresholds_SetAllThresholds() public {
        // Set new thresholds
        etf.setRebalanceVerificationThresholds(300, 600, 700, 300, 5);

        // Verify
        assertEq(etf.maxSellSlippageBps(), 300);
        assertEq(etf.maxBuySlippageBps(), 600);
        assertEq(etf.maxTotalValueLossBps(), 700);
        assertEq(etf.weightImprovementToleranceBps(), 300);
        assertEq(etf.unchangedAssetToleranceBps(), 5);
    }

    function test_Thresholds_OnlyOwnerCanSet() public {
        vm.prank(user1);
        vm.expectRevert();
        etf.setRebalanceVerificationThresholds(300, 600, 700, 300, 5);
    }

    function test_Thresholds_EmitsEvent() public {
        vm.expectEmit(true, true, true, true);
        emit IBlockETFCore.RebalanceVerificationThresholdsUpdated(300, 600, 700, 300, 5);

        etf.setRebalanceVerificationThresholds(300, 600, 700, 300, 5);
    }

    /*//////////////////////////////////////////////////////////////
                        VALIDATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Thresholds_RevertIf_MaxSlippageTooLarge() public {
        vm.expectRevert(BlockETFCore.ThresholdTooLarge.selector);
        etf.setRebalanceVerificationThresholds(1001, 500, 500, 200, 1); // > 1000 bps (10%)
    }

    function test_Thresholds_RevertIf_MaxBuyExcessTooLarge() public {
        vm.expectRevert(BlockETFCore.ThresholdTooLarge.selector);
        etf.setRebalanceVerificationThresholds(200, 1001, 500, 200, 1); // > 1000 bps (10%)
    }

    function test_Thresholds_RevertIf_MaxTotalValueLossTooLarge() public {
        vm.expectRevert(BlockETFCore.ThresholdTooLarge.selector);
        etf.setRebalanceVerificationThresholds(200, 500, 1001, 200, 1); // > 1000 bps (10%)
    }

    function test_Thresholds_RevertIf_WeightToleranceTooLarge() public {
        vm.expectRevert(BlockETFCore.ThresholdTooLarge.selector);
        etf.setRebalanceVerificationThresholds(200, 500, 500, 501, 1); // > 500 bps (5%)
    }

    function test_Thresholds_RevertIf_UnchangedToleranceTooLarge() public {
        vm.expectRevert(BlockETFCore.ThresholdTooLarge.selector);
        etf.setRebalanceVerificationThresholds(200, 500, 500, 200, 101); // > 100 bps (1%)
    }

    /*//////////////////////////////////////////////////////////////
                        BOUNDARY TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Thresholds_SetToMaximumAllowed() public {
        // Set all to maximum allowed
        etf.setRebalanceVerificationThresholds(1000, 1000, 1000, 500, 100);

        assertEq(etf.maxSellSlippageBps(), 1000);
        assertEq(etf.maxBuySlippageBps(), 1000);
        assertEq(etf.maxTotalValueLossBps(), 1000);
        assertEq(etf.weightImprovementToleranceBps(), 500);
        assertEq(etf.unchangedAssetToleranceBps(), 100);
    }

    function test_Thresholds_SetToZero() public {
        // Set all to zero (very strict)
        etf.setRebalanceVerificationThresholds(0, 0, 0, 0, 0);

        assertEq(etf.maxSellSlippageBps(), 0);
        assertEq(etf.maxBuySlippageBps(), 0);
        assertEq(etf.maxTotalValueLossBps(), 0);
        assertEq(etf.weightImprovementToleranceBps(), 0);
        assertEq(etf.unchangedAssetToleranceBps(), 0);
    }

    /*//////////////////////////////////////////////////////////////
                        MULTIPLE UPDATE TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Thresholds_MultipleUpdates() public {
        // First update
        etf.setRebalanceVerificationThresholds(300, 600, 700, 300, 5);
        assertEq(etf.maxSellSlippageBps(), 300);

        // Second update
        etf.setRebalanceVerificationThresholds(400, 700, 800, 400, 10);
        assertEq(etf.maxSellSlippageBps(), 400);
        assertEq(etf.maxBuySlippageBps(), 700);

        // Third update
        etf.setRebalanceVerificationThresholds(100, 200, 300, 100, 1);
        assertEq(etf.maxSellSlippageBps(), 100);
        assertEq(etf.unchangedAssetToleranceBps(), 1);
    }

    function test_Thresholds_IndependentParameters() public {
        // Change only max slippage
        etf.setRebalanceVerificationThresholds(999, 500, 500, 200, 1);
        assertEq(etf.maxSellSlippageBps(), 999);
        assertEq(etf.maxBuySlippageBps(), 500); // Others unchanged

        // Change only buy excess
        etf.setRebalanceVerificationThresholds(999, 888, 500, 200, 1);
        assertEq(etf.maxSellSlippageBps(), 999);
        assertEq(etf.maxBuySlippageBps(), 888);
    }

    /*//////////////////////////////////////////////////////////////
                        GAS OPTIMIZATION TESTS
    //////////////////////////////////////////////////////////////*/

    function test_Thresholds_GasUsage() public {
        uint256 gasBefore = gasleft();
        etf.setRebalanceVerificationThresholds(300, 600, 700, 300, 5);
        uint256 gasUsed = gasBefore - gasleft();

        // Gas should be reasonable (< 100k)
        assertLt(gasUsed, 100000, "Gas usage should be reasonable");
    }
}

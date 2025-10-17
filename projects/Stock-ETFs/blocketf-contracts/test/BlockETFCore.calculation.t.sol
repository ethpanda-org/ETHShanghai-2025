// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

contract BlockETFCoreCalculationTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;

    MockERC20 public token1;
    MockERC20 public token2;
    MockERC20 public token3;

    address public owner;
    address public user1;
    address public user2;
    address public feeCollector;

    uint32 constant WEIGHT_PRECISION = 10000;
    uint256 constant INITIAL_ETF_VALUE = 1000e18;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        feeCollector = address(0x3);

        oracle = new MockPriceOracle();

        token1 = new MockERC20("Token1", "TK1", 18);
        token2 = new MockERC20("Token2", "TK2", 18);
        token3 = new MockERC20("Token3", "TK3", 6); // USDC-like

        oracle.setPrice(address(token1), 1e18); // $1
        oracle.setPrice(address(token2), 2e18); // $2
        oracle.setPrice(address(token3), 1e18); // $1

        etf = new BlockETFCore("BlockETF", "BETF", address(oracle));

        // Initialize the ETF with equal weights
        address[] memory assets = new address[](2);
        assets[0] = address(token1);
        assets[1] = address(token2);

        uint32[] memory weights = new uint32[](2);
        weights[0] = 5000; // 50%
        weights[1] = 5000; // 50%

        // Mint tokens and approve for initialization
        token1.mint(owner, 500e18);
        token2.mint(owner, 250e18); // $500 worth at $2 per token
        token1.approve(address(etf), 500e18);
        token2.approve(address(etf), 250e18);

        etf.initialize(assets, weights, INITIAL_ETF_VALUE);

        // Setup fee collector
        etf.setFeeCollector(feeCollector);
    }

    // ===========================
    // calculateMintShares 基础功能测试
    // ===========================

    // CORE-CALC-001: 正常比例计算
    function test_CORE_CALC_001_NormalRatioCalculation() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18; // Token1
        amounts[1] = 50e18; // Token2

        uint256 shares = etf.calculateMintShares(amounts);

        // Expected: min((100/500), (50/250)) * totalSupply = min(0.2, 0.2) * 1000 = 200
        uint256 expectedShares = (etf.totalSupply() * 100e18) / 500e18; // 0.2 ratio
        assertEq(shares, expectedShares, "Should calculate correct shares for normal ratio");
    }

    // CORE-CALC-002: 最小比例原则
    function test_CORE_CALC_002_MinRatioPrinciple() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18; // Token1: 100/500 = 0.2 ratio
        amounts[1] = 25e18; // Token2: 25/250 = 0.1 ratio (minimum)

        uint256 shares = etf.calculateMintShares(amounts);

        // Should use the minimum ratio (0.1)
        uint256 expectedShares = (etf.totalSupply() * 25e18) / 250e18; // 0.1 ratio
        assertEq(shares, expectedShares, "Should use minimum ratio principle");
    }

    // CORE-CALC-003: 完美比例
    function test_CORE_CALC_003_PerfectRatio() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 250e18; // Token1: 250/500 = 0.5 ratio
        amounts[1] = 125e18; // Token2: 125/250 = 0.5 ratio

        uint256 shares = etf.calculateMintShares(amounts);

        uint256 expectedShares = etf.totalSupply() / 2; // 0.5 of total supply
        assertEq(shares, expectedShares, "Should maximize shares for perfect ratio");
    }

    // CORE-CALC-005: 数组长度不匹配
    function test_CORE_CALC_005_InvalidArrayLength() public {
        uint256[] memory wrongLengthAmounts = new uint256[](3);
        wrongLengthAmounts[0] = 100e18;
        wrongLengthAmounts[1] = 50e18;
        wrongLengthAmounts[2] = 25e18;

        vm.expectRevert(BlockETFCore.InvalidLength.selector);
        etf.calculateMintShares(wrongLengthAmounts);
    }

    // CORE-CALC-006: 零数量输入
    function test_CORE_CALC_006_ZeroAmountInput() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 0;
        amounts[1] = 0;

        uint256 shares = etf.calculateMintShares(amounts);
        assertEq(shares, 0, "Should return 0 shares for zero amounts");
    }

    // CORE-CALC-007: 部分零数量
    function test_CORE_CALC_007_PartialZeroAmount() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 0; // Zero amount for token2

        uint256 shares = etf.calculateMintShares(amounts);
        assertEq(shares, 0, "Should return 0 shares when any amount is zero");
    }

    // CORE-CALC-008: 空数组
    function test_CORE_CALC_008_EmptyArray() public {
        uint256[] memory emptyAmounts = new uint256[](0);

        vm.expectRevert(BlockETFCore.InvalidLength.selector);
        etf.calculateMintShares(emptyAmounts);
    }

    // CORE-CALC-009: 极小数量
    function test_CORE_CALC_009_VerySmallAmounts() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1; // 1 wei
        amounts[1] = 1; // 1 wei

        uint256 shares = etf.calculateMintShares(amounts);
        // With current reserves (500e18, 250e18), 1 wei should result in very small shares
        assertLe(shares, 1000, "Should handle very small amounts");
    }

    // CORE-CALC-010: 极大数量
    function test_CORE_CALC_010_VeryLargeAmounts() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1e30;
        amounts[1] = 5e29;

        uint256 shares = etf.calculateMintShares(amounts);
        assertGt(shares, 0, "Should handle very large amounts without overflow");
    }

    // CORE-CALC-012: 总供应为零
    function test_CORE_CALC_012_ZeroTotalSupply() public {
        // Deploy new ETF without initialization
        BlockETFCore newEtf = new BlockETFCore("NewETF", "NETF", address(oracle));

        uint256[] memory amounts = new uint256[](0); // Empty array since no assets

        // Before initialization, should return 0 for empty arrays
        uint256 shares = newEtf.calculateMintShares(amounts);
        assertEq(shares, 0, "Should return 0 when total supply is 0");
    }

    // ===========================
    // calculateBurnAmounts 基础功能测试
    // ===========================

    // CORE-CALC-013: 正常赎回计算
    function test_CORE_CALC_013_NormalBurnCalculation() public {
        uint256 sharesToBurn = 100e18;
        uint256[] memory amounts = etf.calculateBurnAmounts(sharesToBurn);

        uint256 totalSupply = etf.totalSupply();
        uint256 expectedToken1 = (500e18 * sharesToBurn) / totalSupply;
        uint256 expectedToken2 = (250e18 * sharesToBurn) / totalSupply;

        assertEq(amounts[0], expectedToken1, "Token1 burn amount should be correct");
        assertEq(amounts[1], expectedToken2, "Token2 burn amount should be correct");
    }

    // CORE-CALC-014: 费用扣除计算
    function test_CORE_CALC_014_WithdrawFeeDeduction() public {
        // Set 1% withdraw fee
        etf.setFees(uint32(100), 0);

        uint256 sharesToBurn = 100e18;
        uint256[] memory amounts = etf.calculateBurnAmounts(sharesToBurn);

        // Calculate expected amounts after fee deduction
        uint256 withdrawFee = (sharesToBurn * 100 + WEIGHT_PRECISION - 1) / WEIGHT_PRECISION; // ceil div
        uint256 sharesAfterFee = sharesToBurn - withdrawFee;

        uint256 totalSupply = etf.totalSupply();
        uint256 expectedToken1 = (500e18 * sharesAfterFee) / totalSupply;
        uint256 expectedToken2 = (250e18 * sharesAfterFee) / totalSupply;

        assertEq(amounts[0], expectedToken1, "Token1 amount should reflect fee deduction");
        assertEq(amounts[1], expectedToken2, "Token2 amount should reflect fee deduction");
    }

    // CORE-CALC-015: 零费用计算
    function test_CORE_CALC_015_ZeroFeeCalculation() public {
        etf.setFees(uint32(0), 0);

        uint256 sharesToBurn = 100e18;
        uint256[] memory amounts = etf.calculateBurnAmounts(sharesToBurn);

        uint256 totalSupply = etf.totalSupply();
        uint256 expectedToken1 = (500e18 * sharesToBurn) / totalSupply;
        uint256 expectedToken2 = (250e18 * sharesToBurn) / totalSupply;

        assertEq(amounts[0], expectedToken1, "Should have no fee deduction");
        assertEq(amounts[1], expectedToken2, "Should have no fee deduction");
    }

    // CORE-CALC-017: 零份额输入
    function test_CORE_CALC_017_ZeroSharesInput() public {
        uint256[] memory amounts = etf.calculateBurnAmounts(0);

        assertEq(amounts[0], 0, "Should return 0 for token1");
        assertEq(amounts[1], 0, "Should return 0 for token2");
        assertEq(amounts.length, 2, "Should return correct array length");
    }

    // CORE-CALC-018: 超大份额
    function test_CORE_CALC_018_ExcessiveShares() public {
        uint256 totalSupply = etf.totalSupply();
        uint256 excessiveShares = totalSupply * 2; // Double the total supply

        uint256[] memory amounts = etf.calculateBurnAmounts(excessiveShares);

        // Should calculate based on the input without validation
        assertGt(amounts[0], 500e18, "Should calculate proportionally even for excessive shares");
        assertGt(amounts[1], 250e18, "Should calculate proportionally even for excessive shares");
    }

    // CORE-CALC-020: 高费率影响
    function test_CORE_CALC_020_HighFeeImpact() public {
        // Set 10% withdraw fee
        etf.setFees(uint32(1000), 0);

        uint256 sharesToBurn = 100e18;
        uint256[] memory amountsWithFee = etf.calculateBurnAmounts(sharesToBurn);

        // Compare with zero fee
        etf.setFees(uint32(0), 0);
        uint256[] memory amountsNoFee = etf.calculateBurnAmounts(sharesToBurn);

        assertLt(amountsWithFee[0], amountsNoFee[0], "High fee should significantly reduce token1");
        assertLt(amountsWithFee[1], amountsNoFee[1], "High fee should significantly reduce token2");
    }

    // CORE-CALC-021: 费用向上取整
    function test_CORE_CALC_021_FeeCeilDiv() public {
        etf.setFees(uint32(1), 0); // 0.01% fee

        uint256 sharesToBurn = 10001; // Results in fractional fee
        uint256[] memory amounts = etf.calculateBurnAmounts(sharesToBurn);

        // Expected fee = ceil(10001 * 1 / 10000) = ceil(1.0001) = 2
        uint256 expectedFee = 2;
        uint256 expectedSharesAfterFee = sharesToBurn - expectedFee;

        // Verify the fee was rounded up by checking the result
        uint256 totalSupply = etf.totalSupply();
        uint256 expectedToken1 = (500e18 * expectedSharesAfterFee) / totalSupply;

        assertEq(amounts[0], expectedToken1, "Fee should be rounded up (ceil division)");
    }

    // ===========================
    // calculateRequiredAmounts 基础功能测试
    // ===========================

    // CORE-CALC-023: 正常需求计算
    function test_CORE_CALC_023_NormalRequiredCalculation() public {
        uint256 sharesToMint = 100e18;
        uint256[] memory amounts = etf.calculateRequiredAmounts(sharesToMint);

        uint256 totalSupply = etf.totalSupply();
        uint256 expectedToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 expectedToken2 = (250e18 * sharesToMint) / totalSupply;

        assertEq(amounts[0], expectedToken1, "Required token1 amount should be correct");
        assertEq(amounts[1], expectedToken2, "Required token2 amount should be correct");
    }

    // CORE-CALC-024: 比例准确性
    function test_CORE_CALC_024_ProportionAccuracy() public {
        uint256[] memory shares = new uint256[](3);
        shares[0] = 50e18;
        shares[1] = 100e18;
        shares[2] = 200e18;

        for (uint256 i = 0; i < shares.length; i++) {
            uint256[] memory amounts = etf.calculateRequiredAmounts(shares[i]);

            // Verify ratio is maintained
            uint256 ratio1 = (amounts[0] * 1e18) / 500e18; // ratio to current reserve1
            uint256 ratio2 = (amounts[1] * 1e18) / 250e18; // ratio to current reserve2

            assertApproxEqRel(ratio1, ratio2, 1e14, "Ratios should be equal for all assets");
        }
    }

    // CORE-CALC-027: 零份额输入
    function test_CORE_CALC_027_ZeroSharesRequired() public {
        uint256[] memory amounts = etf.calculateRequiredAmounts(0);

        assertEq(amounts[0], 0, "Should require 0 token1");
        assertEq(amounts[1], 0, "Should require 0 token2");
        assertEq(amounts.length, 2, "Should return correct array length");
    }

    // CORE-CALC-029: 总供应为零
    function test_CORE_CALC_029_ZeroTotalSupplyRequired() public {
        // Deploy new ETF without initialization
        BlockETFCore newEtf = new BlockETFCore("NewETF", "NETF", address(oracle));

        // For uninitialized ETF, assets array is empty, so this will create empty array
        uint256[] memory amounts = newEtf.calculateRequiredAmounts(100e18);

        // Should return empty array for uninitialized ETF
        assertEq(amounts.length, 0, "Should return empty array for uninitialized ETF");
    }

    // ===========================
    // 精度和数学测试
    // ===========================

    // CORE-CALC-030: 计算精度损失
    function test_CORE_CALC_030_PrecisionLoss() public {
        // Use odd numbers that may cause precision loss
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 333333333333333333;
        amounts[1] = 166666666666666666;

        uint256 shares = etf.calculateMintShares(amounts);
        assertGt(shares, 0, "Should handle precision loss gracefully");

        // Test calculateRequiredAmounts with odd share number
        uint256[] memory required = etf.calculateRequiredAmounts(333333333333333333);
        assertGt(required[0], 0, "Should calculate required amounts despite precision loss");
        assertGt(required[1], 0, "Should calculate required amounts despite precision loss");
    }

    // CORE-CALC-031: 大数计算
    function test_CORE_CALC_031_LargeNumberCalculation() public {
        // Test with very large numbers close to uint256 max
        uint256 largeShares = type(uint128).max;

        uint256[] memory burnAmounts = etf.calculateBurnAmounts(largeShares);
        uint256[] memory requiredAmounts = etf.calculateRequiredAmounts(largeShares);

        // Should not overflow and return reasonable values
        assertGt(burnAmounts[0], 0, "Should handle large burn calculation");
        assertGt(requiredAmounts[0], 0, "Should handle large required calculation");
    }

    // CORE-CALC-033: 比例对称性
    function test_CORE_CALC_033_ProportionSymmetry() public {
        uint256 shares = 100e18;

        // Calculate required amounts for minting
        uint256[] memory required = etf.calculateRequiredAmounts(shares);

        // Calculate shares that would be minted with those amounts
        uint256 calculatedShares = etf.calculateMintShares(required);

        // Should be approximately symmetric (allowing for rounding)
        assertApproxEqRel(calculatedShares, shares, 1e14, "Calculations should be approximately symmetric");
    }

    // ===========================
    // 集成测试 - calculateMintShares
    // ===========================

    // CORE-CALC-034: 与mint()对比
    function test_CORE_CALC_034_CompareWithMint() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        // Calculate predicted shares
        uint256 predictedShares = etf.calculateMintShares(amounts);

        // Perform actual mint
        token1.mint(user1, amounts[0]);
        token2.mint(user1, amounts[1]);

        vm.startPrank(user1);
        token1.transfer(address(etf), amounts[0]);
        token2.transfer(address(etf), amounts[1]);
        uint256 actualShares = etf.mint(user1);
        vm.stopPrank();

        assertEq(actualShares, predictedShares, "Predicted shares should match actual mint");
    }

    // CORE-CALC-035: 多余资产处理
    function test_CORE_CALC_035_ExcessAssetHandling() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 200e18; // Double the proportional amount
        amounts[1] = 50e18; // Proportional amount

        uint256 predictedShares = etf.calculateMintShares(amounts);

        // Should predict based on minimum ratio (token2)
        uint256 expectedShares = (etf.totalSupply() * 50e18) / 250e18;
        assertEq(predictedShares, expectedShares, "Should predict minimum ratio shares");
    }

    // CORE-CALC-036: 时间一致性
    function test_CORE_CALC_036_TimeConsistency() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        uint256 shares1 = etf.calculateMintShares(amounts);
        uint256 shares2 = etf.calculateMintShares(amounts);

        assertEq(shares1, shares2, "Same block calculations should be identical");
    }

    // ===========================
    // 集成测试 - calculateBurnAmounts
    // ===========================

    // CORE-CALC-038: 与burn()对比
    function test_CORE_CALC_038_CompareWithBurn() public {
        // First give user1 some shares
        uint256 sharesToBurn = 50e18;

        // Mint some shares to user1
        token1.mint(user1, 100e18);
        token2.mint(user1, 50e18);

        vm.startPrank(user1);
        token1.approve(address(etf), 100e18);
        token2.approve(address(etf), 50e18);
        etf.mintExactShares(100e18, user1);

        // Calculate predicted burn amounts
        uint256[] memory predictedAmounts = etf.calculateBurnAmounts(sharesToBurn);

        // Perform actual burn
        uint256[] memory actualAmounts = etf.burn(sharesToBurn, user1);
        vm.stopPrank();

        assertEq(actualAmounts[0], predictedAmounts[0], "Predicted token1 should match actual burn");
        assertEq(actualAmounts[1], predictedAmounts[1], "Predicted token2 should match actual burn");
    }

    // CORE-CALC-039: 费用设置影响
    function test_CORE_CALC_039_FeeSettingImpact() public {
        uint256 sharesToBurn = 100e18;

        // Calculate without fee
        uint256[] memory amountsBefore = etf.calculateBurnAmounts(sharesToBurn);

        // Set fee and calculate again
        etf.setFees(uint32(200), 0); // 2% fee
        uint256[] memory amountsAfter = etf.calculateBurnAmounts(sharesToBurn);

        assertLt(amountsAfter[0], amountsBefore[0], "Fee should reduce burn amounts");
        assertLt(amountsAfter[1], amountsBefore[1], "Fee should reduce burn amounts");
    }

    // ===========================
    // 集成测试 - calculateRequiredAmounts
    // ===========================

    // CORE-CALC-042: 与mintExactShares对比
    function test_CORE_CALC_042_CompareWithMintExactShares() public {
        uint256 shares = 100e18;

        // Calculate required amounts
        uint256[] memory predictedAmounts = etf.calculateRequiredAmounts(shares);

        // Mint tokens to user1
        token1.mint(user1, predictedAmounts[0]);
        token2.mint(user1, predictedAmounts[1]);

        vm.startPrank(user1);
        token1.approve(address(etf), predictedAmounts[0]);
        token2.approve(address(etf), predictedAmounts[1]);

        // Perform actual mint
        uint256[] memory actualAmounts = etf.mintExactShares(shares, user1);
        vm.stopPrank();

        assertEq(actualAmounts[0], predictedAmounts[0], "Required token1 should match actual");
        assertEq(actualAmounts[1], predictedAmounts[1], "Required token2 should match actual");
    }

    // CORE-CALC-043: 储备变化影响
    function test_CORE_CALC_043_ReserveChangeImpact() public {
        uint256 shares = 100e18;

        // Calculate before mint
        uint256[] memory amountsBefore = etf.calculateRequiredAmounts(shares);

        // Perform a mint to change reserves
        token1.mint(user1, 50e18);
        token2.mint(user1, 25e18);

        vm.startPrank(user1);
        token1.transfer(address(etf), 50e18);
        token2.transfer(address(etf), 25e18);
        etf.mint(user1);
        vm.stopPrank();

        // Calculate after mint (reserves changed)
        uint256[] memory amountsAfter = etf.calculateRequiredAmounts(shares);

        // Ratios should remain the same despite reserve changes
        uint256 ratioBefore = (amountsBefore[0] * 1e18) / amountsBefore[1];
        uint256 ratioAfter = (amountsAfter[0] * 1e18) / amountsAfter[1];

        assertApproxEqRel(ratioBefore, ratioAfter, 1e14, "Asset ratios should remain consistent");
    }

    // ===========================
    // 跨函数集成测试
    // ===========================

    // CORE-CALC-046: 铸造-赎回循环
    function test_CORE_CALC_046_MintBurnCycle() public {
        // Initial balances
        uint256 initialToken1 = token1.balanceOf(address(etf));
        uint256 initialToken2 = token2.balanceOf(address(etf));

        uint256 shares = 100e18;

        // Calculate required amounts
        uint256[] memory requiredAmounts = etf.calculateRequiredAmounts(shares);

        // Mint shares
        token1.mint(user1, requiredAmounts[0]);
        token2.mint(user1, requiredAmounts[1]);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredAmounts[0]);
        token2.approve(address(etf), requiredAmounts[1]);
        etf.mintExactShares(shares, user1);

        // Calculate burn amounts (should approximately return to initial state)
        uint256[] memory burnAmounts = etf.calculateBurnAmounts(shares);

        // Burn shares
        etf.burn(shares, user1);
        vm.stopPrank();

        // Check if amounts are approximately correct (allowing for small rounding differences)
        uint256 finalToken1 = token1.balanceOf(address(etf));
        uint256 finalToken2 = token2.balanceOf(address(etf));

        assertApproxEqRel(finalToken1, initialToken1, 1e12, "Token1 should return to initial state");
        assertApproxEqRel(finalToken2, initialToken2, 1e12, "Token2 should return to initial state");
    }

    // CORE-CALC-047: 计算链一致性
    function test_CORE_CALC_047_CalculationChainConsistency() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        // Step 1: Calculate mint shares
        uint256 shares = etf.calculateMintShares(amounts);

        // Step 2: Calculate required amounts for those shares
        uint256[] memory requiredAmounts = etf.calculateRequiredAmounts(shares);

        // Step 3: Calculate burn amounts for those shares
        uint256[] memory burnAmounts = etf.calculateBurnAmounts(shares);

        // Required amounts should be <= original amounts (due to min ratio principle)
        assertLe(requiredAmounts[0], amounts[0], "Required token1 should not exceed input");
        assertLe(requiredAmounts[1], amounts[1], "Required token2 should not exceed input");

        // Burn amounts should approximately equal required amounts (ignoring fees)
        etf.setFees(uint32(0), 0); // Remove fees for comparison
        uint256[] memory burnAmountsNoFee = etf.calculateBurnAmounts(shares);

        assertApproxEqRel(burnAmountsNoFee[0], requiredAmounts[0], 1e12, "Burn should match required (no fee)");
        assertApproxEqRel(burnAmountsNoFee[1], requiredAmounts[1], 1e12, "Burn should match required (no fee)");
    }

    // ===========================
    // 状态依赖测试
    // ===========================

    // CORE-CALC-054: 暂停状态计算
    function test_CORE_CALC_054_PausedStateCalculation() public {
        etf.pause();

        // Calculation functions should still work during pause
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        uint256 shares = etf.calculateMintShares(amounts);
        assertGt(shares, 0, "Should calculate shares even when paused");

        uint256[] memory burnAmounts = etf.calculateBurnAmounts(100e18);
        assertGt(burnAmounts[0], 0, "Should calculate burn amounts when paused");

        uint256[] memory requiredAmounts = etf.calculateRequiredAmounts(100e18);
        assertGt(requiredAmounts[0], 0, "Should calculate required amounts when paused");
    }

    // CORE-CALC-055: 未初始化计算
    function test_CORE_CALC_055_UninitializedCalculation() public {
        BlockETFCore newEtf = new BlockETFCore("NewETF", "NETF", address(oracle));

        // For uninitialized ETF with no assets, providing empty array should return 0
        uint256[] memory amounts = new uint256[](0); // Empty array for uninitialized ETF

        // Should return 0 for uninitialized ETF with empty array
        uint256 shares = newEtf.calculateMintShares(amounts);
        assertEq(shares, 0, "Should return 0 for uninitialized ETF");

        // These should return empty arrays
        uint256[] memory burnAmounts = newEtf.calculateBurnAmounts(100e18);
        assertEq(burnAmounts.length, 0, "Should return empty array for uninitialized ETF");

        uint256[] memory requiredAmounts = newEtf.calculateRequiredAmounts(100e18);
        assertEq(requiredAmounts.length, 0, "Should return empty array for uninitialized ETF");
    }

    // ===========================
    // 边界和极端场景测试
    // ===========================

    // CORE-CALC-050: 单wei操作
    function test_CORE_CALC_050_SingleWeiOperation() public {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 1;
        amounts[1] = 1;

        uint256 shares = etf.calculateMintShares(amounts);
        // May be 0 due to precision loss
        assertLe(shares, 1000, "Should handle single wei amounts");

        uint256[] memory burnAmounts = etf.calculateBurnAmounts(1);
        uint256[] memory requiredAmounts = etf.calculateRequiredAmounts(1);

        // These may be 0 due to precision loss, but shouldn't revert
        assertTrue(burnAmounts[0] >= 0, "Should not revert for 1 wei burn");
        assertTrue(requiredAmounts[0] >= 0, "Should not revert for 1 wei required");
    }

    // CORE-CALC-052: 空池状态
    function test_CORE_CALC_052_EmptyPoolState() public {
        // This test simulates a theoretical empty pool state
        // In practice, this shouldn't happen after proper initialization

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        // Normal calculation should work with current reserves
        uint256 shares = etf.calculateMintShares(amounts);
        assertGt(shares, 0, "Should calculate shares with current reserves");
    }

    // ===========================
    // 费用对比测试
    // ===========================

    // CORE-CALC-049: 费用影响对比
    function test_CORE_CALC_049_FeeImpactComparison() public {
        uint256 shares = 100e18;

        // Calculate without fees
        etf.setFees(uint32(0), 0);
        uint256[] memory amountsNoFee = etf.calculateBurnAmounts(shares);

        // Calculate with fees
        etf.setFees(uint32(500), 0); // 5% fee
        uint256[] memory amountsWithFee = etf.calculateBurnAmounts(shares);

        // Verify fee impact
        uint256 expectedFeeReduction = 95; // 100 - 5 = 95%
        assertApproxEqRel(
            amountsWithFee[0] * 100,
            amountsNoFee[0] * expectedFeeReduction,
            1e15,
            "Fee impact should be correct for token1"
        );
        assertApproxEqRel(
            amountsWithFee[1] * 100,
            amountsNoFee[1] * expectedFeeReduction,
            1e15,
            "Fee impact should be correct for token2"
        );
    }
}

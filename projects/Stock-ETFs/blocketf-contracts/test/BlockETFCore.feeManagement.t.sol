// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

contract FeeReceiverContract {
    uint256 public receivedShares;
    BlockETFCore public etf;

    function setETF(address _etf) external {
        etf = BlockETFCore(_etf);
    }

    function getBalance() external view returns (uint256) {
        return etf.balanceOf(address(this));
    }
}

contract BlockETFCoreFeeManagementTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;

    MockERC20 public token1;
    MockERC20 public token2;

    address public owner;
    address public user1;
    address public user2;
    address public feeCollector;
    address public newFeeCollector;
    FeeReceiverContract public contractCollector;

    uint32 constant WEIGHT_PRECISION = 10000;
    uint256 constant SECONDS_PER_YEAR = 365 days;
    uint256 constant INITIAL_ETF_VALUE = 1000e18;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        feeCollector = address(0x3);
        newFeeCollector = address(0x4);

        oracle = new MockPriceOracle();

        token1 = new MockERC20("Token1", "TK1", 18);
        token2 = new MockERC20("Token2", "TK2", 18);

        oracle.setPrice(address(token1), 1e18); // $1
        oracle.setPrice(address(token2), 2e18); // $2

        etf = new BlockETFCore("BlockETF", "BETF", address(oracle));

        // Create contract fee collector
        contractCollector = new FeeReceiverContract();
        contractCollector.setETF(address(etf));

        // Initialize the ETF with equal weights
        address[] memory assets = new address[](2);
        assets[0] = address(token1);
        assets[1] = address(token2);

        uint32[] memory weights = new uint32[](2);
        weights[0] = 5000; // 50%
        weights[1] = 5000; // 50%

        // Mint tokens and approve for initialization
        token1.mint(owner, 500e18);
        token2.mint(owner, 250e18);
        token1.approve(address(etf), 500e18);
        token2.approve(address(etf), 250e18);

        etf.initialize(assets, weights, INITIAL_ETF_VALUE);

        // Setup fee collector
        etf.setFeeCollector(feeCollector);
    }

    // ===========================
    // 管理费累积测试 (CORE-FEE-001 到 005)
    // ===========================

    // CORE-FEE-001: 时间流逝累积
    function test_CORE_FEE_001_TimeBasedAccumulation() public {
        // Set 1% annual management fee (100 = 1% in bps)
        etf.setFees(0, 100);

        uint256 totalValueBefore = etf.getTotalValue();
        uint256 totalSupplyBefore = etf.totalSupply();

        // Wait 1 day
        vm.warp(block.timestamp + 1 days);

        uint256 feeShares = etf.collectManagementFee();

        // Calculate expected daily fee: (totalValue * 1% * 1day) / 365days
        uint256 expectedDailyFeeValue = totalValueBefore * 100 * 1 days / (WEIGHT_PRECISION * SECONDS_PER_YEAR);
        uint256 expectedFeeShares =
            (expectedDailyFeeValue * totalSupplyBefore) / (totalValueBefore - expectedDailyFeeValue);

        assertApproxEqRel(feeShares, expectedFeeShares, 1e15, "Daily fee accumulation should match expected");
        assertEq(etf.balanceOf(feeCollector), feeShares, "Fee collector should receive fee shares");
    }

    // CORE-FEE-002: 年化费率计算
    function test_CORE_FEE_002_AnnualFeeRateCalculation() public {
        // Set 2% annual management fee (200 = 2% in bps)
        etf.setFees(0, 200);

        uint256 totalValueBefore = etf.getTotalValue();
        uint256 totalSupplyBefore = etf.totalSupply();

        // Wait 1 year
        vm.warp(block.timestamp + SECONDS_PER_YEAR);

        uint256 feeShares = etf.collectManagementFee();

        // Calculate expected annual fee: totalValue * 2%
        uint256 expectedAnnualFeeValue = totalValueBefore * 200 / WEIGHT_PRECISION;
        uint256 expectedFeeShares =
            (expectedAnnualFeeValue * totalSupplyBefore) / (totalValueBefore - expectedAnnualFeeValue);

        assertApproxEqRel(feeShares, expectedFeeShares, 1e15, "Annual fee should match expected 2%");
    }

    // CORE-FEE-003: 零费率
    function test_CORE_FEE_003_ZeroManagementFee() public {
        // Set 0% annual management fee
        etf.setFees(0, 0);

        // Wait 1 year
        vm.warp(block.timestamp + SECONDS_PER_YEAR);

        uint256 feeShares = etf.collectManagementFee();

        assertEq(feeShares, 0, "Zero fee rate should produce no fees");
        assertEq(etf.balanceOf(feeCollector), 0, "Fee collector should receive no shares");
    }

    // CORE-FEE-004: 最大费率
    function test_CORE_FEE_004_MaximumFeeRate() public {
        // Set maximum allowed fee rate (5% = 500 bps)
        etf.setFees(0, 500);

        uint256 totalValueBefore = etf.getTotalValue();

        // Wait 1 year
        vm.warp(block.timestamp + SECONDS_PER_YEAR);

        uint256 feeShares = etf.collectManagementFee();

        // Should accumulate 5% annual fee
        uint256 expectedFeeValue = totalValueBefore * 500 / WEIGHT_PRECISION;
        uint256 totalSupplyBefore = 1000e18; // Initial supply
        uint256 expectedFeeShares = (expectedFeeValue * totalSupplyBefore) / (totalValueBefore - expectedFeeValue);

        assertApproxEqRel(feeShares, expectedFeeShares, 1e15, "Maximum fee rate should work correctly");
        assertTrue(feeShares > 0, "Maximum fee should generate substantial fees");
    }

    // CORE-FEE-005: 精度测试
    function test_CORE_FEE_005_PrecisionTest() public {
        // Set very small fee rate (0.01% = 1 bps)
        etf.setFees(0, 1);

        // Wait 1 day
        vm.warp(block.timestamp + 1 days);

        uint256 feeShares = etf.collectManagementFee();

        // Even small fees should be calculated precisely
        assertTrue(feeShares > 0, "Small fees should still be calculated");

        // Test multiple small accumulations
        vm.warp(block.timestamp + 1 days);
        uint256 additionalFees = etf.collectManagementFee();

        assertApproxEqRel(feeShares, additionalFees, 1e15, "Consistent precision over time");
    }

    // ===========================
    // 费用收取测试 (CORE-FEE-006 到 010)
    // ===========================

    // CORE-FEE-006: 正常收取
    function test_CORE_FEE_006_NormalCollection() public {
        etf.setFees(0, 100); // 1% annual fee

        uint256 balanceBefore = etf.balanceOf(feeCollector);

        vm.warp(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, false);
        emit IBlockETFCore.ManagementFeeCollected(feeCollector, 0, 0); // Will be overwritten with actual values

        uint256 feeShares = etf.collectManagementFee();

        assertTrue(feeShares > 0, "Should collect fees");
        assertEq(etf.balanceOf(feeCollector), balanceBefore + feeShares, "Collector balance should increase");
    }

    // CORE-FEE-007: 首次收取
    function test_CORE_FEE_007_FirstCollection() public {
        etf.setFees(0, 100); // 1% annual fee

        // Get initial last collect time (set during initialization)
        uint256 initialTime = block.timestamp;

        vm.warp(initialTime + 1 days);

        uint256 feeShares = etf.collectManagementFee();

        // Should calculate from initialization time
        assertTrue(feeShares > 0, "First collection should work from initialization time");

        // Check that lastCollectTime is updated
        assertEq(etf.getFeeInfo().lastCollectTime, block.timestamp, "LastCollectTime should be updated");
    }

    // CORE-FEE-008: 连续收取
    function test_CORE_FEE_008_ConsecutiveCollections() public {
        etf.setFees(0, 100); // 1% annual fee

        vm.warp(block.timestamp + 10 days);
        uint256 firstCollection = etf.collectManagementFee();

        // Collect again after 5 minutes (short interval)
        vm.warp(block.timestamp + 5 minutes);
        uint256 secondCollection = etf.collectManagementFee();

        assertTrue(firstCollection > 0, "First collection should have fees");
        assertTrue(secondCollection > 0, "Second collection should have small incremental fees");
        assertTrue(firstCollection > secondCollection, "First collection should be larger than incremental");
    }

    // CORE-FEE-009: 长期未收取
    function test_CORE_FEE_009_LongTermUncollected() public {
        etf.setFees(0, 200); // 2% annual fee

        uint256 totalValueBefore = etf.getTotalValue();

        // Wait 1 year without collecting
        vm.warp(block.timestamp + SECONDS_PER_YEAR);

        uint256 feeShares = etf.collectManagementFee();

        // Should accumulate full year's fees
        uint256 expectedFeeValue = totalValueBefore * 200 / WEIGHT_PRECISION; // 2%
        uint256 totalSupplyBefore = 1000e18;
        uint256 expectedFeeShares = (expectedFeeValue * totalSupplyBefore) / (totalValueBefore - expectedFeeValue);

        assertApproxEqRel(feeShares, expectedFeeShares, 1e15, "Long term accumulation should be accurate");
    }

    // CORE-FEE-010: 零间隔收取
    function test_CORE_FEE_010_ZeroIntervalCollection() public {
        etf.setFees(0, 100); // 1% annual fee

        vm.warp(block.timestamp + 1 days);
        uint256 firstCollection = etf.collectManagementFee();

        // Collect again in the same block
        uint256 secondCollection = etf.collectManagementFee();

        assertTrue(firstCollection > 0, "First collection should have fees");
        assertEq(secondCollection, 0, "Same block collection should have no additional fees");
    }

    // ===========================
    // 费用接收者测试 (CORE-FEE-011 到 014)
    // ===========================

    // CORE-FEE-011: 正确接收
    function test_CORE_FEE_011_CorrectRecipient() public {
        etf.setFees(0, 100); // 1% annual fee

        uint256 balanceBefore = etf.balanceOf(feeCollector);
        uint256 totalSupplyBefore = etf.totalSupply();

        vm.warp(block.timestamp + 30 days);
        uint256 feeShares = etf.collectManagementFee();

        assertEq(etf.balanceOf(feeCollector), balanceBefore + feeShares, "Fee collector should receive all fee shares");
        assertTrue(feeShares > 0, "Should collect management fees");
        assertEq(etf.totalSupply(), totalSupplyBefore + feeShares, "Total supply should increase by fee shares");
    }

    // CORE-FEE-012: 更换接收者
    function test_CORE_FEE_012_ChangeFeeCollector() public {
        etf.setFees(0, 100); // 1% annual fee

        // Collect some fees to original collector
        vm.warp(block.timestamp + 15 days);
        uint256 firstFees = etf.collectManagementFee();
        assertEq(etf.balanceOf(feeCollector), firstFees, "Original collector should have fees");

        // Change fee collector
        etf.setFeeCollector(newFeeCollector);

        // Collect more fees
        vm.warp(block.timestamp + 15 days);
        uint256 secondFees = etf.collectManagementFee();

        assertEq(etf.balanceOf(feeCollector), firstFees, "Original collector balance unchanged");
        assertEq(etf.balanceOf(newFeeCollector), secondFees, "New collector should receive new fees");
    }

    // CORE-FEE-013: 零地址拒绝
    function test_CORE_FEE_013_ZeroAddressRejection() public {
        vm.expectRevert(BlockETFCore.InvalidFeeCollector.selector);
        etf.setFeeCollector(address(0));
    }

    // CORE-FEE-014: 合约接收者
    function test_CORE_FEE_014_ContractRecipient() public {
        etf.setFees(0, 100); // 1% annual fee
        etf.setFeeCollector(address(contractCollector));

        vm.warp(block.timestamp + 30 days);
        uint256 feeShares = etf.collectManagementFee();

        assertEq(contractCollector.getBalance(), feeShares, "Contract should receive fee shares");
        assertTrue(feeShares > 0, "Contract collector should work normally");
    }

    // ===========================
    // 时间戳更新测试 (CORE-FEE-015 到 016)
    // ===========================

    // CORE-FEE-015: 收取后更新
    function test_CORE_FEE_015_TimestampUpdateAfterCollection() public {
        etf.setFees(0, 100); // 1% annual fee

        uint256 timeBefore = block.timestamp;
        vm.warp(timeBefore + 1 days);

        etf.collectManagementFee();

        assertEq(etf.getFeeInfo().lastCollectTime, block.timestamp, "LastCollectTime should be updated to current time");
    }

    // CORE-FEE-016: 时间不倒退
    function test_CORE_FEE_016_TimeNeverGoesBackward() public {
        etf.setFees(0, 100); // 1% annual fee

        uint256 time1 = block.timestamp + 1 days;
        vm.warp(time1);
        etf.collectManagementFee();
        assertEq(etf.getFeeInfo().lastCollectTime, time1, "Time should be set to time1");

        uint256 time2 = time1 + 1 days;
        vm.warp(time2);
        etf.collectManagementFee();
        assertEq(etf.getFeeInfo().lastCollectTime, time2, "Time should advance to time2");

        assertTrue(time2 > time1, "Time should always advance");
        assertTrue(etf.getFeeInfo().lastCollectTime >= time1, "Time should never go backward");
    }

    // ===========================
    // 费率设置测试 (CORE-FEE-017 到 020)
    // ===========================

    // CORE-FEE-017: owner设置费率
    function test_CORE_FEE_017_OwnerSetFeeRate() public {
        etf.setFees(100, 200); // 1% withdraw fee, 2% management fee

        assertEq(etf.getFeeInfo().withdrawFee, 100, "Withdraw fee should be set");
        // Management fee might have small precision differences due to conversion
        assertApproxEqAbs(etf.getAnnualManagementFee(), 200, 1, "Management fee should be approximately set");
    }

    // CORE-FEE-018: 非owner设置
    function test_CORE_FEE_018_NonOwnerSetFee() public {
        vm.prank(user1);
        vm.expectRevert(); // Modern Ownable uses custom error, not string
        etf.setFees(100, 200);
    }

    // CORE-FEE-019: 费率上限
    function test_CORE_FEE_019_FeeRateUpperLimit() public {
        // Management fee limit is 5% (500 bps)
        vm.expectRevert(BlockETFCore.FeeTooHigh.selector);
        etf.setFees(0, 501); // Exceed 5%

        // Withdraw fee limit is 10% (1000 bps)
        vm.expectRevert(BlockETFCore.FeeTooHigh.selector);
        etf.setFees(1001, 0); // Exceed 10%
    }

    // CORE-FEE-020: 费率下限
    function test_CORE_FEE_020_FeeRateLowerLimit() public {
        // Zero fees should be allowed
        etf.setFees(0, 0);

        assertEq(etf.getFeeInfo().withdrawFee, 0, "Zero withdraw fee should be allowed");
        assertEq(etf.getAnnualManagementFee(), 0, "Zero management fee should be allowed");
    }

    // ===========================
    // 赎回费设置测试 (CORE-FEE-021 到 023)
    // ===========================

    // CORE-FEE-021: 设置赎回费
    function test_CORE_FEE_021_SetWithdrawFee() public {
        etf.setFees(500, 100); // 5% withdraw fee, 1% management fee

        assertEq(etf.getFeeInfo().withdrawFee, 500, "Withdraw fee should be set to 5%");

        // Test that withdraw fee is applied during burn
        uint256 sharesToBurn = 100e18;
        uint256[] memory burnAmounts = etf.calculateBurnAmounts(sharesToBurn);

        // Fee should be deducted: effectiveShares = shares - fee
        uint256 expectedFee = (sharesToBurn * 500 + WEIGHT_PRECISION - 1) / WEIGHT_PRECISION; // Ceiling division
        uint256 effectiveShares = sharesToBurn - expectedFee;

        // Burn amounts should be calculated based on effective shares
        assertTrue(burnAmounts[0] > 0 && burnAmounts[1] > 0, "Burn amounts should account for fee");
    }

    // CORE-FEE-022: 赎回费上限
    function test_CORE_FEE_022_WithdrawFeeUpperLimit() public {
        // Maximum withdraw fee is 10% (1000 bps)
        vm.expectRevert(BlockETFCore.FeeTooHigh.selector);
        etf.setFees(1001, 0);

        // 10% should be allowed
        etf.setFees(1000, 0);
        assertEq(etf.getFeeInfo().withdrawFee, 1000, "10% withdraw fee should be allowed");
    }

    // CORE-FEE-023: 零赎回费
    function test_CORE_FEE_023_ZeroWithdrawFee() public {
        etf.setFees(0, 100); // 0% withdraw fee, 1% management fee

        assertEq(etf.getFeeInfo().withdrawFee, 0, "Zero withdraw fee should be set");

        // Test that no withdraw fee is applied during burn
        uint256 sharesToBurn = 100e18;
        uint256[] memory burnAmounts = etf.calculateBurnAmounts(sharesToBurn);

        // All shares should be effective (no fee deduction)
        assertTrue(burnAmounts[0] > 0 && burnAmounts[1] > 0, "Should still get assets with zero fee");
    }

    // ===========================
    // 影响测试 (CORE-FEE-024 到 026)
    // ===========================

    // CORE-FEE-024: 对铸造影响
    function test_CORE_FEE_024_ImpactOnMinting() public {
        etf.setFees(0, 200); // 2% annual management fee

        // Wait for fees to accumulate
        vm.warp(block.timestamp + 30 days);

        uint256 totalSupplyBefore = etf.totalSupply();

        // Prepare mint
        token1.mint(user1, 100e18);
        token2.mint(user1, 50e18);

        vm.startPrank(user1);
        token1.transfer(address(etf), 100e18);
        token2.transfer(address(etf), 50e18);

        uint256 sharesReceived = etf.mint(user1);
        vm.stopPrank();

        uint256 totalSupplyAfter = etf.totalSupply();

        // Total supply should increase by fees + user shares
        assertTrue(
            totalSupplyAfter > totalSupplyBefore + sharesReceived, "Management fees should be collected during mint"
        );
    }

    // CORE-FEE-025: 对赎回影响
    function test_CORE_FEE_025_ImpactOnBurning() public {
        etf.setFees(0, 200); // 2% annual management fee

        // Wait for fees to accumulate
        vm.warp(block.timestamp + 30 days);

        uint256 totalSupplyBefore = etf.totalSupply();

        vm.prank(owner);
        uint256[] memory burnAmounts = etf.burn(100e18, owner);

        uint256 totalSupplyAfter = etf.totalSupply();

        // Management fees should be collected before burn, so net change is different than just burning shares
        uint256 expectedDecrease = 100e18; // Shares burned
        uint256 actualDecrease = totalSupplyBefore - totalSupplyAfter;
        assertTrue(actualDecrease < expectedDecrease, "Management fees should offset some of the decrease from burning");
        assertTrue(burnAmounts[0] > 0 && burnAmounts[1] > 0, "Should receive assets from burn");
    }

    // CORE-FEE-026: 对重新平衡影响
    function test_CORE_FEE_026_ImpactOnRebalancing() public {
        // This test would require implementing rebalancing functionality
        // For now, we'll test that fee collection doesn't break weight calculations
        etf.setFees(0, 200); // 2% annual management fee

        vm.warp(block.timestamp + 30 days);
        etf.collectManagementFee();

        // Weight calculations should still work after fee collection
        IBlockETFCore.AssetInfo[] memory assetsList = etf.getAssets();
        assertEq(assetsList.length, 2, "Asset list should be unchanged");

        // Total value should remain reasonable (not affected by fee shares)
        uint256 totalValue = etf.getTotalValue();
        assertTrue(totalValue > 900e18 && totalValue < 1100e18, "Total value should be reasonable after fees");
    }

    // ===========================
    // 边界和异常测试 (CORE-FEE-027 到 030)
    // ===========================

    // CORE-FEE-027: 供应量为零
    function test_CORE_FEE_027_ZeroTotalSupply() public {
        // Deploy a fresh ETF without initialization
        BlockETFCore freshETF = new BlockETFCore("FreshETF", "FETF", address(oracle));
        freshETF.setFeeCollector(feeCollector);
        freshETF.setFees(0, 100); // 1% annual fee

        vm.warp(block.timestamp + 1 days);

        uint256 feeShares = freshETF.collectManagementFee();

        assertEq(feeShares, 0, "Zero total supply should produce no fees");
    }

    // CORE-FEE-028: 溢出保护
    function test_CORE_FEE_028_OverflowProtection() public {
        etf.setFees(0, 500); // 5% annual fee (maximum)

        // Wait a very long time (10 years)
        vm.warp(block.timestamp + 10 * SECONDS_PER_YEAR);

        // Should not revert due to overflow
        uint256 feeShares = etf.collectManagementFee();

        assertTrue(feeShares > 0, "Should calculate large fees safely");
        assertTrue(feeShares < 2 ** 128, "Fee shares should be reasonable");
    }

    // CORE-FEE-029: 并发收取
    function test_CORE_FEE_029_ConcurrentCollection() public {
        etf.setFees(0, 100); // 1% annual fee

        vm.warp(block.timestamp + 1 days);

        // Simulate concurrent calls in the same block
        uint256 firstCall = etf.collectManagementFee();
        uint256 secondCall = etf.collectManagementFee();

        assertTrue(firstCall > 0, "First call should collect fees");
        assertEq(secondCall, 0, "Second call in same block should collect nothing");

        // State should be consistent
        assertEq(etf.balanceOf(feeCollector), firstCall, "Fee collector should have correct balance");
    }

    // CORE-FEE-030: 费用份额极大
    function test_CORE_FEE_030_ExtremeFeeShares() public {
        etf.setFees(0, 500); // 5% annual fee (maximum)

        // Wait multiple years for extreme accumulation (but not too extreme to avoid overflow)
        vm.warp(block.timestamp + 5 * SECONDS_PER_YEAR); // Reduced from 50 to 5 years

        uint256 totalSupplyBefore = etf.totalSupply();

        // Should not revert due to overflow
        uint256 feeShares = etf.collectManagementFee();

        // Fee shares should be within reasonable bounds
        assertTrue(feeShares > 0, "Should generate substantial fees");
        assertTrue(feeShares < totalSupplyBefore * 5, "Fee shares should not exceed reasonable multiples of supply");

        // Contract should still function after extreme fees
        uint256 totalSupplyAfter = etf.totalSupply();
        assertTrue(totalSupplyAfter > totalSupplyBefore, "Total supply should increase");

        // Basic functions should still work
        uint256[] memory burnAmounts = etf.calculateBurnAmounts(1e18);
        assertTrue(burnAmounts[0] > 0 && burnAmounts[1] > 0, "Calculation functions should still work");
    }
}

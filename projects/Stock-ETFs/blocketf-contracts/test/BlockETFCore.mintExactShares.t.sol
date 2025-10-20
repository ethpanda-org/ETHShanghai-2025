// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

contract BlockETFCoreMintExactSharesTest is Test {
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

        uint256 targetValue = 1000e18;

        // Mint tokens and approve for initialization
        token1.mint(owner, 500e18);
        token2.mint(owner, 250e18); // $500 worth at $2 per token
        token1.approve(address(etf), 500e18);
        token2.approve(address(etf), 250e18);

        etf.initialize(assets, weights, targetValue);

        // Setup fee collector
        etf.setFeeCollector(feeCollector);
    }

    // ===========================
    // 基础功能测试
    // ===========================

    // CORE-MEXACT-001: 正常精确铸造
    function test_CORE_MEXACT_001_NormalExactMint() public {
        uint256 sharesToMint = 100e18;

        // Calculate required amounts
        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        // Mint tokens to user1
        token1.mint(user1, requiredToken1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        // Record initial state
        uint256 initialShares = etf.balanceOf(user1);
        uint256 initialTotalSupply = etf.totalSupply();

        // Mint exact shares
        uint256[] memory amounts = etf.mintExactShares(sharesToMint, user1);

        // Verify shares
        assertEq(etf.balanceOf(user1), initialShares + sharesToMint, "Should mint exact shares");
        assertEq(etf.totalSupply(), initialTotalSupply + sharesToMint, "Total supply should increase");

        // Verify amounts
        assertEq(amounts[0], requiredToken1, "Token1 amount should match");
        assertEq(amounts[1], requiredToken2, "Token2 amount should match");

        vm.stopPrank();
    }

    // CORE-MEXACT-002: 计算所需资产
    function test_CORE_MEXACT_002_CalculateRequiredAssets() public {
        uint256 sharesToMint = 200e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 expectedToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 expectedToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, expectedToken1);
        token2.mint(user1, expectedToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), expectedToken1);
        token2.approve(address(etf), expectedToken2);

        uint256[] memory amounts = etf.mintExactShares(sharesToMint, user1);

        assertEq(amounts[0], expectedToken1, "Calculated token1 amount should be correct");
        assertEq(amounts[1], expectedToken2, "Calculated token2 amount should be correct");

        vm.stopPrank();
    }

    // CORE-MEXACT-003: 转账和铸造
    function test_CORE_MEXACT_003_TransferAndMint() public {
        uint256 sharesToMint = 50e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, requiredToken1 * 2); // Extra balance
        token2.mint(user1, requiredToken2 * 2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        uint256 user1Token1Before = token1.balanceOf(user1);
        uint256 user1Token2Before = token2.balanceOf(user1);
        uint256 etfToken1Before = token1.balanceOf(address(etf));
        uint256 etfToken2Before = token2.balanceOf(address(etf));

        etf.mintExactShares(sharesToMint, user1);

        // Verify transfers
        assertEq(token1.balanceOf(user1), user1Token1Before - requiredToken1, "User token1 balance should decrease");
        assertEq(token2.balanceOf(user1), user1Token2Before - requiredToken2, "User token2 balance should decrease");
        assertEq(token1.balanceOf(address(etf)), etfToken1Before + requiredToken1, "ETF token1 balance should increase");
        assertEq(token2.balanceOf(address(etf)), etfToken2Before + requiredToken2, "ETF token2 balance should increase");

        vm.stopPrank();
    }

    // ===========================
    // 参数验证测试
    // ===========================

    // CORE-MEXACT-004: 零份额
    function test_CORE_MEXACT_004_ZeroShares() public {
        vm.expectRevert(BlockETFCore.InvalidShares.selector);
        etf.mintExactShares(0, user1);
    }

    // CORE-MEXACT-005: 零地址接收
    function test_CORE_MEXACT_005_ZeroAddressRecipient() public {
        vm.expectRevert(BlockETFCore.InvalidRecipient.selector);
        etf.mintExactShares(100e18, address(0));
    }

    // CORE-MEXACT-006: 微量份额铸造
    function test_CORE_MEXACT_006_SmallSharesMint() public {
        uint256 sharesToMint = 1; // 1 wei

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        // For 1 wei share, amounts will be 0, should revert
        if (requiredToken1 == 0 || requiredToken2 == 0) {
            vm.expectRevert(BlockETFCore.ZeroAmount.selector);
            etf.mintExactShares(sharesToMint, user1);
        }
    }

    // ===========================
    // 资产计算测试
    // ===========================

    // CORE-MEXACT-007: 计算结果为零
    function test_CORE_MEXACT_007_ZeroAmountCalculation() public {
        // Try to mint extremely small shares that would result in zero amounts
        uint256 tinyShares = 1; // 1 wei

        vm.expectRevert(BlockETFCore.ZeroAmount.selector);
        etf.mintExactShares(tinyShares, user1);
    }

    // CORE-MEXACT-008: 精度损失
    function test_CORE_MEXACT_008_PrecisionLoss() public {
        uint256 sharesToMint = 333333333333333333; // Not evenly divisible

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, requiredToken1 + 1); // Add 1 wei for potential rounding
        token2.mint(user1, requiredToken2 + 1);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1 + 1);
        token2.approve(address(etf), requiredToken2 + 1);

        uint256[] memory amounts = etf.mintExactShares(sharesToMint, user1);

        // Check that amounts are within acceptable precision
        assertApproxEqRel(amounts[0], requiredToken1, 1e12, "Token1 amount precision");
        assertApproxEqRel(amounts[1], requiredToken2, 1e12, "Token2 amount precision");

        vm.stopPrank();
    }

    // CORE-MEXACT-009: 大额计算
    function test_CORE_MEXACT_009_LargeAmountCalculation() public {
        uint256 largeShares = 1000000e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * largeShares) / totalSupply;
        uint256 requiredToken2 = (250e18 * largeShares) / totalSupply;

        token1.mint(user1, requiredToken1 + 1000); // Add some buffer for potential rounding
        token2.mint(user1, requiredToken2 + 1000);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1 + 1000);
        token2.approve(address(etf), requiredToken2 + 1000);

        uint256[] memory amounts = etf.mintExactShares(largeShares, user1);

        assertEq(amounts[0], requiredToken1, "Large token1 calculation");
        assertEq(amounts[1], requiredToken2, "Large token2 calculation");
        assertApproxEqRel(etf.balanceOf(user1), largeShares, 1e12, "Large shares minted approximately");

        vm.stopPrank();
    }

    // ===========================
    // 转账验证测试
    // ===========================

    // CORE-MEXACT-010: 余额不足
    function test_CORE_MEXACT_010_InsufficientBalance() public {
        uint256 sharesToMint = 100e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        // Mint insufficient tokens
        token1.mint(user1, requiredToken1 - 1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        vm.expectRevert();
        etf.mintExactShares(sharesToMint, user1);

        vm.stopPrank();
    }

    // CORE-MEXACT-011: 授权不足
    function test_CORE_MEXACT_011_InsufficientAllowance() public {
        uint256 sharesToMint = 100e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, requiredToken1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1 - 1); // Insufficient approval
        token2.approve(address(etf), requiredToken2);

        vm.expectRevert();
        etf.mintExactShares(sharesToMint, user1);

        vm.stopPrank();
    }

    // ===========================
    // 状态更新测试
    // ===========================

    // CORE-MEXACT-014: 储备更新
    function test_CORE_MEXACT_014_ReserveUpdate() public {
        uint256 sharesToMint = 150e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, requiredToken1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        (,, uint224 reserve1Before) = etf.assetInfo(address(token1));
        (,, uint224 reserve2Before) = etf.assetInfo(address(token2));

        etf.mintExactShares(sharesToMint, user1);

        (,, uint224 reserve1After) = etf.assetInfo(address(token1));
        (,, uint224 reserve2After) = etf.assetInfo(address(token2));

        assertEq(reserve1After, reserve1Before + requiredToken1, "Reserve1 should increase");
        assertEq(reserve2After, reserve2Before + requiredToken2, "Reserve2 should increase");

        vm.stopPrank();
    }

    // CORE-MEXACT-015: 总供应量
    function test_CORE_MEXACT_015_TotalSupplyUpdate() public {
        uint256 sharesToMint = 75e18;

        uint256 totalSupplyBefore = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupplyBefore;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupplyBefore;

        token1.mint(user1, requiredToken1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        etf.mintExactShares(sharesToMint, user1);

        assertEq(etf.totalSupply(), totalSupplyBefore + sharesToMint, "Total supply should increase by exact shares");

        vm.stopPrank();
    }

    // CORE-MEXACT-016: 用户余额
    function test_CORE_MEXACT_016_UserBalanceUpdate() public {
        uint256 sharesToMint = 125e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user2, requiredToken1);
        token2.mint(user2, requiredToken2);

        vm.startPrank(user2);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        uint256 balanceBefore = etf.balanceOf(user2);

        etf.mintExactShares(sharesToMint, user2);

        assertEq(etf.balanceOf(user2), balanceBefore + sharesToMint, "User should receive exact shares");

        vm.stopPrank();
    }

    // ===========================
    // 费用处理测试
    // ===========================

    // CORE-MEXACT-017: 管理费收取
    function test_CORE_MEXACT_017_ManagementFeeCollection() public {
        // Set management fee
        etf.setFees(0, 100); // 1% annual management fee

        // Warp time to accumulate fees
        vm.warp(block.timestamp + 365 days);

        uint256 sharesToMint = 100e18;
        uint256 totalSupplyBefore = etf.totalSupply();
        uint256 feeCollectorBalanceBefore = etf.balanceOf(feeCollector);

        // Calculate required amounts after fee collection
        // This will trigger fee collection
        vm.startPrank(user1);

        // Mint extra tokens to account for potential fee impact
        token1.mint(user1, 1000e18);
        token2.mint(user1, 500e18);
        token1.approve(address(etf), 1000e18);
        token2.approve(address(etf), 500e18);

        etf.mintExactShares(sharesToMint, user1);

        // Check fee was collected
        assertGt(etf.balanceOf(feeCollector), feeCollectorBalanceBefore, "Fee collector should receive fees");

        vm.stopPrank();
    }

    // CORE-MEXACT-018: 费用后计算
    function test_CORE_MEXACT_018_CalculationAfterFees() public {
        // Set management fee
        etf.setFees(0, 200); // 2% annual management fee

        // Warp time to accumulate fees
        vm.warp(block.timestamp + 182.5 days); // Half year

        uint256 sharesToMint = 50e18;

        // Mint extra tokens
        token1.mint(user1, 1000e18);
        token2.mint(user1, 500e18);

        vm.startPrank(user1);
        token1.approve(address(etf), 1000e18);
        token2.approve(address(etf), 500e18);

        // Get total supply after fee collection (happens in mintExactShares)
        uint256[] memory amounts = etf.mintExactShares(sharesToMint, user1);

        // Verify shares were minted correctly (allow for small rounding)
        assertApproxEqRel(etf.balanceOf(user1), sharesToMint, 1e12, "Should mint approximately exact shares after fees");

        vm.stopPrank();
    }

    // ===========================
    // 边界和异常测试
    // ===========================

    // CORE-MEXACT-019: 总供应为零
    function test_CORE_MEXACT_019_ZeroTotalSupply() public {
        // Deploy new ETF without initialization
        BlockETFCore newEtf = new BlockETFCore("NewETF", "NETF", address(oracle));

        // Try to mint before initialization (totalSupply = 0)
        vm.expectRevert(BlockETFCore.NotInitialized.selector);
        newEtf.mintExactShares(100e18, user1);
    }

    // CORE-MEXACT-020: 接近最大供应
    function test_CORE_MEXACT_020_NearMaxSupply() public {
        // This test would require massive amounts, simplified for practical testing
        uint256 largeShares = type(uint128).max;

        // Calculate required tokens (will be very large)
        uint256 totalSupply = etf.totalSupply();

        // Should revert due to overflow or insufficient funds
        vm.expectRevert();
        etf.mintExactShares(largeShares, user1);
    }

    // CORE-MEXACT-021: 并发铸造
    function test_CORE_MEXACT_021_ConcurrentMinting() public {
        uint256 shares1 = 50e18;
        uint256 shares2 = 75e18;

        uint256 totalSupply = etf.totalSupply();
        uint256 required1Token1 = (500e18 * shares1) / totalSupply;
        uint256 required1Token2 = (250e18 * shares1) / totalSupply;

        // Setup user1
        token1.mint(user1, required1Token1);
        token2.mint(user1, required1Token2);

        // User1 mints
        vm.startPrank(user1);
        token1.approve(address(etf), required1Token1);
        token2.approve(address(etf), required1Token2);
        etf.mintExactShares(shares1, user1);
        vm.stopPrank();

        // User2 needs to calculate based on new totalSupply after user1's mint
        uint256 newTotalSupply = etf.totalSupply();
        (,, uint224 reserve1) = etf.assetInfo(address(token1));
        (,, uint224 reserve2) = etf.assetInfo(address(token2));

        uint256 required2Token1 = (uint256(reserve1) * shares2) / newTotalSupply;
        uint256 required2Token2 = (uint256(reserve2) * shares2) / newTotalSupply;

        // Setup user2 with correct amounts
        token1.mint(user2, required2Token1);
        token2.mint(user2, required2Token2);

        vm.startPrank(user2);
        token1.approve(address(etf), required2Token1);
        token2.approve(address(etf), required2Token2);
        etf.mintExactShares(shares2, user2);
        vm.stopPrank();

        assertApproxEqRel(etf.balanceOf(user1), shares1, 1e12, "User1 should have approximately correct shares");
        assertApproxEqRel(etf.balanceOf(user2), shares2, 1e12, "User2 should have approximately correct shares");
    }

    // ===========================
    // 集成测试
    // ===========================

    // CORE-MEXACT-022: 与mint()对比
    function test_CORE_MEXACT_022_CompareWithMint() public {
        // Setup two identical users
        uint256 amount1 = 100e18;
        uint256 amount2 = 50e18;

        // User1 uses mint()
        token1.mint(user1, amount1);
        token2.mint(user1, amount2);

        vm.startPrank(user1);
        token1.transfer(address(etf), amount1);
        token2.transfer(address(etf), amount2);
        uint256 sharesFromMint = etf.mint(user1);
        vm.stopPrank();

        // Calculate how much user2 needs for same shares via mintExactShares
        uint256 totalSupply = etf.totalSupply() - sharesFromMint;
        uint256 requiredToken1 = (550e18 * sharesFromMint) / totalSupply;
        uint256 requiredToken2 = (275e18 * sharesFromMint) / totalSupply;

        token1.mint(user2, requiredToken1);
        token2.mint(user2, requiredToken2);

        vm.startPrank(user2);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);
        etf.mintExactShares(sharesFromMint, user2);
        vm.stopPrank();

        assertApproxEqRel(
            etf.balanceOf(user1), etf.balanceOf(user2), 1e12, "Both users should have approximately same shares"
        );
    }

    // CORE-MEXACT-023: 连续铸造
    function test_CORE_MEXACT_023_SequentialMinting() public {
        uint256[] memory sharesToMint = new uint256[](3);
        sharesToMint[0] = 25e18;
        sharesToMint[1] = 50e18;
        sharesToMint[2] = 75e18;

        uint256 totalMinted = 0;

        for (uint256 i = 0; i < sharesToMint.length; i++) {
            uint256 shares = sharesToMint[i];
            uint256 totalSupply = etf.totalSupply();

            (,, uint224 reserve1) = etf.assetInfo(address(token1));
            (,, uint224 reserve2) = etf.assetInfo(address(token2));

            uint256 requiredToken1 = (uint256(reserve1) * shares) / totalSupply;
            uint256 requiredToken2 = (uint256(reserve2) * shares) / totalSupply;

            token1.mint(user1, requiredToken1);
            token2.mint(user1, requiredToken2);

            vm.startPrank(user1);
            token1.approve(address(etf), requiredToken1);
            token2.approve(address(etf), requiredToken2);

            uint256[] memory amounts = etf.mintExactShares(shares, user1);

            assertEq(amounts[0], requiredToken1, "Token1 amount should match in iteration");
            assertEq(amounts[1], requiredToken2, "Token2 amount should match in iteration");

            totalMinted += shares;

            vm.stopPrank();
        }

        assertApproxEqRel(etf.balanceOf(user1), totalMinted, 1e12, "Total minted shares should approximately match");
    }

    // ===========================
    // 额外的边界测试
    // ===========================

    // 测试暂停状态下的mintExactShares
    function test_CORE_MEXACT_PausedState() public {
        etf.pause();

        vm.expectRevert();
        etf.mintExactShares(100e18, user1);
    }

    // 测试恢复后的mintExactShares
    function test_CORE_MEXACT_AfterUnpause() public {
        etf.pause();
        etf.unpause();

        uint256 sharesToMint = 50e18;
        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, requiredToken1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        uint256[] memory amounts = etf.mintExactShares(sharesToMint, user1);

        assertApproxEqRel(etf.balanceOf(user1), sharesToMint, 1e12, "Should mint approximately after unpause");

        vm.stopPrank();
    }

    // 测试事件发射
    function test_CORE_MEXACT_EventEmission() public {
        uint256 sharesToMint = 100e18;
        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, requiredToken1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        // Expect Mint event
        uint256[] memory expectedAmounts = new uint256[](2);
        expectedAmounts[0] = requiredToken1;
        expectedAmounts[1] = requiredToken2;

        vm.expectEmit(true, true, true, true);
        emit IBlockETFCore.Mint(user1, sharesToMint, expectedAmounts);

        etf.mintExactShares(sharesToMint, user1);

        vm.stopPrank();
    }

    // 测试自己作为接收者
    function test_CORE_MEXACT_SelfAsRecipient() public {
        uint256 sharesToMint = 30e18;
        uint256 totalSupply = etf.totalSupply();
        uint256 requiredToken1 = (500e18 * sharesToMint) / totalSupply;
        uint256 requiredToken2 = (250e18 * sharesToMint) / totalSupply;

        token1.mint(user1, requiredToken1);
        token2.mint(user1, requiredToken2);

        vm.startPrank(user1);
        token1.approve(address(etf), requiredToken1);
        token2.approve(address(etf), requiredToken2);

        uint256 balanceBefore = etf.balanceOf(user1);
        etf.mintExactShares(sharesToMint, user1); // msg.sender as recipient

        assertEq(etf.balanceOf(user1), balanceBefore + sharesToMint, "Should mint to self");

        vm.stopPrank();
    }
}

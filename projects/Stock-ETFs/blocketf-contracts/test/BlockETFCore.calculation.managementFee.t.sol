// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BlockETFCore.sol";
import "../src/interfaces/IBlockETFCore.sol";
import "../src/mocks/MockPriceOracle.sol";
import "../src/mocks/MockERC20.sol";

contract BlockETFCoreCalculationManagementFeeTest is Test {
    BlockETFCore public etf;
    MockPriceOracle public oracle;

    MockERC20 public token1;
    MockERC20 public token2;

    address public owner;
    address public user1;
    address public feeCollector;

    uint32 constant WEIGHT_PRECISION = 10000;

    function setUp() public {
        owner = address(this);
        user1 = address(0x1);
        feeCollector = address(0x3);

        oracle = new MockPriceOracle();

        token1 = new MockERC20("Token1", "TK1", 18);
        token2 = new MockERC20("Token2", "TK2", 18);

        oracle.setPrice(address(token1), 1e18); // $1
        oracle.setPrice(address(token2), 2e18); // $2

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
        token2.mint(owner, 250e18);
        token1.approve(address(etf), 500e18);
        token2.approve(address(etf), 250e18);

        // Initialize with target value of $1000 (500*$1 + 250*$2)
        etf.initialize(assets, weights, 1000e18);

        // Setup fee collector
        etf.setFeeCollector(feeCollector);

        // Set 2% annual management fee (200 = 2% in bps)
        etf.setFees(0, 200);
    }

    // ===========================
    // Zero Management Fee Perfect Match Test
    // ===========================

    function test_ZeroManagementFee_Perfect_Match() public {
        // Set management fee to zero
        etf.setFees(0, 0);

        // Test calculateMintShares vs mint
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        uint256 predictedShares = etf.calculateMintShares(amounts);

        token1.mint(user1, amounts[0]);
        token2.mint(user1, amounts[1]);

        vm.startPrank(user1);
        token1.transfer(address(etf), amounts[0]);
        token2.transfer(address(etf), amounts[1]);
        uint256 actualShares = etf.mint(user1);
        vm.stopPrank();

        assertEq(predictedShares, actualShares, "Should match exactly with zero management fee");

        // Test calculateRequiredAmounts vs mintExactShares
        uint256[] memory predictedRequired = etf.calculateRequiredAmounts(100e18);

        token1.mint(user1, predictedRequired[0]);
        token2.mint(user1, predictedRequired[1]);

        vm.startPrank(user1);
        token1.approve(address(etf), predictedRequired[0]);
        token2.approve(address(etf), predictedRequired[1]);
        uint256[] memory actualRequired = etf.mintExactShares(100e18, user1);
        vm.stopPrank();

        assertEq(predictedRequired[0], actualRequired[0], "Required amounts should match exactly");
        assertEq(predictedRequired[1], actualRequired[1], "Required amounts should match exactly");
    }

    // ===========================
    // Management Fee Aware Calculation Test
    // ===========================

    function test_ManagementFeeAware_Calculation() public {
        // Warp time to accumulate management fees
        vm.warp(block.timestamp + 365 days);

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        // Test calculateMintShares vs mint - should now match perfectly
        uint256 predictedShares = etf.calculateMintShares(amounts);

        token1.mint(user1, amounts[0]);
        token2.mint(user1, amounts[1]);

        vm.startPrank(user1);
        token1.transfer(address(etf), amounts[0]);
        token2.transfer(address(etf), amounts[1]);
        uint256 actualShares = etf.mint(user1);
        vm.stopPrank();

        assertEq(predictedShares, actualShares, "calculateMintShares should match mint() exactly");

        // Test calculateRequiredAmounts vs mintExactShares - should now match perfectly
        uint256[] memory predictedRequired = etf.calculateRequiredAmounts(100e18);

        token1.mint(user1, predictedRequired[0]);
        token2.mint(user1, predictedRequired[1]);

        vm.startPrank(user1);
        token1.approve(address(etf), predictedRequired[0]);
        token2.approve(address(etf), predictedRequired[1]);
        uint256[] memory actualRequired = etf.mintExactShares(100e18, user1);
        vm.stopPrank();

        assertEq(
            predictedRequired[0], actualRequired[0], "calculateRequiredAmounts should match mintExactShares exactly"
        );
        assertEq(
            predictedRequired[1], actualRequired[1], "calculateRequiredAmounts should match mintExactShares exactly"
        );

        // Test calculateBurnAmounts vs burn - should now match perfectly
        uint256 sharesBurn = 50e18;
        uint256[] memory predictedBurnAmounts = etf.calculateBurnAmounts(sharesBurn);

        vm.startPrank(user1);
        uint256[] memory actualBurnAmounts = etf.burn(sharesBurn, user1);
        vm.stopPrank();

        assertEq(predictedBurnAmounts[0], actualBurnAmounts[0], "calculateBurnAmounts should match burn exactly");
        assertEq(predictedBurnAmounts[1], actualBurnAmounts[1], "calculateBurnAmounts should match burn exactly");
    }

    // ===========================
    // Time Passage Consistency Test
    // ===========================

    function test_TimePassage_Calculation_Consistency() public {
        // Test at different time intervals
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100e18;
        amounts[1] = 50e18;

        // Test at T+0 (no accumulated fees)
        uint256 predictedShares_T0 = etf.calculateMintShares(amounts);

        token1.mint(user1, amounts[0]);
        token2.mint(user1, amounts[1]);
        vm.startPrank(user1);
        token1.transfer(address(etf), amounts[0]);
        token2.transfer(address(etf), amounts[1]);
        uint256 actualShares_T0 = etf.mint(user1);
        vm.stopPrank();

        assertEq(predictedShares_T0, actualShares_T0, "Should match at T+0");

        // Test at T+6months
        vm.warp(block.timestamp + 182.5 days);

        uint256 predictedShares_T6 = etf.calculateMintShares(amounts);

        token1.mint(user1, amounts[0]);
        token2.mint(user1, amounts[1]);
        vm.startPrank(user1);
        token1.transfer(address(etf), amounts[0]);
        token2.transfer(address(etf), amounts[1]);
        uint256 actualShares_T6 = etf.mint(user1);
        vm.stopPrank();

        assertEq(predictedShares_T6, actualShares_T6, "Should match at T+6months");

        // Test at T+1year
        vm.warp(block.timestamp + 182.5 days); // Total 1 year

        uint256 predictedShares_T12 = etf.calculateMintShares(amounts);

        token1.mint(user1, amounts[0]);
        token2.mint(user1, amounts[1]);
        vm.startPrank(user1);
        token1.transfer(address(etf), amounts[0]);
        token2.transfer(address(etf), amounts[1]);
        uint256 actualShares_T12 = etf.mint(user1);
        vm.stopPrank();

        assertEq(predictedShares_T12, actualShares_T12, "Should match at T+1year");
    }
}

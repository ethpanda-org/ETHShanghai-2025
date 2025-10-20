// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/mocks/MockWETH.sol";
import "../src/mocks/MockUSDC.sol";

/**
 * @title MockTokensTest
 * @notice 测试 Mock ERC20 代币合约
 */
contract MockTokensTest is Test {
    MockWETH public weth;
    MockUSDC public usdc;

    address public alice = address(0x1);
    address public bob = address(0x2);

    function setUp() public {
        weth = new MockWETH();
        usdc = new MockUSDC();
    }

    // ============ MockWETH 测试 ============

    function test_WETHMetadata() public {
        assertEq(weth.name(), "Wrapped Ether");
        assertEq(weth.symbol(), "WETH");
        assertEq(weth.decimals(), 18);
    }

    function test_WETHMint() public {
        weth.mint(alice, 10 ether);
        assertEq(weth.balanceOf(alice), 10 ether);
    }

    function test_WETHDeposit() public {
        vm.deal(alice, 10 ether);
        
        vm.prank(alice);
        weth.deposit{value: 1 ether}();
        
        assertEq(weth.balanceOf(alice), 1 ether);
        assertEq(alice.balance, 9 ether);
    }

    function test_WETHWithdraw() public {
        // 给合约转入 ETH 以便提现
        vm.deal(address(weth), 10 ether);
        
        // 铸造 WETH
        weth.mint(alice, 10 ether);
        
        // 提现
        vm.prank(alice);
        weth.withdraw(5 ether);
        
        assertEq(weth.balanceOf(alice), 5 ether);
        assertEq(alice.balance, 5 ether);
    }

    function test_WETHReceive() public {
        vm.deal(alice, 10 ether);
        
        vm.prank(alice);
        (bool success,) = address(weth).call{value: 1 ether}("");
        assertTrue(success);
        
        assertEq(weth.balanceOf(alice), 1 ether);
    }

    // ============ MockUSDC 测试 ============

    function test_USDCMetadata() public {
        assertEq(usdc.name(), "USD Coin");
        assertEq(usdc.symbol(), "USDC");
        assertEq(usdc.decimals(), 6);
    }

    function test_USDCMint() public {
        usdc.mint(alice, 1000 * 10**6);  // 1000 USDC
        assertEq(usdc.balanceOf(alice), 1000 * 10**6);
    }

    function test_USDCMintUSD() public {
        usdc.mintUSD(alice, 1000);  // 1000 USD
        assertEq(usdc.balanceOf(alice), 1000 * 10**6);
    }

    function test_USDCBatchMint() public {
        address[] memory recipients = new address[](3);
        recipients[0] = alice;
        recipients[1] = bob;
        recipients[2] = address(0x3);

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000 * 10**6;
        amounts[1] = 2000 * 10**6;
        amounts[2] = 3000 * 10**6;

        usdc.batchMint(recipients, amounts);

        assertEq(usdc.balanceOf(alice), 1000 * 10**6);
        assertEq(usdc.balanceOf(bob), 2000 * 10**6);
        assertEq(usdc.balanceOf(address(0x3)), 3000 * 10**6);
    }

    function test_USDCBurn() public {
        usdc.mint(alice, 1000 * 10**6);
        usdc.burn(alice, 500 * 10**6);
        assertEq(usdc.balanceOf(alice), 500 * 10**6);
    }

    function test_RevertWhen_USDCBatchMintMismatchLength() public {
        address[] memory recipients = new address[](2);
        recipients[0] = alice;
        recipients[1] = bob;

        uint256[] memory amounts = new uint256[](3);
        amounts[0] = 1000 * 10**6;
        amounts[1] = 2000 * 10**6;
        amounts[2] = 3000 * 10**6;

        vm.expectRevert("MockUSDC: arrays length mismatch");
        usdc.batchMint(recipients, amounts);
    }

    // ============ ERC20 标准功能测试 ============

    function test_Transfer() public {
        weth.mint(alice, 10 ether);
        
        vm.prank(alice);
        weth.transfer(bob, 3 ether);
        
        assertEq(weth.balanceOf(alice), 7 ether);
        assertEq(weth.balanceOf(bob), 3 ether);
    }

    function test_Approve() public {
        weth.mint(alice, 10 ether);
        
        vm.prank(alice);
        weth.approve(bob, 5 ether);
        
        assertEq(weth.allowance(alice, bob), 5 ether);
    }

    function test_TransferFrom() public {
        weth.mint(alice, 10 ether);
        
        vm.prank(alice);
        weth.approve(bob, 5 ether);
        
        vm.prank(bob);
        weth.transferFrom(alice, bob, 3 ether);
        
        assertEq(weth.balanceOf(alice), 7 ether);
        assertEq(weth.balanceOf(bob), 3 ether);
        assertEq(weth.allowance(alice, bob), 2 ether);
    }
}

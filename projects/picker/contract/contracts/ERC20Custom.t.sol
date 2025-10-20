// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20Custom} from "./ERC20Custom.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract ERC20CustomTest is Test {
    ERC20Custom public token;
    address public deployer;
    address public user1;
    address public user2;
    address public user3;
    
    string public name = "Test Token";
    string public symbol = "TEST";
    uint8 public decimals = 18;
    uint256 public initialSupply = 1000 * 10**uint256(decimals);
    address public initialHolder;

    function setUp() public {
        // 初始化测试地址
        deployer = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);
        initialHolder = user1;
        
        // 部署合约
        token = new ERC20Custom(name, symbol, decimals, initialSupply, initialHolder);
    }

    // 测试代币基本信息
    function test_MetaData() public view {
        assertEq(token.name(), name, "Token name should match");
        assertEq(token.symbol(), symbol, "Token symbol should match");
        assertEq(token.decimals(), decimals, "Token decimals should match");
    }

    // 测试初始供应量
    function test_InitialSupply() public view {
        assertEq(token.totalSupply(), initialSupply, "Total supply should match initial supply");
        assertEq(token.balanceOf(user1), initialSupply, "Initial holder should have all tokens");
    }

    // 测试转账功能
    function test_Transfer() public {
        uint256 transferAmount = 100 * 10**uint256(decimals);
        uint256 balanceBeforeUser2 = token.balanceOf(user2);
        
        vm.prank(user1);
        token.transfer(user2, transferAmount);
        
        assertEq(token.balanceOf(user1), initialSupply - transferAmount, "Sender balance should decrease");
        assertEq(token.balanceOf(user2), balanceBeforeUser2 + transferAmount, "Receiver balance should increase");
    }

    // 测试转账事件
    function test_TransferEmitsEvent() public {
        uint256 transferAmount = 100 * 10**uint256(decimals);
        
        vm.expectEmit(true, true, false, true);
        emit IERC20.Transfer(user1, user2, transferAmount);
        
        vm.prank(user1);
        token.transfer(user2, transferAmount);
    }

    // 测试转账超过余额
    function test_TransferInsufficientBalance() public {
        uint256 excessiveAmount = initialSupply + 1;
        
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(user2, excessiveAmount);
    }

    // 测试转账给零地址
    function test_TransferToZeroAddress() public {
        uint256 transferAmount = 100 * 10**uint256(decimals);
        
        vm.prank(user1);
        vm.expectRevert();
        token.transfer(address(0), transferAmount);
    }

    // 测试授权功能
    function test_Approve() public {
        uint256 allowanceAmount = 100 * 10**uint256(decimals);
        
        vm.prank(user1);
        token.approve(user2, allowanceAmount);
        
        assertEq(token.allowance(user1, user2), allowanceAmount, "Allowance should be set");
    }

    // 测试授权事件
    function test_ApproveEmitsEvent() public {
        uint256 allowanceAmount = 100 * 10**uint256(decimals);
        
        vm.expectEmit(true, true, false, true);
        emit IERC20.Approval(user1, user2, allowanceAmount);
        
        vm.prank(user1);
        token.approve(user2, allowanceAmount);
    }

    // 测试转账授权功能
    function test_TransferFrom() public {
        uint256 allowanceAmount = 100 * 10**uint256(decimals);
        uint256 transferAmount = 50 * 10**uint256(decimals);
        
        // 授权
        vm.prank(user1);
        token.approve(user2, allowanceAmount);
        
        // 转账授权
        vm.prank(user2);
        token.transferFrom(user1, user3, transferAmount);
        
        assertEq(token.balanceOf(user1), initialSupply - transferAmount, "Sender balance should decrease");
        assertEq(token.balanceOf(user3), transferAmount, "Receiver balance should increase");
        assertEq(token.allowance(user1, user2), allowanceAmount - transferAmount, "Allowance should decrease");
    }

    // 测试转账授权事件
    function test_TransferFromEmitsEvent() public {
        uint256 allowanceAmount = 100 * 10**uint256(decimals);
        uint256 transferAmount = 50 * 10**uint256(decimals);
        
        // 授权
        vm.prank(user1);
        token.approve(user2, allowanceAmount);
        
        // 期望事件
        vm.expectEmit(true, true, false, true);
        emit IERC20.Transfer(user1, user3, transferAmount);
        
        // 转账授权
        vm.prank(user2);
        token.transferFrom(user1, user3, transferAmount);
    }

    // 测试转账授权超过授权额度
    function test_TransferFromExceedsAllowance() public {
        uint256 allowanceAmount = 100 * 10**uint256(decimals);
        uint256 transferAmount = 150 * 10**uint256(decimals);
        
        // 授权
        vm.prank(user1);
        token.approve(user2, allowanceAmount);
        
        // 转账授权超过额度
        vm.prank(user2);
        vm.expectRevert();
        token.transferFrom(user1, user3, transferAmount);
    }

    // 测试转账授权超过余额
    function test_TransferFromExceedsBalance() public {
        uint256 excessiveAmount = initialSupply + 1;
        
        // 授权
        vm.prank(user1);
        token.approve(user2, excessiveAmount);
        
        // 转账授权超过余额
        vm.prank(user2);
        vm.expectRevert();
        token.transferFrom(user1, user3, excessiveAmount);
    }

    // 测试所有者铸造功能
    function test_Mint() public {
        uint256 mintAmount = 100 * 10**uint256(decimals);
        uint256 totalSupplyBefore = token.totalSupply();
        uint256 user2BalanceBefore = token.balanceOf(user2);
        
        token.mint(user2, mintAmount);
        
        assertEq(token.totalSupply(), totalSupplyBefore + mintAmount, "Total supply should increase");
        assertEq(token.balanceOf(user2), user2BalanceBefore + mintAmount, "User balance should increase");
    }

    // 测试非所有者无法铸造
    function test_NonOwnerCannotMint() public {
        uint256 mintAmount = 100 * 10**uint256(decimals);
        
        vm.prank(user1);
        vm.expectRevert();
        token.mint(user2, mintAmount);
    }

    // 测试所有者销毁功能
    function test_Burn() public {
        uint256 burnAmount = 100 * 10**uint256(decimals);
        uint256 totalSupplyBefore = token.totalSupply();
        uint256 user1BalanceBefore = token.balanceOf(user1);
        
        token.burn(user1, burnAmount);
        
        assertEq(token.totalSupply(), totalSupplyBefore - burnAmount, "Total supply should decrease");
        assertEq(token.balanceOf(user1), user1BalanceBefore - burnAmount, "User balance should decrease");
    }

    // 测试非所有者无法销毁
    function test_NonOwnerCannotBurn() public {
        uint256 burnAmount = 100 * 10**uint256(decimals);
        
        vm.prank(user1);
        vm.expectRevert();
        token.burn(user1, burnAmount);
    }

    // 测试销毁超过余额
    function test_BurnExceedsBalance() public {
        uint256 excessiveAmount = initialSupply + 1;
        
        vm.expectRevert();
        token.burn(user1, excessiveAmount);
    }

    // 测试零地址铸造
    function test_MintToZeroAddress() public {
        uint256 mintAmount = 100 * 10**uint256(decimals);
        
        vm.expectRevert();
        token.mint(address(0), mintAmount);
    }

    // 测试零地址销毁
    function test_BurnFromZeroAddress() public {
        uint256 burnAmount = 100 * 10**uint256(decimals);
        
        vm.expectRevert();
        token.burn(address(0), burnAmount);
    }
}
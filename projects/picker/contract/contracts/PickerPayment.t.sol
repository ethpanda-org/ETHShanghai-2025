// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {PickerPayment} from "./PickerPayment.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract PickerPaymentTest is Test {
    PickerPayment public pickerPayment;
    address public deployer;
    address public operator1;
    address public operator2;
    address public nonOperator;
    address public devWallet1;
    address public devWallet2;
    
    bytes16 public pickerId1 = bytes16("picker1");
    bytes16 public pickerId2 = bytes16("picker2");
    bytes16 public devUserId1 = bytes16("dev1");
    bytes16 public devUserId2 = bytes16("dev2");
    
    // 添加receive函数以接收以太币
    receive() external payable {}
    // fallback() external payable {}

    function setUp() public {
        // 初始化测试地址
        deployer = address(this);
        operator1 = address(0x1);
        operator2 = address(0x2);
        nonOperator = address(0x3);
        devWallet1 = address(0x4);
        devWallet2 = address(0x5);
        
        // 部署合约
        pickerPayment = new PickerPayment();
    }

    // 测试合约创建者是否正确获得 DEFAULT_ADMIN_ROLE
    function test_InitialAdminRole() public view {
        assertTrue(pickerPayment.hasRole(pickerPayment.DEFAULT_ADMIN_ROLE(), deployer), 
            "Deployer should have DEFAULT_ADMIN_ROLE");
    }

    // 测试授权操作员角色
    function test_GrantOperatorRole() public {
        pickerPayment.grantOperatorRole(operator1);
        assertTrue(pickerPayment.hasRole(pickerPayment.OPERATOR_ROLE(), operator1), 
            "Operator should have OPERATOR_ROLE");
        assertTrue(pickerPayment.isOperator(operator1), 
            "isOperator should return true for operator");
    }

    // 测试取消操作员角色
    function test_RevokeOperatorRole() public {
        pickerPayment.grantOperatorRole(operator1);
        pickerPayment.revokeOperatorRole(operator1);
        assertFalse(pickerPayment.hasRole(pickerPayment.OPERATOR_ROLE(), operator1), 
            "Operator role should be revoked");
        assertFalse(pickerPayment.isOperator(operator1), 
            "isOperator should return false after revocation");
    }

    // 测试非管理员无法授权操作员角色
    function test_NonAdminCannotGrantOperatorRole() public {
        vm.prank(nonOperator);
        vm.expectRevert();
        pickerPayment.grantOperatorRole(operator1);
    }

    // 测试注册Picker
    function test_RegisterPicker() public {
        // 首先授权操作员
        pickerPayment.grantOperatorRole(operator1);
        
        // 操作员注册Picker
        vm.prank(operator1);
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        
        // 验证Picker信息
        (bytes16 queriedPickerId, bytes16 queriedDevUserId) = pickerPayment.queryPickerByWallet(devWallet1);
        assertTrue(queriedPickerId == pickerId1, "Picker ID should match");
        assertTrue(queriedDevUserId == devUserId1, "Developer User ID should match");
    }

    // 测试管理员注册Picker
    function test_AdminCanRegisterPicker() public {
        // 管理员直接注册Picker
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        
        // 验证Picker信息
        (bytes16 queriedPickerId, bytes16 queriedDevUserId) = pickerPayment.queryPickerByWallet(devWallet1);
        assertTrue(queriedPickerId == pickerId1, "Picker ID should match");
        assertTrue(queriedDevUserId == devUserId1, "Developer User ID should match");
    }

    // 测试非授权用户无法注册Picker
    function test_NonAuthorizedCannotRegisterPicker() public {
        vm.prank(nonOperator);
        vm.expectRevert();
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
    }

    // 测试重复注册Picker
    function test_RegisterExistingPicker() public {
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        
        vm.expectRevert(PickerPayment.PickerAlreadyExists.selector);
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
    }

    // 测试删除Picker
    function test_RemovePicker() public {
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        pickerPayment.removePicker(pickerId1);
        
        (bytes16 queriedPickerId, ) = pickerPayment.queryPickerByWallet(devWallet1);
        assertTrue(queriedPickerId == bytes16(0), "Picker should be removed");
    }

    // 测试支付功能
    function test_Pay() public {
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        
        uint256 amount = 100 ether;
        uint256 devShare = amount * 95 / 100;
        uint256 fee = amount - devShare;
        
        // 记录支付前的余额
        uint256 devWalletBalanceBefore = address(devWallet1).balance;
        uint256 contractBalanceBefore = address(pickerPayment).balance;
        
        // 执行支付
        vm.deal(nonOperator, amount);
        vm.prank(nonOperator);
        pickerPayment.pay{value: amount}(pickerId1, devUserId1, devWallet1);
        
        // 验证资金分配
        uint256 devWalletBalanceAfter = address(devWallet1).balance;
        uint256 contractBalanceAfter = address(pickerPayment).balance;
        
        assertTrue(devWalletBalanceAfter - devWalletBalanceBefore == devShare, "Developer should receive correct share");
        assertTrue(contractBalanceAfter - contractBalanceBefore == fee, "Contract should receive correct fee");
    }

    // 测试向不存在的Picker支付
    function test_PayToNonExistentPicker() public {
        bytes16 nonExistentPickerId = bytes16("nonExistent");
        
        vm.deal(nonOperator, 100 ether);
        vm.prank(nonOperator);
        vm.expectRevert(PickerPayment.PickerNotFound.selector);
        pickerPayment.pay{value: 100 ether}(nonExistentPickerId, devUserId1, devWallet1);
    }

    // 测试支付信息不匹配
    function test_PayWithMismatchedInfo() public {
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        
        vm.deal(nonOperator, 100 ether);
        vm.prank(nonOperator);
        vm.expectRevert(PickerPayment.InvalidPickerData.selector);
        pickerPayment.pay{value: 100 ether}(pickerId1, devUserId2, devWallet1);
    }

    // 测试提取资金
    function test_WithdrawFunds() public {
        // 先进行一次支付，让合约有余额
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        uint256 amount = 100 ether;
        vm.deal(nonOperator, amount);
        vm.prank(nonOperator);
        pickerPayment.pay{value: amount}(pickerId1, devUserId1, devWallet1);
        
        // 记录提取前的余额
        uint256 deployerBalanceBefore = deployer.balance;
        uint256 contractBalanceBefore = address(pickerPayment).balance;
        
        // 提取资金
        pickerPayment.withdrawFunds(payable(deployer));
        
        // 验证资金提取
        uint256 deployerBalanceAfter = deployer.balance;
        uint256 contractBalanceAfter = address(pickerPayment).balance;
        
        assertTrue(deployerBalanceAfter - deployerBalanceBefore == contractBalanceBefore, "Deployer should receive all contract balance");
        assertTrue(contractBalanceAfter == 0, "Contract balance should be zero after withdrawal");
    }

    // 测试非管理员无法提取资金
    function test_NonAdminCannotWithdrawFunds() public {
        vm.prank(nonOperator);
        vm.expectRevert();
        pickerPayment.withdrawFunds(payable(nonOperator));
    }

    // 测试查询所有Picker
    function test_GetAllPickers() public {
        pickerPayment.registerPicker(pickerId1, devUserId1, devWallet1);
        pickerPayment.registerPicker(pickerId2, devUserId2, devWallet2);
        
        PickerPayment.Picker[] memory pickers = pickerPayment.getAllPickers();
        assertTrue(pickers.length == 2, "Should return all pickers");
    }

    // 测试非管理员无法查询所有Picker
    function test_NonAdminCannotGetAllPickers() public {
        vm.prank(nonOperator);
        vm.expectRevert();
        pickerPayment.getAllPickers();
    }

    // 测试查询所有操作员
    function test_GetAllOperators() public {
        pickerPayment.grantOperatorRole(operator1);
        pickerPayment.grantOperatorRole(operator2);
        
        address[] memory operators = pickerPayment.getAllOperators();
        assertTrue(operators.length == 2, "Should return all operators");
    }

    // 测试非管理员无法查询所有操作员
    function test_NonAdminCannotGetAllOperators() public {
        vm.prank(nonOperator);
        vm.expectRevert();
        pickerPayment.getAllOperators();
    }

    // 测试禁止直接转账
    function test_DirectTransferNotAllowed() public {
        vm.deal(nonOperator, 100 ether);
        vm.prank(nonOperator);
        (bool success, ) = address(pickerPayment).call{value: 100 ether}("");
        assertFalse(success, "Direct transfers should not be allowed");
    }
}
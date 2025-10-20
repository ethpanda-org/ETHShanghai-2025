// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20Factory} from "./ERC20Factory.sol";
import {ERC20Custom} from "./ERC20Custom.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract ERC20FactoryTest is Test {
    ERC20Factory public factory;
    address public deployer;
    address public user1;
    address public user2;
    
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
        initialHolder = user1;
        
        // 部署工厂合约
        factory = new ERC20Factory();
    }

    // 测试创建ERC20代币
    function test_CreateERC20() public {
        address tokenAddress = factory.createERC20(
            name,
            symbol,
            decimals,
            initialSupply,
            initialHolder
        );
        
        assertTrue(tokenAddress != address(0), "Token address should not be zero");
        
        // 验证创建的代币信息
        ERC20Custom token = ERC20Custom(tokenAddress);
        assertEq(token.name(), name, "Token name should match");
        assertEq(token.symbol(), symbol, "Token symbol should match");
        assertEq(token.decimals(), decimals, "Token decimals should match");
        assertEq(token.balanceOf(initialHolder), initialSupply, "Initial holder should have initial supply");
        // 注意：token的所有者是工厂合约，因为工厂合约是部署者
        assertEq(token.owner(), address(factory), "Token owner should be factory");
    }

    // 测试创建代币事件
    function test_TokenCreatedEvent() public {
        // 创建一个临时变量来捕获实际的事件参数
        address expectedTokenAddress = address(0); // 我们不验证具体的地址
        
        // 期望创建代币事件
        // TokenCreated(address indexed tokenAddress, string name, string symbol)
        vm.expectEmit(false, false, false, true); // 只验证数据部分（name和symbol）
        emit ERC20Factory.TokenCreated(expectedTokenAddress, name, symbol);
        
        factory.createERC20(
            name,
            symbol,
            decimals,
            initialSupply,
            initialHolder
        );
    }

    // 测试创建多个代币
    function test_CreateMultipleTokens() public {
        address token1Address = factory.createERC20(
            name,
            symbol,
            decimals,
            initialSupply,
            initialHolder
        );
        
        address token2Address = factory.createERC20(
            "Second Token",
            "STK",
            decimals,
            initialSupply,
            initialHolder
        );
        
        assertTrue(token1Address != address(0), "First token address should not be zero");
        assertTrue(token2Address != address(0), "Second token address should not be zero");
        assertTrue(token1Address != token2Address, "Token addresses should be different");
        
        // 验证两个代币的信息
        ERC20Custom token1 = ERC20Custom(token1Address);
        ERC20Custom token2 = ERC20Custom(token2Address);
        
        assertEq(token1.name(), name, "First token name should match");
        assertEq(token2.name(), "Second Token", "Second token name should match");
        assertEq(token1.symbol(), symbol, "First token symbol should match");
        assertEq(token2.symbol(), "STK", "Second token symbol should match");
    }

    // 测试创建代币后可以正常使用
    function test_TokenFunctionalityAfterCreation() public {
        address tokenAddress = factory.createERC20(
            name,
            symbol,
            decimals,
            initialSupply,
            initialHolder
        );
        
        ERC20Custom token = ERC20Custom(tokenAddress);
        
        uint256 transferAmount = 100 * 10**uint256(decimals);
        uint256 balanceBeforeUser2 = token.balanceOf(user2);
        
        // 测试转账功能
        vm.prank(initialHolder);
        token.transfer(user2, transferAmount);
        
        assertEq(token.balanceOf(initialHolder), initialSupply - transferAmount, "Sender balance should decrease");
        assertEq(token.balanceOf(user2), balanceBeforeUser2 + transferAmount, "Receiver balance should increase");
        
        // 测试所有者铸造功能（需要以工厂合约的身份调用）
        uint256 mintAmount = 500 * 10**uint256(decimals);
        vm.prank(address(factory));
        token.mint(user1, mintAmount);
        
        assertEq(token.totalSupply(), initialSupply + mintAmount, "Total supply should increase after minting");
        // 用户1的余额应该是初始供应量加上转账出去的金额（transferAmount）再加上铸造的金额（mintAmount）
        // 初始供应量：1000 * 10**18
        // 转账出去：100 * 10**18
        // 铸造增加：500 * 10**18
        // 最终余额：(1000 - 100 + 500) * 10**18 = 1400 * 10**18
        assertEq(token.balanceOf(user1), initialSupply - transferAmount + mintAmount, "User1 should have correct balance");
    }
}
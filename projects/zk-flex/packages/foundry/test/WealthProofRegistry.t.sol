// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../contracts/WealthProofRegistry.sol";
import "../contracts/WealthProofInstance.sol";

contract WealthProofRegistryTest is Test {
    WealthProofRegistry public registry;
    
    // 测试地址
    address public alice = address(0x1);
    address public bob = address(0x2);
    
    function setUp() public {
        // 部署 Registry（会自动部署 Verifier）
        registry = new WealthProofRegistry();
    }
    
    function testCreateInstance() public {
        // 准备 32 个测试地址
        address[32] memory walletPool = _generateTestWalletPool();
        
        // 创建实例
        vm.prank(alice);
        address instance = registry.createProofInstance(walletPool);
        
        // 验证实例创建成功
        assertEq(instance != address(0), true, "Instance should be created");
        
        // 验证实例被记录
        address[] memory userInstances = registry.getUserInstances(alice);
        assertEq(userInstances.length, 1, "Should have 1 instance");
        assertEq(userInstances[0], instance, "Instance address should match");
    }
    
    function testMultipleInstances() public {
        // Alice 创建 2 个实例
        vm.startPrank(alice);
        address instance1 = registry.createProofInstance(_generateTestWalletPool());
        address instance2 = registry.createProofInstance(_generateTestWalletPool());
        vm.stopPrank();
        
        // Bob 创建 1 个实例
        vm.prank(bob);
        address instance3 = registry.createProofInstance(_generateTestWalletPool());
        
        // 验证
        address[] memory aliceInstances = registry.getUserInstances(alice);
        address[] memory bobInstances = registry.getUserInstances(bob);
        address[] memory allInstances = registry.getAllInstances();
        
        assertEq(aliceInstances.length, 2, "Alice should have 2 instances");
        assertEq(bobInstances.length, 1, "Bob should have 1 instance");
        assertEq(allInstances.length, 3, "Total should be 3 instances");
    }
    
    function testSnapshotCreation() public {
        // 创建实例
        vm.prank(alice);
        address instanceAddr = registry.createProofInstance(_generateTestWalletPool());
        
        WealthProofInstance instance = WealthProofInstance(instanceAddr);
        
        // 验证快照存在
        WealthProofInstance.Snapshot memory snapshot = instance.getLatestSnapshot();
        assertEq(snapshot.exists, true, "Snapshot should exist");
        assertEq(snapshot.blockNumber, block.number, "Block number should match");
    }
    
    function testInvalidWalletPool() public {
        // 创建包含零地址的钱包池
        address[32] memory invalidPool = _generateTestWalletPool();
        invalidPool[10] = address(0);  // 插入零地址
        
        // 应该失败
        vm.prank(alice);
        vm.expectRevert("Zero address not allowed");
        registry.createProofInstance(invalidPool);
    }
    
    // ========== 辅助函数 ==========
    
    function _generateTestWalletPool() internal pure returns (address[32] memory) {
        address[32] memory pool;
        for (uint256 i = 0; i < 32; i++) {
            pool[i] = address(uint160(0x1000 + i));
        }
        return pool;
    }
}


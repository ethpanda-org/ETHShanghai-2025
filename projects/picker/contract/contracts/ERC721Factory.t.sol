// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721Factory} from "./ERC721Factory.sol";
import {CustomERC721} from "./ERC721Custom.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract ERC721FactoryTest is Test {
    ERC721Factory public factory;
    address public deployer;
    address public user1;
    address public user2;
    
    string public name = "Test Collection";
    string public symbol = "TCOL";
    string public baseURI = "https://example.com/nft/";

    function setUp() public {
        // 初始化测试地址
        deployer = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        
        // 部署工厂合约
        factory = new ERC721Factory();
    }

    // 测试创建NFT集合
    function test_CreateCollection() public {
        vm.prank(user1);
        
        address collectionAddress = factory.createCollection(name, symbol, baseURI);
        
        assertTrue(collectionAddress != address(0), "Collection address should not be zero");
        
        // 验证创建的集合信息
        CustomERC721 collection = CustomERC721(collectionAddress);
        assertEq(collection.name(), name, "Collection name should match");
        assertEq(collection.symbol(), symbol, "Collection symbol should match");
        assertEq(collection.owner(), user1, "Collection owner should be user1");
        
        // 验证用户集合映射
        address[] memory userCollections = factory.getCollections(user1);
        assertEq(userCollections.length, 1, "User should have one collection");
        assertEq(userCollections[0], collectionAddress, "Collection address should match");
    }

    // 测试创建多个集合
    function test_CreateMultipleCollections() public {
        vm.prank(user1);
        address collection1 = factory.createCollection(name, symbol, baseURI);
        
        vm.prank(user1);
        address collection2 = factory.createCollection("Test Collection 2", "TCOL2", "https://example.com/nft2/");
        
        // 验证用户集合映射
        address[] memory userCollections = factory.getCollections(user1);
        assertEq(userCollections.length, 2, "User should have two collections");
        assertEq(userCollections[0], collection1, "First collection address should match");
        assertEq(userCollections[1], collection2, "Second collection address should match");
    }

    // 测试不同用户创建集合
    function test_CreateCollectionsDifferentUsers() public {
        vm.prank(user1);
        address collection1 = factory.createCollection(name, symbol, baseURI);
        
        vm.prank(user2);
        address collection2 = factory.createCollection("User2 Collection", "U2COL", "https://example.com/user2/");
        
        // 验证用户1的集合
        address[] memory user1Collections = factory.getCollections(user1);
        assertEq(user1Collections.length, 1, "User1 should have one collection");
        assertEq(user1Collections[0], collection1, "User1 collection address should match");
        
        // 验证用户2的集合
        address[] memory user2Collections = factory.getCollections(user2);
        assertEq(user2Collections.length, 1, "User2 should have one collection");
        assertEq(user2Collections[0], collection2, "User2 collection address should match");
    }

    // 测试获取用户集合
    function test_GetCollections() public {
        vm.prank(user1);
        address collection1 = factory.createCollection(name, symbol, baseURI);
        
        vm.prank(user1);
        address collection2 = factory.createCollection("Test Collection 2", "TCOL2", "https://example.com/nft2/");
        
        // 任何地址都可以查询用户集合
        address[] memory userCollections = factory.getCollections(user1);
        assertEq(userCollections.length, 2, "Should return two collections for user1");
        assertEq(userCollections[0], collection1, "First collection address should match");
        assertEq(userCollections[1], collection2, "Second collection address should match");
    }

    // 测试获取没有集合的用户
    function test_GetCollectionsForUserWithNoCollections() public view {
        address[] memory userCollections = factory.getCollections(user1);
        assertEq(userCollections.length, 0, "Should return empty array for user with no collections");
    }

    // 测试集合创建事件参数
    // function test_CollectionCreatedEvent() public {
    //     vm.prank(user1);
        
    //     // 获取预期的集合地址
    //     address expectedCollectionAddress;
    //     bytes memory creationCode = type(CustomERC721).creationCode;
    //     bytes32 salt = keccak256(abi.encodePacked(name, symbol, baseURI, block.timestamp));
    //     expectedCollectionAddress = address(uint160(uint256(keccak256(abi.encodePacked(
    //         bytes1(0xff),
    //         address(factory),
    //         salt,
    //         keccak256(creationCode)
    //     )))));
        
    //     // 期望创建集合事件
    //     vm.expectEmit(true, true, false, false);
    //     emit ERC721Factory.CollectionCreated(user1, expectedCollectionAddress, name, symbol);
        
    //     factory.createCollection(name, symbol, baseURI);
    // }
}
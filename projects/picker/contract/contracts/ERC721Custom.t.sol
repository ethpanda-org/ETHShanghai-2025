// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {CustomERC721} from "./ERC721Custom.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

contract ERC721CustomTest is Test {
    CustomERC721 public nft;
    address public deployer;
    address public user1;
    address public user2;
    address public user3;
    
    string public name = "Test NFT";
    string public symbol = "TNFT";
    string public baseURI = "https://example.com/nft/";
    address public initialOwner;

    function setUp() public {
        // 初始化测试地址
        deployer = address(this);
        user1 = address(0x1);
        user2 = address(0x2);
        user3 = address(0x3);
        initialOwner = user1;
        
        // 部署合约
        nft = new CustomERC721(name, symbol, baseURI, initialOwner);
    }

    // 测试NFT基本信息
    function test_MetaData() public view {
        assertEq(nft.name(), name, "NFT name should match");
        assertEq(nft.symbol(), symbol, "NFT symbol should match");
    }

    // 测试Base URI通过tokenURI间接验证
    function test_BaseURI() public {
        uint256 tokenId = nft.tokenCounter();
        
        vm.prank(user1);
        nft.mint(user2);
        
        string memory expectedURI = string(abi.encodePacked(baseURI, Strings.toString(tokenId)));
        assertEq(nft.tokenURI(tokenId), expectedURI, "Token URI should match base URI + token ID");
    }

    // 测试tokenCounter初始化
    function test_TokenCounterInitialValue() public view {
        assertEq(nft.tokenCounter(), 0, "Token counter should be initialized to 0");
    }

    // 测试所有者铸造功能
    function test_Mint() public {
        uint256 tokenId = nft.tokenCounter();
        
        vm.expectEmit(true, true, true, true);
        emit IERC721.Transfer(address(0), user2, tokenId);
        
        vm.prank(user1);
        nft.mint(user2);
        
        assertEq(nft.balanceOf(user2), 1, "User2 balance should be 1");
        assertEq(nft.ownerOf(tokenId), user2, "User2 should own the minted token");
        assertEq(nft.tokenCounter(), 1, "Token counter should increment");
    }

    // 测试非所有者无法铸造
    function test_NonOwnerCannotMint() public {
        vm.prank(user2);
        vm.expectRevert();
        nft.mint(user2);
    }

    // 测试铸造给零地址
    function test_MintToZeroAddress() public {
        vm.prank(user1);
        vm.expectRevert();
        nft.mint(address(0));
    }

    // 测试Token URI
    function test_TokenURI() public {
        uint256 tokenId = nft.tokenCounter();
        
        vm.prank(user1);
        nft.mint(user2);
        
        string memory expectedURI = string(abi.encodePacked(baseURI, Strings.toString(tokenId)));
        assertEq(nft.tokenURI(tokenId), expectedURI, "Token URI should match base URI + token ID");
    }

    // 测试转账功能
    function test_Transfer() public {
        uint256 tokenId = nft.tokenCounter();
        
        // 铸造一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // user2将NFT转移给user3
        vm.prank(user2);
        nft.transferFrom(user2, user3, tokenId);
        
        assertEq(nft.balanceOf(user2), 0, "User2 balance should be 0");
        assertEq(nft.balanceOf(user3), 1, "User3 balance should be 1");
        assertEq(nft.ownerOf(tokenId), user3, "User3 should own the token");
    }

    // 测试转账事件
    function test_TransferEmitsEvent() public {
        uint256 tokenId = nft.tokenCounter();
        
        // 铸造一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // 期望转账事件
        vm.expectEmit(true, true, true, true);
        emit IERC721.Transfer(user2, user3, tokenId);
        
        // user2将NFT转移给user3
        vm.prank(user2);
        nft.transferFrom(user2, user3, tokenId);
    }

    // 测试转账非拥有的NFT
    function test_TransferNotOwner() public {
        uint256 tokenId = nft.tokenCounter();
        
        // 铸造一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // user3尝试转移user2拥有的NFT
        vm.prank(user3);
        vm.expectRevert();
        nft.transferFrom(user2, user3, tokenId);
    }

    // 测试授权功能
    function test_Approve() public {
        uint256 tokenId = nft.tokenCounter();
        
        // 铸造一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // user2授权user3操作该NFT
        vm.prank(user2);
        nft.approve(user3, tokenId);
        
        assertEq(nft.getApproved(tokenId), user3, "User3 should be approved for the token");
    }

    // 测试授权事件
    function test_ApproveEmitsEvent() public {
        uint256 tokenId = nft.tokenCounter();
        
        // 铸造一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // 期望授权事件
        vm.expectEmit(true, true, true, true);
        emit IERC721.Approval(user2, user3, tokenId);
        
        // user2授权user3操作该NFT
        vm.prank(user2);
        nft.approve(user3, tokenId);
    }

    // 测试授权全权功能
    function test_SetApprovalForAll() public {
        // user2授权user3操作其所有NFT
        vm.prank(user2);
        nft.setApprovalForAll(user3, true);
        
        assertTrue(nft.isApprovedForAll(user2, user3), "User3 should be approved for all user2's tokens");
    }

    // 测试授权全权事件
    function test_SetApprovalForAllEmitsEvent() public {
        // 期望授权全权事件
        vm.expectEmit(true, true, true, true);
        emit IERC721.ApprovalForAll(user2, user3, true);
        
        // user2授权user3操作其所有NFT
        vm.prank(user2);
        nft.setApprovalForAll(user3, true);
    }

    // 测试通过授权转移NFT
    function test_TransferFromApproved() public {
        uint256 tokenId = nft.tokenCounter();
        
        // 铸造一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // user2授权user3操作该NFT
        vm.prank(user2);
        nft.approve(user3, tokenId);
        
        // user3转移该NFT给user1
        vm.prank(user3);
        nft.transferFrom(user2, user1, tokenId);
        
        assertEq(nft.balanceOf(user1), 1, "User1 balance should be 1");
        assertEq(nft.balanceOf(user2), 0, "User2 balance should be 0");
        assertEq(nft.ownerOf(tokenId), user1, "User1 should own the token");
    }

    // 测试通过全权授权转移NFT
    function test_TransferFromApprovedForAll() public {
        uint256 tokenId = nft.tokenCounter();
        
        // 铸造一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // user2授权user3操作其所有NFT
        vm.prank(user2);
        nft.setApprovalForAll(user3, true);
        
        // user3转移该NFT给user1
        vm.prank(user3);
        nft.transferFrom(user2, user1, tokenId);
        
        assertEq(nft.balanceOf(user1), 1, "User1 balance should be 1");
        assertEq(nft.balanceOf(user2), 0, "User2 balance should be 0");
        assertEq(nft.ownerOf(tokenId), user1, "User1 should own the token");
    }

    // 测试铸造多个NFT
    function test_MintMultipleTokens() public {
        // 铸造第一个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        // 铸造第二个NFT给user2
        vm.prank(user1);
        nft.mint(user2);
        
        assertEq(nft.balanceOf(user2), 2, "User2 balance should be 2");
        assertEq(nft.tokenCounter(), 2, "Token counter should be 2");
        assertEq(nft.ownerOf(0), user2, "User2 should own token 0");
        assertEq(nft.ownerOf(1), user2, "User2 should own token 1");
    }
}
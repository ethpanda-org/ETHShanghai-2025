// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IdentityToken} from "../../src/IdentityToken.sol";
import {BaseReputationTest} from "../utils/BaseReputationTest.sol";

contract IdentityTokenTest is BaseReputationTest {
    function setUp() public virtual override {
        BaseReputationTest.setUp();
    }

    function testMintSelfCreatesIdentity() public {
        vm.expectEmit(true, true, false, true);
        emit IdentityToken.IdentityMinted(buyer, 1, "ipfs://metadata");

        vm.prank(buyer);
        uint256 tokenId = identityToken.mintSelf("ipfs://metadata");

        assertEq(tokenId, 1, "should return token id");
        assertTrue(identityToken.hasIdentity(buyer), "identity should exist");
        assertEq(identityToken.balanceOf(buyer), 1, "balance should be 1");
        assertEq(identityToken.ownerOf(tokenId), buyer, "owner must match");
        assertEq(identityToken.hasIdentity(address(0)), false, "zero address cannot have identity");
    }

    function testMintSelfTwiceReverts() public {
        vm.prank(buyer);
        identityToken.mintSelf("ipfs://metadata");

        vm.prank(buyer);
        vm.expectRevert(IdentityToken.IdentityAlreadyExists.selector);
        identityToken.mintSelf("ipfs://metadata");
    }

    function testAttestByOwnerMintsForCreator() public {
        uint256 tokenId = identityToken.attest(creator, "ipfs://creator");

        assertEq(identityToken.ownerOf(tokenId), creator, "owner mismatch");
        assertTrue(identityToken.hasIdentity(creator), "creator should have identity");
    }

    function testTransferFromAlwaysReverts() public {
        vm.prank(buyer);
        identityToken.mintSelf("ipfs://metadata");

        vm.expectRevert(IdentityToken.Soulbound.selector);
        identityToken.transferFrom(buyer, operator, 1);
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ReputationBadge} from "../../src/ReputationBadge.sol";
import {BaseReputationTest} from "../utils/BaseReputationTest.sol";

contract ReputationBadgeTest is BaseReputationTest {
    function setUp() public virtual override {
        BaseReputationTest.setUp();
    }

    function testIssueBadgeOnce() public {
        vm.expectEmit(true, true, true, true);
        emit ReputationBadge.BadgeMinted(buyer, 1, 1, "ipfs://badge/1");

        uint256 badgeId = reputationBadge.issueBadge(buyer, 1, "ipfs://badge/1");

        assertEq(badgeId, 1, "badge id mismatch");
        assertTrue(reputationBadge.hasBadge(buyer, 1), "should have badge");
        assertEq(reputationBadge.ownerOf(badgeId), buyer, "owner mismatch");
        assertEq(reputationBadge.totalSupply(), 1, "total supply mismatch");

        uint256[] memory badgeIds = reputationBadge.badgeIdsOf(buyer);
        assertEq(badgeIds.length, 1, "badge count mismatch");
        assertEq(badgeIds[0], badgeId, "stored badge id mismatch");
        assertEq(reputationBadge.badgeRule(badgeId), 1, "rule mismatch");
        assertEq(reputationBadge.badgeURI(badgeId), "ipfs://badge/1", "metadata mismatch");
    }

    function testIssueBadgeTwiceReverts() public {
        reputationBadge.issueBadge(buyer, 1, "ipfs://badge/1");

        vm.expectRevert(abi.encodeWithSelector(ReputationBadge.BadgeAlreadyClaimed.selector, 1));
        reputationBadge.issueBadge(buyer, 1, "ipfs://badge/1");
    }

    function testTransferFromReverts() public {
        reputationBadge.issueBadge(buyer, 1, "ipfs://badge/1");

        vm.expectRevert(ReputationBadge.Soulbound.selector);
        reputationBadge.transferFrom(buyer, operator, 1);
    }
}

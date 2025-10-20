// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {Marketplace} from "../src/Marketplace.sol";
import {IdentityToken} from "../src/IdentityToken.sol";
import {ReputationBadge} from "../src/ReputationBadge.sol";

/// @notice Utility script to help debug marketplace listings and identity minting for creators.
contract ListWorkDebug is Script {
    function run() external {
        address marketplaceAddr = vm.envAddress("MARKETPLACE_ADDRESS");
        uint256 creatorKey = vm.envUint("CREATOR_PRIVATE_KEY");
        string memory workSlug = vm.envOr("WORK_SLUG", string("debug-work"));
        uint256 price = vm.envUint("LIST_PRICE");

        Marketplace marketplace = Marketplace(marketplaceAddr);
        bytes32 workId = keccak256(bytes(workSlug));
        address creator = vm.addr(creatorKey);

        console2.log("== Marketplace Listing Debug ==");
        console2.log("Marketplace:", marketplaceAddr);
        console2.log("Creator:", creator);
        console2.logBytes32(workId);
        console2.log("Price:", price);

        Marketplace.Listing memory existingListing = marketplace.getWork(workId);
        if (existingListing.creator != address(0) && existingListing.active) {
            console2.log("Work already active, skipping broadcast");
        } else {
            vm.startBroadcast(creatorKey);
            marketplace.listWork(workId, price);
            vm.stopBroadcast();
            console2.log("listWork transaction submitted");
        }

        Marketplace.Listing memory listing = marketplace.getWork(workId);
        console2.log("Listing creator:", listing.creator);
        console2.log("Listing price:", listing.price);
        console2.log("Listing active:", listing.active);
        console2.log("Units sold:", listing.sold);

        IdentityToken identity = marketplace.identityToken();
        bool hasIdentity = identity.hasIdentity(creator);
        console2.log("Creator identity minted:", hasIdentity);
        if (hasIdentity) {
            console2.log("Creator identity tokenId:", identity.tokenIdOf(creator));
        }

        ReputationBadge badge = marketplace.reputationBadge();
        uint256[] memory badgeIds = badge.badgeIdsOf(creator);
        console2.log("Creator badge count:", badgeIds.length);
        if (badgeIds.length > 0) {
            for (uint256 i = 0; i < badgeIds.length; i++) {
                console2.log(" - badgeId:", badgeIds[i]);
                console2.log("   ruleId:", badge.badgeRule(badgeIds[i]));
            }
        }
    }
}

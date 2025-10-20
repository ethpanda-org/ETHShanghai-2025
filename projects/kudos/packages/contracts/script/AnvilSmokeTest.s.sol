// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import {IdentityToken} from "../src/IdentityToken.sol";
import {ReputationBadge} from "../src/ReputationBadge.sol";
import {BadgeRuleRegistry} from "../src/BadgeRuleRegistry.sol";
import {ReputationDataFeed} from "../src/ReputationDataFeed.sol";
import {Marketplace} from "../src/Marketplace.sol";
import {MockERC20} from "../src/mocks/MockERC20.sol";
import {IMintableERC20} from "../src/interfaces/IMintableERC20.sol";

contract AnvilSmokeTest is Script {
    uint256 internal constant WELCOME_AMOUNT = 10_000_000;
    uint256 internal constant LIST_PRICE = 6_000_000;
    bytes32 internal constant WORK_ID = keccak256("smoke-work");

    function run() external {
        // Derive deterministic local accounts
        uint256 deployerKey = 1;
        uint256 creatorKey = 2;
        uint256 buyerKey = 3;

        address deployer = vm.addr(deployerKey);
        address creator = vm.addr(creatorKey);
        address buyer = vm.addr(buyerKey);

        // Seed ETH for gas
        vm.deal(deployer, 10 ether);
        vm.deal(creator, 5 ether);
        vm.deal(buyer, 5 ether);

        // Deploy contracts as deployer
        vm.startPrank(deployer);
        IdentityToken identityToken = new IdentityToken();
        ReputationBadge reputationBadge = new ReputationBadge();
        BadgeRuleRegistry badgeRuleRegistry = new BadgeRuleRegistry();
        ReputationDataFeed dataFeed = new ReputationDataFeed();
        MockERC20 settlementToken = new MockERC20("Mock USDT", "mUSDT", 6);

        Marketplace marketplace = new Marketplace(
            IMintableERC20(address(settlementToken)),
            identityToken,
            reputationBadge,
            badgeRuleRegistry,
            dataFeed,
            "ipfs://identity/default.json",
            WELCOME_AMOUNT
        );

        identityToken.transferOwnership(address(marketplace));
        reputationBadge.transferOwnership(address(marketplace));
        dataFeed.setMarketplace(address(marketplace));

        badgeRuleRegistry.createRule(
            BadgeRuleRegistry.BadgeRuleInput({
                ruleId: 1,
                trigger: BadgeRuleRegistry.TriggerType.Passive,
                target: BadgeRuleRegistry.BadgeTarget.Buyer,
                threshold: 1,
                metadataURI: "ipfs://badge/buyer-one-purchase.json",
                enabled: true
            })
        );
        badgeRuleRegistry.createRule(
            BadgeRuleRegistry.BadgeRuleInput({
                ruleId: 3,
                trigger: BadgeRuleRegistry.TriggerType.Passive,
                target: BadgeRuleRegistry.BadgeTarget.Creator,
                threshold: 1,
                metadataURI: "ipfs://badge/creator-one-sale.json",
                enabled: true
            })
        );
        vm.stopPrank();

        // Creator lists a work
        vm.startPrank(creator);
        marketplace.listWork(WORK_ID, LIST_PRICE);
        vm.stopPrank();

        // Buyer approves marketplace and purchases the work
        vm.startPrank(buyer);
        settlementToken.approve(address(marketplace), type(uint256).max);
        marketplace.purchase(WORK_ID);
        vm.stopPrank();

        // Assertions
        require(identityToken.hasIdentity(buyer), "smoke: buyer missing identity");
        require(reputationBadge.hasBadge(buyer, 1), "smoke: buyer missing badge");
        require(reputationBadge.hasBadge(creator, 3), "smoke: creator missing badge");

        uint256 buyerBalance = settlementToken.balanceOf(buyer);
        require(buyerBalance == (WELCOME_AMOUNT - LIST_PRICE), "smoke: buyer balance incorrect");
        require(settlementToken.balanceOf(creator) == LIST_PRICE, "smoke: creator payment missing");

        ReputationDataFeed.BuyerStat memory buyerStat = dataFeed.getBuyerStat(buyer);
        require(buyerStat.totalPurchases == 1, "smoke: buyer stat count mismatch");
        require(buyerStat.totalVolume == LIST_PRICE, "smoke: buyer stat volume mismatch");

        ReputationDataFeed.CreatorStat memory creatorStat = dataFeed.getCreatorStat(creator);
        require(creatorStat.totalSales == 1, "smoke: creator stat count mismatch");
        require(creatorStat.totalVolume == LIST_PRICE, "smoke: creator stat volume mismatch");

        console2.log("Smoke test completed successfully");
        console2.log("Deployer:", deployer);
        console2.log("Creator:", creator);
        console2.log("Buyer:", buyer);
        console2.log("Marketplace:", address(marketplace));
        console2.log("IdentityToken:", address(identityToken));
        console2.log("ReputationBadge:", address(reputationBadge));
        console2.log("BadgeRuleRegistry:", address(badgeRuleRegistry));
        console2.log("ReputationDataFeed:", address(dataFeed));
        console2.log("SettlementToken:", address(settlementToken));
    }
}

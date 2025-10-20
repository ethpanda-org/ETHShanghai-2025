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

contract DeployReputation is Script {
    string internal constant DEFAULT_IDENTITY_URI = "ipfs://identity/default.json";
    uint256 internal constant DEFAULT_WELCOME_AMOUNT = 10_000_000; // 10 tokens with 6 decimals

    function run() external {
        vm.startBroadcast();

        IdentityToken identityToken = new IdentityToken();
        ReputationBadge reputationBadge = new ReputationBadge();
        BadgeRuleRegistry badgeRuleRegistry = new BadgeRuleRegistry();
        ReputationDataFeed dataFeed = new ReputationDataFeed();
        MockERC20 settlementToken = new MockERC20("Mock USDT", "mUSDT", 6);

        Marketplace marketplace = new Marketplace(
            settlementToken,
            identityToken,
            reputationBadge,
            badgeRuleRegistry,
            dataFeed,
            DEFAULT_IDENTITY_URI,
            DEFAULT_WELCOME_AMOUNT
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

        vm.stopBroadcast();

        console2.log("IdentityToken:", address(identityToken));
        console2.log("ReputationBadge:", address(reputationBadge));
        console2.log("BadgeRuleRegistry:", address(badgeRuleRegistry));
        console2.log("ReputationDataFeed:", address(dataFeed));
        console2.log("MockSettlementToken:", address(settlementToken));
        console2.log("Marketplace:", address(marketplace));
    }
}

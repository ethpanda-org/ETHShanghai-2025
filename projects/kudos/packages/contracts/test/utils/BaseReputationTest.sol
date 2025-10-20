// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";

import {IdentityToken} from "../../src/IdentityToken.sol";
import {ReputationBadge} from "../../src/ReputationBadge.sol";
import {BadgeRuleRegistry} from "../../src/BadgeRuleRegistry.sol";

abstract contract BaseReputationTest is Test {
    IdentityToken internal identityToken;
    ReputationBadge internal reputationBadge;
    BadgeRuleRegistry internal badgeRuleRegistry;

    address internal deployer;
    address internal buyer;
    address internal creator;
    address internal operator;

    function setUp() public virtual {
        deployer = address(this);
        buyer = makeAddr("buyer");
        creator = makeAddr("creator");
        operator = makeAddr("operator");

        identityToken = new IdentityToken();
        reputationBadge = new ReputationBadge();
        badgeRuleRegistry = new BadgeRuleRegistry();
    }

    function defaultBadgeRule() internal pure returns (BadgeRuleRegistry.BadgeRuleInput memory) {
        return BadgeRuleRegistry.BadgeRuleInput({
            ruleId: 1,
            trigger: BadgeRuleRegistry.TriggerType.Passive,
            target: BadgeRuleRegistry.BadgeTarget.Buyer,
            threshold: 1,
            metadataURI: "ipfs://badge/1.json",
            enabled: true
        });
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {BadgeRuleRegistry} from "../../src/BadgeRuleRegistry.sol";
import {BaseReputationTest} from "../utils/BaseReputationTest.sol";

contract BadgeRuleRegistryTest is BaseReputationTest {
    function setUp() public virtual override {
        BaseReputationTest.setUp();
    }

    function testCreateRuleStoresData() public {
        BadgeRuleRegistry.BadgeRuleInput memory input = defaultBadgeRule();

        badgeRuleRegistry.createRule(input);

        assertEq(badgeRuleRegistry.ruleCount(), 1, "rule count mismatch");
        assertTrue(badgeRuleRegistry.ruleExists(input.ruleId), "rule should exist");
        uint256 storedId = badgeRuleRegistry.ruleIdAt(0);
        assertEq(storedId, input.ruleId, "rule id mismatch");

        BadgeRuleRegistry.BadgeRule memory storedRule = badgeRuleRegistry.getRule(input.ruleId);
        assertEq(uint8(storedRule.trigger), uint8(input.trigger), "trigger mismatch");
        assertEq(uint8(storedRule.target), uint8(input.target), "target mismatch");
        assertEq(storedRule.threshold, input.threshold, "threshold mismatch");
        assertEq(storedRule.metadataURI, input.metadataURI, "metadata mismatch");
        assertEq(storedRule.enabled, input.enabled, "enabled mismatch");
    }

    function testCreateDuplicateRuleReverts() public {
        BadgeRuleRegistry.BadgeRuleInput memory input = defaultBadgeRule();
        badgeRuleRegistry.createRule(input);

        vm.expectRevert(abi.encodeWithSelector(BadgeRuleRegistry.RuleAlreadyExists.selector, input.ruleId));
        badgeRuleRegistry.createRule(input);
    }

    function testUpdateRuleAdjustsMetadata() public {
        BadgeRuleRegistry.BadgeRuleInput memory input = defaultBadgeRule();
        badgeRuleRegistry.createRule(input);

        string memory newMetadata = "ipfs://badge/updated.json";

        badgeRuleRegistry.updateRule(input.ruleId, newMetadata);

        BadgeRuleRegistry.BadgeRule memory storedRule = badgeRuleRegistry.getRule(input.ruleId);
        assertEq(uint8(storedRule.trigger), uint8(input.trigger), "trigger should remain unchanged");
        assertEq(uint8(storedRule.target), uint8(input.target), "target should remain unchanged");
        assertEq(storedRule.threshold, input.threshold, "threshold should remain unchanged");
        assertEq(storedRule.metadataURI, newMetadata, "metadata mismatch");
    }

    function testSetRuleStatusTogglesEnabled() public {
        BadgeRuleRegistry.BadgeRuleInput memory input = defaultBadgeRule();
        badgeRuleRegistry.createRule(input);

        badgeRuleRegistry.setRuleStatus(input.ruleId, false);

        BadgeRuleRegistry.BadgeRule memory storedRule = badgeRuleRegistry.getRule(input.ruleId);
        assertFalse(storedRule.enabled, "rule should be disabled");

        badgeRuleRegistry.setRuleStatus(input.ruleId, true);
        storedRule = badgeRuleRegistry.getRule(input.ruleId);
        assertTrue(storedRule.enabled, "rule should be enabled again");
    }
}

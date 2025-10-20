// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";

contract BadgeRuleRegistry is Ownable {
    enum TriggerType {
        Passive,
        Active
    }

    enum BadgeTarget {
        Buyer,
        Creator
    }

    struct BadgeRule {
        uint256 ruleId;
        TriggerType trigger;
        BadgeTarget target;
        uint256 threshold;
        string metadataURI;
        bool enabled;
    }

    struct BadgeRuleInput {
        uint256 ruleId;
        TriggerType trigger;
        BadgeTarget target;
        uint256 threshold;
        string metadataURI;
        bool enabled;
    }

    mapping(uint256 => BadgeRule) private _rules;
    uint256[] private _ruleIds;

    error RuleAlreadyExists(uint256 ruleId);
    error RuleNotFound(uint256 ruleId);

    event BadgeRuleCreated(
        uint256 indexed ruleId,
        TriggerType trigger,
        BadgeTarget target,
        uint256 threshold,
        string metadataURI,
        bool enabled
    );
    event BadgeRuleUpdated(
        uint256 indexed ruleId, TriggerType trigger, BadgeTarget target, uint256 threshold, string metadataURI
    );
    event BadgeRuleStatusChanged(uint256 indexed ruleId, bool enabled);

    function createRule(BadgeRuleInput calldata input) external onlyOwner {
        if (_rules[input.ruleId].ruleId != 0) revert RuleAlreadyExists(input.ruleId);

        _rules[input.ruleId] = BadgeRule({
            ruleId: input.ruleId,
            trigger: input.trigger,
            target: input.target,
            threshold: input.threshold,
            metadataURI: input.metadataURI,
            enabled: input.enabled
        });

        _ruleIds.push(input.ruleId);

        emit BadgeRuleCreated(
            input.ruleId, input.trigger, input.target, input.threshold, input.metadataURI, input.enabled
        );
    }

    function updateRule(uint256 ruleId, string calldata metadataURI) external onlyOwner {
        BadgeRule storage rule = _rules[ruleId];
        if (rule.ruleId == 0) revert RuleNotFound(ruleId);

        rule.metadataURI = metadataURI;

        emit BadgeRuleUpdated(ruleId, rule.trigger, rule.target, rule.threshold, metadataURI);
    }

    function setRuleStatus(uint256 ruleId, bool enabled) external onlyOwner {
        BadgeRule storage rule = _rules[ruleId];
        if (rule.ruleId == 0) revert RuleNotFound(ruleId);
        if (rule.enabled == enabled) return;
        rule.enabled = enabled;
        emit BadgeRuleStatusChanged(ruleId, enabled);
    }

    function getRule(uint256 ruleId) external view returns (BadgeRule memory) {
        BadgeRule memory rule = _rules[ruleId];
        if (rule.ruleId == 0) revert RuleNotFound(ruleId);
        return rule;
    }

    function ruleExists(uint256 ruleId) external view returns (bool) {
        return _rules[ruleId].ruleId != 0;
    }

    function ruleCount() external view returns (uint256) {
        return _ruleIds.length;
    }

    function ruleIdAt(uint256 index) external view returns (uint256) {
        require(index < _ruleIds.length, "BadgeRuleRegistry: index out of bounds");
        return _ruleIds[index];
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "./utils/Ownable.sol";
import {IdentityToken} from "./IdentityToken.sol";
import {ReputationBadge} from "./ReputationBadge.sol";
import {BadgeRuleRegistry} from "./BadgeRuleRegistry.sol";

/// @title ReputationController
/// @notice Provides shared helpers for marketplace-style contracts that mint identities and badges.
abstract contract ReputationController is Ownable {
    IdentityToken public identityToken;
    ReputationBadge public reputationBadge;
    BadgeRuleRegistry public badgeRuleRegistry;

    event BadgeAwarded(address indexed account, uint256 indexed ruleId);

    constructor(IdentityToken identityToken_, ReputationBadge reputationBadge_, BadgeRuleRegistry badgeRuleRegistry_) {
        identityToken = identityToken_;
        reputationBadge = reputationBadge_;
        badgeRuleRegistry = badgeRuleRegistry_;
    }

    function _ensureIdentity(address account, string memory metadataURI) internal {
        if (!identityToken.hasIdentity(account)) {
            identityToken.attest(account, metadataURI);
        }
    }

    function _awardBadge(address account, BadgeRuleRegistry.BadgeRule memory rule) internal {
        if (!reputationBadge.hasBadge(account, rule.ruleId)) {
            reputationBadge.issueBadge(account, rule.ruleId, rule.metadataURI);
            emit BadgeAwarded(account, rule.ruleId);
        }
    }

    function _setBadgeContract(ReputationBadge newBadge) internal {
        require(address(newBadge) != address(0), "ReputationController: zero badge");
        reputationBadge = newBadge;
    }

    function _setBadgeRuleRegistry(BadgeRuleRegistry newRegistry) internal {
        require(address(newRegistry) != address(0), "ReputationController: zero registry");
        badgeRuleRegistry = newRegistry;
    }
}

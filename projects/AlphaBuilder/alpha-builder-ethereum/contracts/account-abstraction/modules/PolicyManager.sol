// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../libraries/AlphaErrors.sol";

abstract contract PolicyManager {
    struct Policy {
        address target;
        uint256 maxValue;
        uint48 validAfter;
        uint48 validUntil;
        bytes4 selector;
        bool enforceValue;
        bool allowDelegateCall;
        bool allowModule;
    }

    mapping(bytes32 => Policy) internal _policies;

    event PolicySet(bytes32 indexed policyId, address indexed target, bytes4 selector, uint256 maxValue);
    event PolicyCleared(bytes32 indexed policyId);

    function _setPolicy(bytes32 policyId, Policy memory policy) internal {
        if (policy.target == address(0)) {
            revert AlphaErrors.ZeroAddress();
        }
        _policies[policyId] = policy;
        emit PolicySet(policyId, policy.target, policy.selector, policy.maxValue);
    }

    function _clearPolicy(bytes32 policyId) internal {
        delete _policies[policyId];
        emit PolicyCleared(policyId);
    }

    function _enforcePolicy(
        bytes32 policyId,
        address target,
        uint256 value,
        bytes4 selector,
        bool viaModule
    ) internal view returns (bool) {
        Policy memory policy = _policies[policyId];
        if (policy.target == address(0)) {
            return false;
        }

        if (policy.target != target) {
            revert AlphaErrors.PolicyViolation();
        }
        if (policy.selector != bytes4(0) && policy.selector != selector) {
            revert AlphaErrors.PolicyViolation();
        }
        if (policy.enforceValue && value > policy.maxValue) {
            revert AlphaErrors.PolicyViolation();
        }
        if (!policy.allowModule && viaModule) {
            revert AlphaErrors.PolicyViolation();
        }
        uint48 nowTs = uint48(block.timestamp);
        if (policy.validAfter != 0 && nowTs < policy.validAfter) {
            revert AlphaErrors.PolicyViolation();
        }
        if (policy.validUntil != 0 && nowTs > policy.validUntil) {
            revert AlphaErrors.PolicyViolation();
        }

        return true;
    }

    function _policy(bytes32 policyId) internal view returns (Policy memory) {
        return _policies[policyId];
    }

    function _policyExists(bytes32 policyId) internal view returns (bool) {
        return _policies[policyId].target != address(0);
    }
}


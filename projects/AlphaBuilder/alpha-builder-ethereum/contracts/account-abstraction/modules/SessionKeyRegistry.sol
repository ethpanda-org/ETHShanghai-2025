// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../libraries/AlphaErrors.sol";

abstract contract SessionKeyRegistry {
    using EnumerableSet for EnumerableSet.Bytes32Set;

    struct SessionKeyInfo {
        uint48 validAfter;
        uint48 validUntil;
        uint32 callLimit;
        uint32 callsExecuted;
        uint96 valueLimit;
        uint96 valueSpent;
        bytes32 policyId;
        bool enforcePolicy;
        bool strictSelectors;
    }

    mapping(address => SessionKeyInfo) internal _sessionKeys;
    mapping(address => EnumerableSet.Bytes32Set) internal _sessionKeySelectors;

    event SessionKeyRegistered(
        address indexed key,
        uint48 validAfter,
        uint48 validUntil,
        uint32 callLimit,
        uint96 valueLimit,
        bool enforcePolicy,
        bytes32 policyId
    );
    event SessionKeyRevoked(address indexed key);
    event SessionKeySelectorUpdated(address indexed key, bytes4 selector, bool allowed);

    function _registerSessionKey(
        address key,
        SessionKeyInfo memory info,
        bytes4[] calldata selectors
    ) internal {
        if (key == address(0)) {
            revert AlphaErrors.ZeroAddress();
        }
        _sessionKeys[key] = info;

        EnumerableSet.Bytes32Set storage selectorSet = _sessionKeySelectors[key];
        for (uint256 i = 0; i < selectors.length; i++) {
            selectorSet.add(bytes32(selectors[i]));
            emit SessionKeySelectorUpdated(key, selectors[i], true);
        }

        emit SessionKeyRegistered(
            key,
            info.validAfter,
            info.validUntil,
            info.callLimit,
            info.valueLimit,
            info.enforcePolicy,
            info.policyId
        );
    }

    function _updateSessionKeySelectors(address key, bytes4 selector, bool allowed) internal {
        if (_sessionKeys[key].validUntil == 0) {
            revert AlphaErrors.SessionKeyNotFound();
        }

        EnumerableSet.Bytes32Set storage selectorSet = _sessionKeySelectors[key];
        if (allowed) {
            selectorSet.add(bytes32(selector));
        } else {
            selectorSet.remove(bytes32(selector));
        }
        emit SessionKeySelectorUpdated(key, selector, allowed);
    }

    function _revokeSessionKey(address key) internal {
        if (_sessionKeys[key].validUntil == 0) {
            revert AlphaErrors.SessionKeyNotFound();
        }
        delete _sessionKeys[key];

        EnumerableSet.Bytes32Set storage selectorSet = _sessionKeySelectors[key];
        while (selectorSet.length() > 0) {
            selectorSet.remove(selectorSet.at(0));
        }

        emit SessionKeyRevoked(key);
    }

    function _sessionKeyInfo(address key) internal view returns (SessionKeyInfo memory) {
        return _sessionKeys[key];
    }

    function _sessionKeyAllows(address key, bytes4 selector) internal view returns (bool) {
        SessionKeyInfo memory info = _sessionKeys[key];
        if (info.validUntil == 0) {
            return false;
        }
        if (!info.strictSelectors) {
            return true;
        }
        return _sessionKeySelectors[key].contains(bytes32(selector));
    }

    function _validateAndConsumeSessionKey(
        address key,
        uint256 value
    ) internal returns (SessionKeyInfo memory info) {
        info = _sessionKeys[key];
        if (info.validUntil == 0) {
            revert AlphaErrors.SessionKeyNotFound();
        }
        if (block.timestamp < info.validAfter) {
            revert AlphaErrors.SessionKeyNotYetValid();
        }
        if (info.validUntil != 0 && block.timestamp > info.validUntil) {
            revert AlphaErrors.SessionKeyExpired();
        }

        if (info.callLimit != 0) {
            if (info.callsExecuted >= info.callLimit) {
                revert AlphaErrors.SessionKeyLimitExceeded();
            }
            unchecked {
                info.callsExecuted += 1;
            }
        }

        if (info.valueLimit != 0) {
            if (info.valueSpent + value > info.valueLimit) {
                revert AlphaErrors.SessionKeyLimitExceeded();
            }
            unchecked {
                info.valueSpent += uint96(value);
            }
        }

        _sessionKeys[key] = info;
    }

    function _sessionKeySelectorCount(address key) internal view returns (uint256) {
        return _sessionKeySelectors[key].length();
    }

    function _sessionKeySelectorAt(address key, uint256 index) internal view returns (bytes4) {
        return bytes4(_sessionKeySelectors[key].at(index));
    }
}


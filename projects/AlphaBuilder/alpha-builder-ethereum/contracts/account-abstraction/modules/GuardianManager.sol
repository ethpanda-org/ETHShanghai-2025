// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "../libraries/AlphaErrors.sol";

abstract contract GuardianManager {
    using EnumerableSet for EnumerableSet.AddressSet;

    struct RecoveryRequest {
        address proposedOwner;
        uint48 executeAfter;
        uint32 approvals;
        bool executed;
    }

    EnumerableSet.AddressSet internal _guardianSet;
    uint256 internal _guardianThreshold;
    uint48 internal _recoveryDelay;

    mapping(bytes32 => RecoveryRequest) internal _recoveryRequests;
    mapping(bytes32 => mapping(address => bool)) internal _recoveryApprovals;

    event GuardianAdded(address indexed guardian);
    event GuardianRemoved(address indexed guardian);
    event GuardianThresholdUpdated(uint256 newThreshold);
    event RecoveryDelayUpdated(uint48 newDelay);
    event RecoveryRequested(bytes32 indexed recoveryId, address indexed proposedOwner, uint48 executeAfter);
    event RecoveryApproved(bytes32 indexed recoveryId, address indexed guardian, uint32 approvals);
    event RecoveryCancelled(bytes32 indexed recoveryId);
    event RecoveryExecuted(bytes32 indexed recoveryId, address indexed newOwner);

    modifier onlyGuardian() {
        if (!_guardianSet.contains(msg.sender)) {
            revert AlphaErrors.GuardianNotFound();
        }
        _;
    }

    function _addGuardian(address guardian) internal {
        if (guardian == address(0)) {
            revert AlphaErrors.ZeroAddress();
        }
        if (!_guardianSet.add(guardian)) {
            revert AlphaErrors.GuardianAlreadyAdded();
        }
        emit GuardianAdded(guardian);
        if (_guardianThreshold == 0) {
            _guardianThreshold = 1;
            emit GuardianThresholdUpdated(1);
        }
    }

    function _removeGuardian(address guardian) internal {
        if (!_guardianSet.remove(guardian)) {
            revert AlphaErrors.GuardianNotFound();
        }
        emit GuardianRemoved(guardian);
        if (_guardianThreshold > _guardianSet.length()) {
            _guardianThreshold = _guardianSet.length();
            emit GuardianThresholdUpdated(_guardianThreshold);
        }
    }

    function _setGuardianThreshold(uint256 threshold) internal {
        uint256 guardians = _guardianSet.length();
        if (threshold == 0 || threshold > guardians) {
            revert AlphaErrors.InvalidThreshold();
        }
        _guardianThreshold = threshold;
        emit GuardianThresholdUpdated(threshold);
    }

    function _setRecoveryDelay(uint48 newDelay) internal {
        _recoveryDelay = newDelay;
        emit RecoveryDelayUpdated(newDelay);
    }

    function _guardianCount() internal view returns (uint256) {
        return _guardianSet.length();
    }

    function _guardianAt(uint256 index) internal view returns (address) {
        return _guardianSet.at(index);
    }

    function _isGuardian(address guardian) internal view returns (bool) {
        return _guardianSet.contains(guardian);
    }

    function _guardianThresholdValue() internal view returns (uint256) {
        return _guardianThreshold;
    }

    function _recoveryDelayValue() internal view returns (uint48) {
        return _recoveryDelay;
    }

    function _recoveryRequest(bytes32 recoveryId) internal view returns (RecoveryRequest memory) {
        return _recoveryRequests[recoveryId];
    }

    function _initiateRecovery(address proposedOwner, bytes32 salt) internal returns (bytes32 recoveryId) {
        if (proposedOwner == address(0)) {
            revert AlphaErrors.ZeroAddress();
        }
        recoveryId = keccak256(abi.encodePacked(address(this), proposedOwner, salt, block.chainid));
        RecoveryRequest storage request = _recoveryRequests[recoveryId];
        if (request.executeAfter != 0 && !request.executed) {
            revert AlphaErrors.RecoveryAlreadyPending();
        }

        request.proposedOwner = proposedOwner;
        request.executeAfter = uint48(block.timestamp) + (_recoveryDelay == 0 ? 1 hours : _recoveryDelay);
        request.approvals = 0;
        request.executed = false;

        emit RecoveryRequested(recoveryId, proposedOwner, request.executeAfter);
    }

    function _ackGuardianApproval(bytes32 recoveryId, address guardian) internal returns (uint32 approvals) {
        RecoveryRequest storage request = _recoveryRequests[recoveryId];
        if (request.executeAfter == 0 || request.executed) {
            revert AlphaErrors.RecoveryNotPending();
        }
        if (_recoveryApprovals[recoveryId][guardian]) {
            return request.approvals;
        }

        _recoveryApprovals[recoveryId][guardian] = true;
        request.approvals += 1;
        approvals = request.approvals;

        emit RecoveryApproved(recoveryId, guardian, approvals);

        if (approvals >= _guardianThreshold && block.timestamp >= request.executeAfter) {
            request.executed = true;
            _finalizeRecovery(recoveryId, request.proposedOwner);
            emit RecoveryExecuted(recoveryId, request.proposedOwner);
        }
    }

    function _cancelRecovery(bytes32 recoveryId) internal {
        RecoveryRequest storage request = _recoveryRequests[recoveryId];
        if (request.executeAfter == 0 || request.executed) {
            revert AlphaErrors.RecoveryNotPending();
        }

        delete _recoveryRequests[recoveryId];
        emit RecoveryCancelled(recoveryId);
    }

    function _finalizeRecovery(bytes32 recoveryId, address newOwner) internal virtual;
}

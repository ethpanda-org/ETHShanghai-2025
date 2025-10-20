// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library AlphaErrors {
    error ZeroAddress();
    error InvalidThreshold();
    error OwnerExists();
    error OwnerDoesNotExist();
    error SignatureValidationFailed();
    error ModuleAlreadyInstalled();
    error ModuleNotInstalled();
    error ModuleExecutionDenied();
    error SessionKeyNotFound();
    error SessionKeyExpired();
    error SessionKeyNotYetValid();
    error SessionKeyLimitExceeded();
    error PolicyViolation();
    error GuardianAlreadyAdded();
    error GuardianNotFound();
    error GuardianThresholdNotMet();
    error RecoveryAlreadyPending();
    error RecoveryNotPending();
    error RecoveryTimelockActive();
    error CallerNotEntryPoint();
    error CallerNotSelf();
    error CallerNotOwner(address caller);
    error BatchLengthMismatch();
}


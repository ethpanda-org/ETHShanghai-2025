// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

import "./interfaces/IEntryPoint.sol";
import "./libraries/AlphaErrors.sol";
import "./libraries/SignatureValidator.sol";
import "./modules/GuardianManager.sol";
import "./modules/ModuleManager.sol";
import "./modules/IAAWalletModule.sol";
import "./modules/PolicyManager.sol";
import "./modules/SessionKeyRegistry.sol";
import "./types/UserOperation.sol";

/**
 * @title AlphaAAWallet
 * @notice Highly opinionated AA wallet referencing EIP-4337 patterns.
 *         The wallet is deliberately feature-heavy to exercise module orchestration,
 *         policy enforcement and multi-tier authentication (owners, guardians, session keys, modules).
 */
contract AlphaAAWallet is
    IERC1271,
    GuardianManager,
    ModuleManager,
    PolicyManager,
    SessionKeyRegistry
{
    using Address for address;
    using EnumerableSet for EnumerableSet.AddressSet;

    struct OwnerConfig {
        uint32 weight;
        uint48 addedAt;
    }

    struct Call {
        address target;
        uint256 value;
        bytes data;
    }

    IEntryPoint public immutable entryPoint;

    EnumerableSet.AddressSet private _ownerSet;
    mapping(address => OwnerConfig) private _ownerConfigs;
    mapping(uint192 => uint64) private _nonceTable;

    uint32 public ownerThreshold;
    uint32 private _totalOwnerWeight;

    uint256 internal constant VALIDATION_FAILED = 1;

    bytes4 internal constant MAGIC1271_VALUE = 0x1626ba7e;
    bytes4 internal constant EXECUTE_SELECTOR = bytes4(keccak256("execute(address,uint256,bytes)"));
    bytes4 internal constant EXECUTE_BATCH_SELECTOR =
        bytes4(keccak256("executeBatch((address,uint256,bytes)[])"));

    event OwnerAdded(address indexed owner, uint32 weight);
    event OwnerRemoved(address indexed owner);
    event OwnerWeightUpdated(address indexed owner, uint32 oldWeight, uint32 newWeight);
    event OwnerThresholdUpdated(uint32 newThreshold);
    event NonceIncremented(uint192 indexed key, uint64 newSequence);
    event ModuleExecuted(address indexed module, address indexed target, uint256 value, bytes data, bytes result);
    event PolicyConsumed(bytes32 indexed policyId, address indexed target, bytes4 selector, uint256 value);

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) {
            revert AlphaErrors.CallerNotEntryPoint();
        }
        _;
    }

    modifier onlySelf() {
        if (msg.sender != address(this)) {
            revert AlphaErrors.CallerNotSelf();
        }
        _;
    }

    constructor(
        IEntryPoint _entryPoint,
        address[] memory initialOwners,
        uint32[] memory ownerWeights,
        uint32 threshold,
        address[] memory guardians,
        uint256 guardianThreshold,
        uint48 recoveryDelay
    ) {
        require(address(_entryPoint) != address(0), "AlphaAAWallet: entry point required");
        if (initialOwners.length == 0 || initialOwners.length != ownerWeights.length) {
            revert AlphaErrors.InvalidThreshold();
        }

        entryPoint = _entryPoint;

        for (uint256 i = 0; i < initialOwners.length; i++) {
            _addOwnerInternal(initialOwners[i], ownerWeights[i]);
        }

        _setOwnerThreshold(threshold);

        for (uint256 j = 0; j < guardians.length; j++) {
            _addGuardian(guardians[j]);
        }
        if (guardianThreshold > 0 && guardianThreshold <= guardians.length) {
            _setGuardianThreshold(guardianThreshold);
        } else if (guardians.length > 0) {
            _setGuardianThreshold(1);
        }
        _setRecoveryDelay(recoveryDelay == 0 ? 48 hours : recoveryDelay);
    }

    receive() external payable {}

    /*//////////////////////////////////////////////////////////////
                                EXECUTION
    //////////////////////////////////////////////////////////////*/

    function execute(address target, uint256 value, bytes calldata data)
        external
        payable
        onlyEntryPoint
        returns (bytes memory result)
    {
        result = _executeCall(target, value, data, false);
    }

    function executeBatch(Call[] calldata calls) external payable onlyEntryPoint returns (bytes[] memory results) {
        uint256 length = calls.length;
        if (length == 0) {
            return new bytes[](0);
        }
        results = new bytes[](length);
        for (uint256 i = 0; i < length; i++) {
            Call calldata callData = calls[i];
            results[i] = _executeCall(callData.target, callData.value, callData.data, false);
        }
    }

    function executeFromModule(address target, uint256 value, bytes calldata data)
        external
        returns (bytes memory result)
    {
        if (!_isExecutionModule(msg.sender)) {
            revert AlphaErrors.ModuleExecutionDenied();
        }
        result = _executeCall(target, value, data, true);
        emit ModuleExecuted(msg.sender, target, value, data, result);
    }

    function installModule(
        address module,
        bool allowValidation,
        bool allowExecution,
        uint96 version,
        bytes calldata hookData
    ) external onlySelf {
        _installModule(module, allowValidation, allowExecution, version, hookData);
    }

    function uninstallModule(address module, bytes calldata hookData) external onlySelf {
        _uninstallModule(module, hookData);
    }

    function updateModuleFlags(address module, bool allowValidation, bool allowExecution) external onlySelf {
        _setModuleFlags(module, allowValidation, allowExecution);
    }

    /*//////////////////////////////////////////////////////////////
                              OWNER MANAGEMENT
    //////////////////////////////////////////////////////////////*/

    function addOwner(address owner, uint32 weight) external onlySelf {
        _addOwnerInternal(owner, weight);
    }

    function removeOwner(address owner) external onlySelf {
        _removeOwnerInternal(owner);
    }

    function updateOwnerWeight(address owner, uint32 newWeight) external onlySelf {
        _updateOwnerWeight(owner, newWeight);
    }

    function setOwnerThreshold(uint32 newThreshold) external onlySelf {
        _setOwnerThreshold(newThreshold);
    }

    function ownerCount() external view returns (uint256) {
        return _ownerSet.length();
    }

    function ownerAt(uint256 index) external view returns (address) {
        return _ownerSet.at(index);
    }

    function ownerInfo(address owner) external view returns (OwnerConfig memory) {
        return _ownerConfigs[owner];
    }

    /*//////////////////////////////////////////////////////////////
                              GUARDIANS
    //////////////////////////////////////////////////////////////*/

    function addGuardian(address guardian) external onlySelf {
        _addGuardian(guardian);
    }

    function removeGuardian(address guardian) external onlySelf {
        _removeGuardian(guardian);
    }

    function setGuardianThreshold(uint256 threshold) external onlySelf {
        _setGuardianThreshold(threshold);
    }

    function setRecoveryDelay(uint48 newDelay) external onlySelf {
        _setRecoveryDelay(newDelay);
    }

    function initiateRecovery(address proposedOwner, bytes32 salt) external onlyGuardian returns (bytes32 recoveryId) {
        recoveryId = _initiateRecovery(proposedOwner, salt);
    }

    function approveRecovery(bytes32 recoveryId) external onlyGuardian {
        _ackGuardianApproval(recoveryId, msg.sender);
    }

    function cancelRecovery(bytes32 recoveryId) external onlySelf {
        _cancelRecovery(recoveryId);
    }

    /*//////////////////////////////////////////////////////////////
                              SESSION KEYS
    //////////////////////////////////////////////////////////////*/

    function registerSessionKey(
        address key,
        SessionKeyInfo memory info,
        bytes4[] calldata selectors
    ) external onlySelf {
        _registerSessionKey(key, info, selectors);
    }

    function updateSessionKeySelector(address key, bytes4 selector, bool allowed) external onlySelf {
        _updateSessionKeySelectors(key, selector, allowed);
    }

    function revokeSessionKey(address key) external onlySelf {
        _revokeSessionKey(key);
    }

    /*//////////////////////////////////////////////////////////////
                                 POLICY
    //////////////////////////////////////////////////////////////*/

    function setPolicy(bytes32 policyId, Policy memory policy) external onlySelf {
        _setPolicy(policyId, policy);
    }

    function clearPolicy(bytes32 policyId) external onlySelf {
        _clearPolicy(policyId);
    }

    /*//////////////////////////////////////////////////////////////
                               ENTRYPOINT API
    //////////////////////////////////////////////////////////////*/

    function addDeposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function withdrawDepositTo(address payable recipient, uint256 amount) external onlySelf {
        entryPoint.withdrawTo(recipient, amount);
    }

    function getNonce(uint192 key) external view returns (uint256) {
        return (uint256(key) << 64) | _nonceTable[key];
    }

    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        _validateNonce(userOp.nonce);

        Call[] memory decodedCalls = _decodeCallData(userOp.callData);
        (SignatureValidator.SignatureKind kind, bytes calldata payload) = SignatureValidator.readKind(
            userOp.signature
        );

        bytes32 digest = userOpHash;
        bool handled;
        uint32 collectedWeight;

        if (kind == SignatureValidator.SignatureKind.OWNER) {
            SignatureValidator.OwnerSignature[] memory ownerSigs = SignatureValidator.decodeOwners(payload);
            (handled, collectedWeight) = _validateOwners(digest, ownerSigs);
            require(collectedWeight >= ownerThreshold, "AlphaAAWallet: threshold not met");
        } else if (kind == SignatureValidator.SignatureKind.MODULE) {
            validationData = _validateModuleSignature(userOp, userOpHash, payload);
            handled = true;
        } else if (kind == SignatureValidator.SignatureKind.SESSION_KEY) {
            validationData = _validateSessionKeySignature(digest, decodedCalls, payload);
            handled = true;
        } else if (kind == SignatureValidator.SignatureKind.GUARDIAN) {
            SignatureValidator.GuardianSignature[] memory guardianSigs = SignatureValidator.decodeGuardians(payload);
            handled = _validateGuardianSignatures(digest, guardianSigs);
        } else {
            revert AlphaErrors.SignatureValidationFailed();
        }

        if (!handled) {
            return VALIDATION_FAILED;
        }

        _consumeNonce(userOp.nonce);

        if (missingAccountFunds > 0) {
            entryPoint.depositTo{value: missingAccountFunds}(address(this));
        }

        return validationData;
    }

    /*//////////////////////////////////////////////////////////////
                               ERC-1271
    //////////////////////////////////////////////////////////////*/

    function isValidSignature(bytes32 hash, bytes memory signature) external view override returns (bytes4) {
        (SignatureValidator.SignatureKind kind, bytes memory payload) = SignatureValidator.readKind(signature);
        bool valid;
        if (kind == SignatureValidator.SignatureKind.OWNER) {
            (valid, ) = _isOwnerSignature(hash, payload);
        } else if (kind == SignatureValidator.SignatureKind.GUARDIAN) {
            valid = _isGuardianSignature(hash, payload);
        } else {
            valid = false;
        }
        return valid ? MAGIC1271_VALUE : bytes4(0);
    }

    /*//////////////////////////////////////////////////////////////
                              INTERNAL LOGIC
    //////////////////////////////////////////////////////////////*/

    function _finalizeRecovery(bytes32, address newOwner) internal override {
        if (!_ownerSet.contains(newOwner)) {
            _addOwnerInternal(newOwner, 1);
        }
    }

    function _executeCall(address target, uint256 value, bytes memory data, bool viaModule)
        internal
        returns (bytes memory result)
    {
        require(target != address(0), "AlphaAAWallet: invalid target");

        (bool success, bytes memory returndata) = target.call{value: value}(data);
        if (!success) {
            _revertWithData(returndata);
        }

        bytes4 selector = data.length >= 4 ? bytes4(data[0:4]) : bytes4(0);
        if (_policyExists(bytes32(0)) || _policyExists(bytes32(uint256(selector)))) {
            bytes32 policyId = _policyExists(bytes32(uint256(selector)))
                ? bytes32(uint256(selector))
                : bytes32(0);
            if (_policyExists(policyId)) {
                _enforcePolicy(policyId, target, value, selector, viaModule);
                emit PolicyConsumed(policyId, target, selector, value);
            }
        }

        return returndata;
    }

    function _addOwnerInternal(address owner, uint32 weight) internal {
        if (owner == address(0)) {
            revert AlphaErrors.ZeroAddress();
        }
        if (weight == 0) {
            revert AlphaErrors.InvalidThreshold();
        }
        if (!_ownerSet.add(owner)) {
            revert AlphaErrors.OwnerExists();
        }
        _ownerConfigs[owner] = OwnerConfig({weight: weight, addedAt: uint48(block.timestamp)});
        _totalOwnerWeight += weight;
        emit OwnerAdded(owner, weight);
    }

    function _removeOwnerInternal(address owner) internal {
        if (!_ownerSet.remove(owner)) {
            revert AlphaErrors.OwnerDoesNotExist();
        }
        uint32 weight = _ownerConfigs[owner].weight;
        _totalOwnerWeight -= weight;
        delete _ownerConfigs[owner];
        if (ownerThreshold > _totalOwnerWeight) {
            ownerThreshold = _totalOwnerWeight;
            emit OwnerThresholdUpdated(ownerThreshold);
        }
        emit OwnerRemoved(owner);
    }

    function _updateOwnerWeight(address owner, uint32 newWeight) internal {
        if (!_ownerSet.contains(owner)) {
            revert AlphaErrors.OwnerDoesNotExist();
        }
        if (newWeight == 0) {
            revert AlphaErrors.InvalidThreshold();
        }
        OwnerConfig storage config = _ownerConfigs[owner];
        uint32 oldWeight = config.weight;
        _totalOwnerWeight = _totalOwnerWeight - oldWeight + newWeight;
        config.weight = newWeight;
        emit OwnerWeightUpdated(owner, oldWeight, newWeight);
    }

    function _setOwnerThreshold(uint32 newThreshold) internal {
        if (newThreshold == 0 || newThreshold > _totalOwnerWeight) {
            revert AlphaErrors.InvalidThreshold();
        }
        ownerThreshold = newThreshold;
        emit OwnerThresholdUpdated(newThreshold);
    }

    function _validateNonce(uint256 nonce) internal view {
        uint192 key = uint192(nonce >> 64);
        uint64 sequence = uint64(nonce);
        if (_nonceTable[key] != sequence) {
            revert("AlphaAAWallet: invalid nonce");
        }
    }

    function _consumeNonce(uint256 nonce) internal {
        uint192 key = uint192(nonce >> 64);
        uint64 sequence = uint64(nonce);
        uint64 newSequence = sequence + 1;
        _nonceTable[key] = newSequence;
        emit NonceIncremented(key, newSequence);
    }

    function _validateOwners(bytes32 digest, SignatureValidator.OwnerSignature[] memory ownerSigs)
        internal
        view
        returns (bool, uint32 collectedWeight)
    {
        uint256 length = ownerSigs.length;
        for (uint256 i = 0; i < length; i++) {
            SignatureValidator.OwnerSignature memory ownerSig = ownerSigs[i];
            address signer = SignatureValidator.recoverSigner(digest, ownerSig.signature);
            if (signer != ownerSig.signer) {
                return (false, 0);
            }
            OwnerConfig memory config = _ownerConfigs[signer];
            if (config.weight == 0) {
                return (false, 0);
            }
            collectedWeight += config.weight;
            for (uint256 j = 0; j < i; j++) {
                if (ownerSigs[j].signer == signer) {
                    return (false, 0);
                }
            }
        }
        return (collectedWeight >= ownerThreshold, collectedWeight);
    }

    function _validateModuleSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        bytes calldata payload
    ) internal view returns (uint256 validationData) {
        SignatureValidator.ModuleSignature memory moduleSig = SignatureValidator.decodeModule(payload);
        if (!_isInstalled(moduleSig.module) || !_isValidationModule(moduleSig.module)) {
            revert AlphaErrors.ModuleNotInstalled();
        }
        return IAAWalletModule(moduleSig.module).validateUserOp(userOp, userOpHash, moduleSig.signature);
    }

    function _validateSessionKeySignature(
        bytes32 digest,
        Call[] memory calls,
        bytes calldata payload
    ) internal returns (uint256 validationData) {
        SignatureValidator.SessionKeySignature memory sessionSig = SignatureValidator.decodeSessionKey(payload);
        address recovered = SignatureValidator.recoverSigner(digest, sessionSig.signature);
        if (recovered != sessionSig.key) {
            revert AlphaErrors.SignatureValidationFailed();
        }

        uint256 totalValue;
        for (uint256 i = 0; i < calls.length; i++) {
            totalValue += calls[i].value;
            bytes4 selector = calls[i].data.length >= 4 ? bytes4(calls[i].data[0:4]) : bytes4(0);
            if (!_sessionKeyAllows(sessionSig.key, selector)) {
                revert AlphaErrors.PolicyViolation();
            }
        }

        SessionKeyInfo memory info = _validateAndConsumeSessionKey(sessionSig.key, totalValue);

        bytes32 policyId = sessionSig.policyId != bytes32(0) ? sessionSig.policyId : info.policyId;
        if (policyId != bytes32(0)) {
            for (uint256 j = 0; j < calls.length; j++) {
                bytes4 selector = calls[j].data.length >= 4 ? bytes4(calls[j].data[0:4]) : bytes4(0);
                _enforcePolicy(policyId, calls[j].target, calls[j].value, selector, false);
                emit PolicyConsumed(policyId, calls[j].target, selector, calls[j].value);
            }
        }

        validationData = _packValidationData(info.validAfter, info.validUntil);
    }

    function _validateGuardianSignatures(bytes32 digest, SignatureValidator.GuardianSignature[] memory guardianSigs)
        internal
        view
        returns (bool)
    {
        uint32 approvals;
        for (uint256 i = 0; i < guardianSigs.length; i++) {
            SignatureValidator.GuardianSignature memory guardianSig = guardianSigs[i];
            address recovered = SignatureValidator.recoverSigner(digest, guardianSig.signature);
            if (recovered != guardianSig.guardian || !_isGuardian(recovered)) {
                return false;
            }
            approvals += guardianSig.weight == 0 ? 1 : guardianSig.weight;
        }
        return approvals >= _guardianThresholdValue();
    }

    function _isOwnerSignature(bytes32 digest, bytes memory payload) internal view returns (bool valid, uint32 weight) {
        SignatureValidator.OwnerSignature[] memory ownerSigs = SignatureValidator.decodeOwners(payload);
        (valid, weight) = _validateOwners(digest, ownerSigs);
    }

    function _isGuardianSignature(bytes32 digest, bytes memory payload) internal view returns (bool) {
        SignatureValidator.GuardianSignature[] memory guardianSigs = SignatureValidator.decodeGuardians(payload);
        return _validateGuardianSignatures(digest, guardianSigs);
    }

    function _decodeCallData(bytes calldata callData) internal pure returns (Call[] memory calls) {
        if (callData.length < 4) {
            revert AlphaErrors.PolicyViolation();
        }

        bytes4 selector = bytes4(callData[0:4]);
        if (selector == EXECUTE_SELECTOR) {
            (address target, uint256 value, bytes memory data) =
                abi.decode(callData[4:], (address, uint256, bytes));
            calls = new Call[](1);
            calls[0] = Call(target, value, data);
        } else if (selector == EXECUTE_BATCH_SELECTOR) {
            Call[] memory batch = abi.decode(callData[4:], (Call[]));
            calls = batch;
        } else {
            revert AlphaErrors.PolicyViolation();
        }
    }

    function _packValidationData(uint48 validAfter, uint48 validUntil) internal pure returns (uint256) {
        return (uint256(validUntil) << 160) | (uint256(validAfter) << 128);
    }

    function _revertWithData(bytes memory revertData) internal pure {
        if (revertData.length == 0) {
            revert("AlphaAAWallet: call reverted");
        }
        assembly ("memory-safe") {
            revert(add(revertData, 0x20), mload(revertData))
        }
    }
}

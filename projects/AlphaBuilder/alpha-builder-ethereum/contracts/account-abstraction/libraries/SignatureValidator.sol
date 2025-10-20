// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

import "./AlphaErrors.sol";

library SignatureValidator {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    bytes4 internal constant MAGIC_VALUE = 0x1626ba7e;

    enum SignatureKind {
        OWNER,
        MODULE,
        SESSION_KEY,
        GUARDIAN
    }

    struct OwnerSignature {
        address signer;
        uint32 weight;
        bytes signature;
    }

    struct ModuleSignature {
        address module;
        bytes signature;
    }

    struct GuardianSignature {
        address guardian;
        uint32 weight;
        bytes signature;
    }

    struct SessionKeySignature {
        address key;
        bytes signature;
        bytes32 policyId;
    }

    function readKind(bytes calldata rawSignature)
        internal
        pure
        returns (SignatureKind kind, bytes calldata payload)
    {
        if (rawSignature.length < 1) {
            revert AlphaErrors.SignatureValidationFailed();
        }
        kind = SignatureKind(uint8(rawSignature[0]));
        payload = rawSignature[1:];
    }

    function readKind(bytes memory rawSignature)
        internal
        pure
        returns (SignatureKind kind, bytes memory payload)
    {
        if (rawSignature.length < 1) {
            revert AlphaErrors.SignatureValidationFailed();
        }
        kind = SignatureKind(uint8(rawSignature[0]));
        payload = new bytes(rawSignature.length - 1);
        if (payload.length > 0) {
            for (uint256 i = 0; i < payload.length; i++) {
                payload[i] = rawSignature[i + 1];
            }
        }
    }

    function decodeOwners(bytes calldata payload) internal pure returns (OwnerSignature[] memory owners) {
        owners = abi.decode(payload, (OwnerSignature[]));
        if (owners.length == 0) {
            revert AlphaErrors.SignatureValidationFailed();
        }
    }

    function decodeOwners(bytes memory payload) internal pure returns (OwnerSignature[] memory owners) {
        owners = abi.decode(payload, (OwnerSignature[]));
        if (owners.length == 0) {
            revert AlphaErrors.SignatureValidationFailed();
        }
    }

    function decodeModule(bytes calldata payload) internal pure returns (ModuleSignature memory moduleSig) {
        moduleSig = abi.decode(payload, (ModuleSignature));
        if (moduleSig.module == address(0)) {
            revert AlphaErrors.SignatureValidationFailed();
        }
    }

    function decodeSessionKey(bytes calldata payload)
        internal
        pure
        returns (SessionKeySignature memory sessionSig)
    {
        sessionSig = abi.decode(payload, (SessionKeySignature));
        if (sessionSig.key == address(0)) {
            revert AlphaErrors.SignatureValidationFailed();
        }
    }

    function decodeGuardians(bytes calldata payload)
        internal
        pure
        returns (GuardianSignature[] memory guardians)
    {
        guardians = abi.decode(payload, (GuardianSignature[]));
        if (guardians.length == 0) {
            revert AlphaErrors.SignatureValidationFailed();
        }
    }

    function decodeGuardians(bytes memory payload)
        internal
        pure
        returns (GuardianSignature[] memory guardians)
    {
        guardians = abi.decode(payload, (GuardianSignature[]));
        if (guardians.length == 0) {
            revert AlphaErrors.SignatureValidationFailed();
        }
    }

    function recoverSigner(bytes32 digest, bytes memory signature) internal pure returns (address) {
        (address recovered, ECDSA.RecoverError err, ) = digest.tryRecover(signature);
        if (err != ECDSA.RecoverError.NoError || recovered == address(0)) {
            revert AlphaErrors.SignatureValidationFailed();
        }
        return recovered;
    }

    function toEthSigned(bytes32 hash) internal pure returns (bytes32) {
        return hash.toEthSignedMessageHash();
    }
}


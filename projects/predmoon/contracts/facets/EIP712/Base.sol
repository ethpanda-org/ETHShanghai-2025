// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IEIP712Base} from "./IBase.sol";
import {EIP712Storage} from "./Storage.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

abstract contract EIP712Base is IEIP712Base {
    /**
     * @dev The name parameter for the EIP712 domain.
     *
     * NOTE: By default this function reads _name which is an immutable value.
     * It only reads from storage if necessary (in case the value is too large to fit in a ShortString).
     */
    // solhint-disable-next-line func-name-mixedcase
    function _EIP712Name() internal view returns (string memory) {
        return EIP712Storage.load().eip712Name;
    }

    /**
     * @dev The version parameter for the EIP712 domain.
     *
     * NOTE: By default this function reads _version which is an immutable value.
     * It only reads from storage if necessary (in case the value is too large to fit in a ShortString).
     */
    // solhint-disable-next-line func-name-mixedcase
    function _EIP712Version() internal view returns (string memory) {
        return EIP712Storage.load().eip712Version;
    }

    function _setEIP712Config(string memory name, string memory version) internal {
        EIP712Storage.Storage storage $ = EIP712Storage.load();
        $.eip712Name = name;
        $.eip712Version = version;
        $.cachedDomainSeparator = keccak256(
            abi.encode(
                EIP712Storage.EIP712_DOMAIN_TYPEHASH,
                keccak256(bytes($.eip712Name)),
                keccak256(bytes($.eip712Version)),
                block.chainid,
                address(this)
            )
        );
        emit EIP712ConfigChanged(name, version);
    }

    function _getDigest(bytes32 structHash) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("\x19\x01", EIP712Storage.load().cachedDomainSeparator, structHash));
    }

    function _recoverSigner(bytes32 digest, bytes memory sig) internal pure returns (address) {
        return ECDSA.recover(digest, sig);
    }

    function _verifySignature(address userAddress, bytes memory userSig, bytes memory encodedData) internal view {
        bytes32 digest = _getDigest(keccak256(encodedData));
        address signer = _recoverSigner(digest, userSig);
        if (signer != userAddress) revert VerifySignatureFailed(userAddress, signer);
    }
}

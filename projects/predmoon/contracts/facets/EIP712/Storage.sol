// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library EIP712Storage {
    bytes32 internal constant POSITION = keccak256("EIP712Storage");
    bytes32 constant EIP712_DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    struct Storage {
        string eip712Name;
        string eip712Version;
        bytes32 cachedDomainSeparator;
    }

    function load() internal pure returns (Storage storage $) {
        bytes32 position = POSITION;
        assembly {
            $.slot := position
        }
    }
}

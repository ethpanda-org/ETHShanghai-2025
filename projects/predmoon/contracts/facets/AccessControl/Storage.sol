// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library AccessControlStorage {
    bytes32 internal constant POSITION = keccak256("AccessControlStorage");

    struct Storage {
        mapping(address user => bytes32 roles) userRoles;
        mapping(bytes4 selector => bytes32 roles) functionRoles;
    }

    function load() internal pure returns (Storage storage $) {
        bytes32 position = POSITION;
        assembly {
            $.slot := position
        }
    }
}

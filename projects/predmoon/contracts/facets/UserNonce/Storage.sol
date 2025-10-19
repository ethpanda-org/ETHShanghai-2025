// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library UserNonceStorage {
    bytes32 internal constant POSITION = keccak256("UserNonceStorage");

    struct Storage {
        mapping(address user => mapping(uint256 => bool)) userNonceMap;
    }

    function load() internal pure returns (Storage storage $) {
        bytes32 position = POSITION;
        assembly {
            $.slot := position
        }
    }
}

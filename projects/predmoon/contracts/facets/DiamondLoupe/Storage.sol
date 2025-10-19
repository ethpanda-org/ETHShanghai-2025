// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

library DiamondLoupeStorage {
    bytes32 internal constant POSITION = keccak256("DiamondLoupeStorage");

    struct Storage {
        mapping(bytes4 interfaceId => bool isSupported) supportedInterfaces;
    }

    function load() internal pure returns (Storage storage $) {
        bytes32 position = POSITION;
        assembly {
            $.slot := position
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library ERC1155Storage {
    bytes32 internal constant POSITION = keccak256("ERC1155Storage");

    struct Storage {
        mapping(uint256 => mapping(address => uint256)) _balances;
        mapping(address => mapping(address => bool)) _operatorApprovals;
        mapping(uint256 => uint256) _totalSupply;
        string _baseURI;
        uint256 _idx;
    }

    function load() internal pure returns (Storage storage $) {
        bytes32 position = POSITION;
        assembly {
            $.slot := position
        }
    }
}

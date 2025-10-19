// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

library DiamondCutStorage {
    bytes32 internal constant POSITION = keccak256("DiamondCutStorage");

    struct Storage {
        EnumerableSet.AddressSet facets;
        mapping(bytes4 selector => address facet) selectorToFacet;
        mapping(address facet => EnumerableSet.Bytes32Set selectors) facetSelectors;
    }

    function load() internal pure returns (Storage storage $) {
        bytes32 position = POSITION;
        assembly {
            $.slot := position
        }
    }
}

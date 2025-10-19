// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

interface IDiamondLoupeBase {
    struct Facet {
        address facet;
        bytes4[] selectors;
    }
}

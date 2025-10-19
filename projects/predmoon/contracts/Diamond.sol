// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IDiamond} from "./IDiamond.sol";
import {Proxy} from "@openzeppelin/contracts/proxy/Proxy.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {DiamondCutBase} from "./facets/DiamondCut/Base.sol";
import {DiamondLoupeBase} from "./facets/DiamondLoupe/Base.sol";

abstract contract Diamond is IDiamond, Proxy, DiamondCutBase, DiamondLoupeBase, Initializable {
    constructor(InitParams memory initDiamondCut) initializer {
        _diamondCut(initDiamondCut.baseFacets, initDiamondCut.init, initDiamondCut.initData);
    }

    function _implementation() internal view override returns (address facet) {
        facet = _facetAddress(msg.sig);
        // console.logBytes4(msg.sig);
        // console.log("facet", facet);
        if (facet == address(0)) revert Diamond_UnsupportedFunction();
    }
}

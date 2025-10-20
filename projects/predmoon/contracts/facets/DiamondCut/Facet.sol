// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import {IDiamondCutFacet, IDiamond} from "./IFacet.sol";
import {Facet} from "../../Facet.sol";
import {DiamondCutBase} from "./Base.sol";

contract DiamondCutFacet is IDiamondCutFacet, DiamondCutBase, Facet {
    function DiamondCut_init() external onlyInitializing {
        _addInterface(type(IDiamondCutFacet).interfaceId);
    }

    /// @inheritdoc IDiamondCutFacet
    function diamondCut(
        IDiamond.FacetCut[] memory facetCuts,
        address init,
        bytes memory initData
    ) external onlyDiamondOwner reinitializer(_getInitializedVersion() + 1) {
        _diamondCut(facetCuts, init, initData);
    }
}

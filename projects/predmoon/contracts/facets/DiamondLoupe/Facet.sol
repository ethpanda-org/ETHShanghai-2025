// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import {Facet} from "../../Facet.sol";
import {IERC165, IDiamondLoupeFacet} from "./IFacet.sol";
import {DiamondLoupeBase} from "./Base.sol";

contract DiamondLoupeFacet is IDiamondLoupeFacet, DiamondLoupeBase, Facet {
    function DiamondLoupeFacet_init() external onlyInitializing {
        _addInterface(type(IDiamondLoupeFacet).interfaceId);
        _addInterface(type(IERC165).interfaceId);
    }

    /// @inheritdoc IDiamondLoupeFacet
    function facets() external view returns (Facet[] memory) {
        return _facets();
    }

    /// @inheritdoc IDiamondLoupeFacet
    function facetFunctionSelectors(address facet) external view returns (bytes4[] memory) {
        return _facetSelectors(facet);
    }

    /// @inheritdoc IDiamondLoupeFacet
    function facetAddresses() external view returns (address[] memory) {
        return _facetAddresses();
    }

    /// @inheritdoc IDiamondLoupeFacet
    function facetAddress(bytes4 selector) external view returns (address) {
        return _facetAddress(selector);
    }

    /// @inheritdoc IERC165
    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        return _supportsInterface(interfaceId);
    }
}

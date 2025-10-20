// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Facet} from "../../Facet.sol";
import {IPausableFacet} from "./IFacet.sol";
import {AccessControlBase} from "../AccessControl/Base.sol";

contract PausableFacet is IPausableFacet, AccessControlBase, Facet {
    function PausableFacet_init(uint8 roleA, uint8 roleC) external onlyInitializing {
        _setFunctionAccess(this.unpause.selector, roleA, true);

        _setFunctionAccess(this.pause.selector, roleC, true);
        _addInterface(type(IPausableFacet).interfaceId);
    }

    function pause() external protected {
        _pause();
    }

    function unpause() external protected {
        _unpause();
    }

    function paused() external view returns (bool) {
        return _paused();
    }
}

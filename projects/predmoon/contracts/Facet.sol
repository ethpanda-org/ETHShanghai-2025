// SPDX-License-Identifier: MIT License
pragma solidity 0.8.20;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {DelegateContext} from "./utils/DelegateContext.sol";
import {DiamondLoupeBase} from "./facets/DiamondLoupe/Base.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IAccessControlFacet} from "./facets/AccessControl/IFacet.sol";
import {IOwnable} from "./facets/ownable/IOwnable.sol";
import {Pausable} from "./utils/Pausable.sol";

abstract contract Facet is Initializable, Pausable, ReentrancyGuardUpgradeable, DelegateContext, DiamondLoupeBase {
    error CallerIsNotOwner();
    error CallerIsNotAuthorized();

    constructor() {
        _disableInitializers();
    }

    /// @dev Reverts if the caller is not the owner or does not have role access to the function.
    modifier protected() {
        if (IERC165(address(this)).supportsInterface(type(IAccessControlFacet).interfaceId)) {
            if (!IAccessControlFacet(address(this)).canCall(msg.sender, msg.sig)) {
                revert CallerIsNotAuthorized();
            }
        } else if (msg.sender != IOwnable(address(this)).owner()) {
            revert CallerIsNotOwner();
        }
        _;
    }

    modifier onlyDiamondOwner() {
        if (msg.sender != IOwnable(address(this)).owner()) revert CallerIsNotOwner();
        _;
    }

    modifier onlyDiamondAuthorized() {
        if (!IAccessControlFacet(address(this)).canCall(msg.sender, msg.sig)) revert CallerIsNotAuthorized();
        _;
    }

    // Consider hardcoding interfaceIds in a noDelegateCall function.
    // function supportedInterfaces() public noDelegateCall view virtual returns (bytes4[] memory);
}

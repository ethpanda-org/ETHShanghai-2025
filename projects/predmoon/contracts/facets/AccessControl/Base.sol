// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {IAccessControlBase} from "./IBase.sol";
import {IAccessControlFacet} from "./IFacet.sol";
import {AccessControlStorage} from "./Storage.sol";
import {ROLE_SUPER_ADMIN} from "../../Constants.sol";

abstract contract AccessControlBase is IAccessControlBase {
    modifier onlyAuthorized() {
        if (!_canCall(msg.sender, msg.sig)) revert AccessControl_CallerIsNotAuthorized();
        _;
    }

    function _setFunctionAccess(bytes4 functionSig, uint8 role, bool enabled) internal {
        if (enabled) {
            AccessControlStorage.load().functionRoles[functionSig] |= bytes32(1 << role);
        } else {
            // Revert if removing admin role from access control functions.
            if (
                role == ROLE_SUPER_ADMIN &&
                (functionSig == IAccessControlFacet.setFunctionAccess.selector || functionSig == IAccessControlFacet.setUserRole.selector)
            ) {
                revert AccessControl_CannotRemoveAdmin();
            }

            AccessControlStorage.load().functionRoles[functionSig] &= ~bytes32(1 << role);
        }

        emit FunctionAccessChanged(functionSig, role, enabled);
    }

    function _setUserRole(address user, uint8 role, bool enabled) internal {
        if (enabled) {
            AccessControlStorage.load().userRoles[user] |= bytes32(1 << role);
        } else {
            AccessControlStorage.load().userRoles[user] &= ~bytes32(1 << role);
        }
        emit UserRoleUpdated(user, role, enabled);
    }

    function _canCall(address user, bytes4 functionSig) internal view returns (bool) {
        return (_userRoles(user) & _functionRoles(functionSig) != bytes32(0)) || _hasRole(user, ROLE_SUPER_ADMIN);
    }

    function _userRoles(address user) internal view returns (bytes32) {
        return AccessControlStorage.load().userRoles[user];
    }

    function _functionRoles(bytes4 functionSig) internal view returns (bytes32) {
        return AccessControlStorage.load().functionRoles[functionSig];
    }

    function _hasRole(address user, uint8 role) internal view returns (bool) {
        return _userRoles(user) & bytes32(1 << role) != bytes32(0);
    }

    function _roleHasAccess(uint8 role, bytes4 functionSig) internal view returns (bool) {
        return _functionRoles(functionSig) & bytes32(1 << role) != bytes32(0);
    }
}

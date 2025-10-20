// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IAccessControlBase {
    /// @notice Thrown when removing admin role access from acl functions.
    error AccessControl_CannotRemoveAdmin();

    /// @notice Thrown when a user is not authorized to call a function.
    error AccessControl_CallerIsNotAuthorized();

    /**
     * @notice Emitted when a user role is updated.
     * @param user The user whose role is updated.
     * @param role The role that is updated.
     * @param enabled Whether the role is enabled.
     */
    event UserRoleUpdated(address indexed user, uint8 indexed role, bool enabled);

    /**
     * @notice Emitted when a function access of a given role is changed.
     * @param functionSig The function signature for which access has changed.
     * @param role The role having access to the function.
     * @param enabled Whether the role has access to the function.
     */
    event FunctionAccessChanged(bytes4 indexed functionSig, uint8 indexed role, bool enabled);
}

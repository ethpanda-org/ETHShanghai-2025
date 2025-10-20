/*
 * Copyright 2025 Circle Internet Group, Inc. All rights reserved.

 * SPDX-License-Identifier: GPL-3.0-or-later

 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.

 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */
pragma solidity ^0.8.24;

/**
 * @notice A helper contract for maintaining a denylist.
 */
abstract contract Denylistable {
    address public denylister;
    mapping(address => bool) internal _denylistMapping;
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[48] private __gap;

    event Denylisted(address indexed account);
    event UnDenylisted(address indexed account);
    event DenylisterChanged(address indexed oldDenylister, address indexed newDenylister);

    error UnauthorizedDenylister(address account);
    error AccountDenylisted(address account);
    error InvalidDenylister();

    modifier onlyDenylister() {
        if (msg.sender != denylister) {
            revert UnauthorizedDenylister(msg.sender);
        }
        _;
    }

    /**
     * @dev Throws if argument account is denylisted.
     * @param _account The address to check.
     */
    modifier notDenylisted(address _account) {
        if (_isDenylisted(_account)) {
            revert AccountDenylisted(_account);
        }
        _;
    }

    /**
     * @notice Checks if account is denylisted.
     * @param _account The address to check.
     * @return True if the account is denylisted, false if the account is not denylisted.
     */
    function isDenylisted(address _account) external view returns (bool) {
        return _isDenylisted(_account);
    }

    /**
     * @notice Adds account to denylist.
     * @param _account The address to denylist.
     */
    function denylist(address _account) external onlyDenylister {
        _denylist(_account);
        emit Denylisted(_account);
    }

    /**
     * @notice Removes account from denylist.
     * @param _account The address to remove from the denylist.
     */
    function unDenylist(address _account) external onlyDenylister {
        _unDenylist(_account);
        emit UnDenylisted(_account);
    }

    /**
     * @notice Updates the denylister address.
     * @param _newDenylister The address of the new denylister.
     */
    function updateDenylister(address _newDenylister) external {
        _authorizeUpdateDenylister();
        if (_newDenylister == address(0)) {
            revert InvalidDenylister();
        }
        address oldDenylister = denylister;
        denylister = _newDenylister;
        emit DenylisterChanged(oldDenylister, _newDenylister);
    }

    /**
     * @dev Checks if account is denylisted.
     * @param _account The address to check.
     * @return true if the account is denylisted, false otherwise.
     */
    function _isDenylisted(address _account) internal view virtual returns (bool) {
        return _denylistMapping[_account];
    }

    /**
     * @dev Helper method that denylists an account.
     * @param _account The address to denylist.
     */
    function _denylist(address _account) internal virtual {
        _denylistMapping[_account] = true;
    }

    /**
     * @dev Helper method that undenylists an account.
     * @param _account The address to undenylist.
     */
    function _unDenylist(address _account) internal virtual {
        _denylistMapping[_account] = false;
    }

    function _authorizeUpdateDenylister() internal virtual;
}

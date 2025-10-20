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

import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Address} from "@openzeppelin/contracts/utils/Address.sol";

/**
 * @notice A helper contract for recovering native tokens sent to this address.
 * Based on https://github.com/circlefin/stablecoin-evm/blob/master/contracts/v1.1/Rescuable.sol
 */
abstract contract Rescuable {
    using SafeERC20 for IERC20;

    address public rescuer;
    /**
     * @dev This empty reserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    event NativeTokenRescued(address indexed to, uint256 amount);
    event RescuerChanged(address indexed oldRescuer, address indexed newRescuer);

    error UnauthorizedRescuer(address account);
    error InvalidRescuer();

    modifier onlyRescuer() {
        if (msg.sender != rescuer) {
            revert UnauthorizedRescuer(msg.sender);
        }
        _;
    }

    /**
     * @notice Rescue native tokens locked up in this contract.
     * @param to the recipient address
     * @param amount the native token amount
     */
    function rescueNativeToken(address payable to, uint256 amount) external onlyRescuer {
        emit NativeTokenRescued(to, amount);
        Address.sendValue(to, amount);
    }

    /**
     * @notice Updates the rescuer address.
     * @param newRescuer the new rescuer address.
     */
    function updateRescuer(address newRescuer) external {
        _authorizeUpdateRescuer();
        if (newRescuer == address(0)) {
            revert InvalidRescuer();
        }
        address oldRescuer = rescuer;
        rescuer = newRescuer;
        emit RescuerChanged(oldRescuer, newRescuer);
    }

    function _authorizeUpdateRescuer() internal virtual;
}

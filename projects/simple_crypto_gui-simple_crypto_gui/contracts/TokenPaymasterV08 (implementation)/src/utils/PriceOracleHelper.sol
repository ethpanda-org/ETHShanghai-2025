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

import {IOracle} from "../interfaces/IOracle.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @notice A helper contract for querying prices using an oracle.
 */
abstract contract PriceOracleHelper is Initializable {
    /**
     * @notice The number of decimals actually supported by the token.
     */
    uint8 public immutable tokenDecimals;

    /**
     * @notice An oracle that queries the price of something denominated in token.
     */
    IOracle public oracle;

    /**
     * @notice The number of decimals in the raw oracle's representation of token.
     */
    uint8 public oracleDecimals;

    /**
     * @dev this empty resserved space is put in place to allow future versions to add new
     * variables without shifting down storage in the inheritance chain.
     * See https://docs.openzeppelin.com/contracts/4.x/upgradeable#storage_gaps
     */
    uint256[49] private __gap;

    /**
     * Emitted to note the oracle has been changed
     * @param oldOracle old oracle
     * @param newOracle new oracle
     */
    event OracleChanged(IOracle oldOracle, IOracle newOracle);

    /**
     * @notice Reverts with this error if the returned oracle price is negative or zero.
     * @param oraclePrice the price returned by the oracle.
     */
    error InvalidOraclePrice(int256 oraclePrice);

    /**
     * @notice Reverts if the given oracle is invalid.
     */
    error InvalidOracle();

    constructor(uint8 _tokenDecimals) {
        tokenDecimals = _tokenDecimals;
    }

    // solhint-disable-next-line func-name-mixedcase
    function __PriceOracleHelper_init(IOracle _oracle) internal onlyInitializing {
        oracle = _oracle;
        oracleDecimals = oracle.decimals();
    }

    /**
     * @notice Returns the price of something denominated in token with `tokenDecimals` decimals.
     * @dev If the oracle supports more decimals than token, the extra precision is truncated.
     */
    function fetchPrice() public view returns (uint256 price) {
        (
            /* uint80 roundID */
            ,
            int256 oraclePrice,
            /*uint startedAt*/
            ,
            /*uint timeStamp*/
            ,
            /*uint80 answeredInRound*/
        ) = oracle.latestRoundData();

        if (oraclePrice <= 0) {
            revert InvalidOraclePrice(oraclePrice);
        }

        if (oracleDecimals > tokenDecimals) {
            price = uint256(oraclePrice) / (10 ** uint256(oracleDecimals - tokenDecimals));
        } else {
            price = uint256(oraclePrice) * (10 ** uint256(tokenDecimals - oracleDecimals));
        }
    }

    /**
     * @notice Updates the oracle contract and the oracle decimals.
     * @param newOracle the new oracle contract.
     */
    function updateOracle(IOracle newOracle) external {
        _authorizeUpdateOracle();
        if (address(newOracle) == address(0)) {
            revert InvalidOracle();
        }

        IOracle oldOracle = oracle;
        oracle = newOracle;
        oracleDecimals = oracle.decimals();
        emit OracleChanged(oldOracle, newOracle);
    }

    function _authorizeUpdateOracle() internal virtual;
}

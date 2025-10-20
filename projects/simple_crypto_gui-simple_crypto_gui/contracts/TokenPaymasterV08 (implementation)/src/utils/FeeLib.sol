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
 * @notice A utility library for calculating fees related to token gas costs.
 */
library FeeLib {
    uint256 public constant BIPS_DENOMINATOR = 10000;

    function calculateUserChargeWithSpread(
        uint256 nativeTokenPrice,
        uint256 additionalGasCharge,
        uint256 gasPrice,
        uint256 actualGasCost,
        uint256 spreadBips
    ) internal pure returns (uint256, uint256) {
        uint256 baseTokenAmount = calculateUserCharge(nativeTokenPrice, additionalGasCharge, gasPrice, actualGasCost);
        uint256 feeTokenAmount = calculateSpreadBips(baseTokenAmount, spreadBips);
        return (baseTokenAmount, feeTokenAmount);
    }

    /**
     * @notice Calculates the user charge in token.
     * @param nativeTokenPrice The price of 1 ether = 1e18 wei, denominated in token.
     * @param additionalGasCharge The additional gas charge.
     * @param gasPrice The gas price in wei.
     * @param actualGasCost The actual gas cost in wei.
     */
    function calculateUserCharge(
        uint256 nativeTokenPrice,
        uint256 additionalGasCharge,
        uint256 gasPrice,
        uint256 actualGasCost
    ) internal pure returns (uint256) {
        uint256 finalGasCost = (additionalGasCharge * gasPrice) + actualGasCost;
        return calculateTokenCost(nativeTokenPrice, finalGasCost);
    }

    /**
     * @notice Calculates the cost of gas in token, rounded up by 0.000001 USDC.
     * @param nativeTokenPrice The price of 1 ether = 1e18 wei, denominated in token.
     * @param actualGasCost The actual gas cost in wei.
     */
    function calculateTokenCost(uint256 nativeTokenPrice, uint256 actualGasCost) internal pure returns (uint256) {
        return ((actualGasCost * nativeTokenPrice) / 1 ether) + 1;
    }

    /**
     * @notice Calculate in basis points from the starting cost.
     * @param startingCost The starting cost amount.
     * @param bips The spread in basis points.
     */
    function calculateSpreadBips(uint256 startingCost, uint256 bips) internal pure returns (uint256) {
        return ((startingCost * bips) / BIPS_DENOMINATOR);
    }

    /**
     * @notice Calculates the minimum amount out for swap from token to native token, with the given slippage.
     * @param amountIn the amount of token to be swapped.
     * @param slippageBips the amount of slippage in bips, (e.g 1 bip = 0.01%).
     * @param nativeTokenPrice The price of 1 ether = 1e18 wei, denominated in token.
     */
    function calculateNativeAmountOut(uint256 amountIn, uint256 slippageBips, uint256 nativeTokenPrice)
        internal
        pure
        returns (uint256)
    {
        uint256 amountOutOracle = amountIn * 1 ether / nativeTokenPrice;
        return amountOutOracle - FeeLib.calculateSpreadBips(amountOutOracle, slippageBips);
    }
}

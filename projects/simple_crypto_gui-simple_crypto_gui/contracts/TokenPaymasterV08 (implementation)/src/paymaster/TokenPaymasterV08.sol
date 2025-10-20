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

import {IPermit} from "src/interfaces/IPermit.sol";
import {FeeLib} from "src/utils/FeeLib.sol";
import {
    BaseTokenPaymaster,
    PAYMASTER_TOKEN_ADDRESS_OFFSET,
    PAYMASTER_PERMIT_SIGNATURE_OFFSET
} from "src/paymaster/BaseTokenPaymaster.sol";
import {IEntryPoint} from "@account-abstraction-v8/contracts/interfaces/IEntryPoint.sol";
import {IPaymaster} from "@account-abstraction-v8/contracts/interfaces/IPaymaster.sol";
import {UserOperationLib, PackedUserOperation} from "@account-abstraction-v8/contracts/core/UserOperationLib.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {IWETH} from "@uniswap/swap-router-contracts/contracts/interfaces/IWETH.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice A token paymaster that allows compatible SCAs to pay for gas using ERC-20 tokens.
 */
contract TokenPaymasterV08 is BaseTokenPaymaster, IPaymaster {
    using SafeERC20 for IERC20;
    using UserOperationLib for PackedUserOperation;

    uint256 private constant UNUSED_GAS_PENALTY_PERCENT = 10;
    uint256 private constant PENALTY_GAS_THRESHOLD = 40000;

    // for immutable values in implementations
    constructor(IEntryPoint _newEntryPoint, IERC20Metadata _token, IWETH _wrappedNativeToken)
        BaseTokenPaymaster(_newEntryPoint, _token, _wrappedNativeToken)
    {
        // lock the implementation contract so it can only be called from proxies
        _disableInitializers();
    }

    /// @inheritdoc IPaymaster
    function validatePaymasterUserOp(PackedUserOperation calldata userOp, bytes32 userOpHash, uint256 maxCost)
        external
        virtual
        override
        whenNotPaused
        returns (bytes memory context, uint256 validationData)
    {
        _requireFromEntryPoint();

        address sender = userOp.sender;
        _authorizeUserOpSender(sender);

        uint256 postOpGasLimit = userOp.unpackPostOpGasLimit();
        if (postOpGasLimit < additionalGasCharge) {
            revert PostOpGasLimitTooLow(postOpGasLimit, additionalGasCharge);
        }

        if (userOp.paymasterAndData.length > PAYMASTER_TOKEN_ADDRESS_OFFSET) {
            if (userOp.paymasterAndData.length < PAYMASTER_PERMIT_SIGNATURE_OFFSET) {
                revert MalformedPaymasterData();
            }
            (address tokenAddress, uint256 permitAmount, bytes calldata permitSignature) =
                parsePermitData(userOp.paymasterAndData);

            if (tokenAddress != address(token)) {
                revert UnsupportedToken(tokenAddress);
            }

            IPermit permitToken = IPermit(tokenAddress);
            try permitToken.permit(sender, address(this), permitAmount, type(uint256).max, permitSignature) {
                // continue as normal
            } catch (bytes memory) /* reason */ {
                // Because the permitSignature enters a mempool, it may be frontrun.
                // Instead, we allow failed permits to continue expecting the permit was already run.
            }
        }

        uint256 nativeTokenPrice = fetchPrice();
        (uint256 baseTokenAmount, uint256 feeTokenAmount) = FeeLib.calculateUserChargeWithSpread(
            nativeTokenPrice, additionalGasCharge, userOp.unpackMaxFeePerGas(), maxCost, feeSpread
        );
        uint256 prefundTokenAmount = baseTokenAmount + feeTokenAmount;
        token.safeTransferFrom(sender, address(this), prefundTokenAmount);

        // returns context as needed.
        context = abi.encode(sender, prefundTokenAmount, nativeTokenPrice, postOpGasLimit, userOpHash);
        // zero to indicate validation was a success.
        validationData = 0;
    }

    /// @inheritdoc IPaymaster
    function postOp(PostOpMode mode, bytes calldata context, uint256 actualGasCost, uint256 actualUserOpFeePerGas)
        external
        virtual
        override
        whenNotPaused
    {
        _requireFromEntryPoint();

        // unused
        (mode);

        (
            address sender,
            uint256 prefundTokenAmount,
            uint256 nativeTokenPrice,
            uint256 postOpGasLimit,
            bytes32 userOpHash
        ) = abi.decode(context, (address, uint256, uint256, uint256, bytes32));

        uint256 postOpUnusedGasPenalty = estimatedUnusedGasPenalty(postOpGasLimit);

        (uint256 baseTokenAmount, uint256 feeTokenAmount) = FeeLib.calculateUserChargeWithSpread(
            nativeTokenPrice,
            additionalGasCharge + postOpUnusedGasPenalty,
            actualUserOpFeePerGas,
            actualGasCost,
            feeSpread
        );
        uint256 actualTokenNeeded = baseTokenAmount + feeTokenAmount;

        // Remainder is refunded to user SCA
        if (prefundTokenAmount > actualTokenNeeded) {
            token.safeTransfer(sender, prefundTokenAmount - actualTokenNeeded);
        }

        emit UserOperationSponsored(token, sender, userOpHash, nativeTokenPrice, actualTokenNeeded, feeTokenAmount);
    }

    /**
     * @notice Estimates the postOp unused gas penalty.
     * @param postOpGasLimit the gas limit of post user operation.
     */
    function estimatedUnusedGasPenalty(uint256 postOpGasLimit) internal view returns (uint256) {
        if (postOpGasLimit <= PENALTY_GAS_THRESHOLD) {
            return 0;
        }
        uint256 unusedGas = postOpGasLimit - additionalGasCharge;
        uint256 unusedGasPenalty = (unusedGas * UNUSED_GAS_PENALTY_PERCENT) / 100;
        return unusedGasPenalty;
    }
}

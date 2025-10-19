// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "../../../utils/IERC20.sol";
import {IMatchOrderSelfBase} from "./IBase.sol";
import {AppStorage} from "../AppStorage.sol";
import {EIP712Base} from "../../../facets/EIP712/Base.sol";
import {ERC1155Base} from "../../../facets/ERC1155/Base.sol";

abstract contract MatchOrderSelfBase is AppStorage, ERC1155Base, IMatchOrderSelfBase, EIP712Base {
    function _chargeAllFee(OrderSelf memory order) internal {
        uint256 totalFee = 0;
        totalFee += _chargeFee(order.salt, order.maker, order.fee1TokenAddress, order.fee1Amount);
        totalFee += _chargeFee(order.salt, order.maker, order.fee2TokenAddress, order.fee2Amount);
        // Check if the fee exceeds the maximum fee
        if (totalFee > (order.paymentTokenAmount * s.maxFeeRateBps) / 10000)
            revert MaxFeeExceeded(order.salt, order.paymentTokenAmount, totalFee, s.maxFeeRateBps);
    }

    function _chargeFee(uint256 orderSalt, address from, address feeTokenAddress, uint256 feeAmount) internal returns (uint256 feeAmountStableCoin) {
        if (feeTokenAddress == address(0) || feeAmount == 0) return 0;

        if (s.feeTokenAddressMap[feeTokenAddress] == false) revert InvalidFeeToken(orderSalt, feeTokenAddress);
        bool success = IERC20(feeTokenAddress).transferFrom(from, address(this), feeAmount);
        if (!success) revert ChargeFeeFailed(orderSalt, feeTokenAddress, feeAmount);

        s.feeVaultAmountMap[feeTokenAddress] += feeAmount;
        if (s.shouldBurnFeeTokenAddressMap[feeTokenAddress]) {
            IERC20(feeTokenAddress).burn(feeAmount);
        }

        uint256 decimals = 10 ** IERC20(feeTokenAddress).decimals();
        return (s.feeTokenPriceStableCoinMap[feeTokenAddress] * feeAmount) / decimals;
    }
}

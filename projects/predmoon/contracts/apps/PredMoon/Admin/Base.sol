// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {EIP712Base} from "../../../facets/EIP712/Base.sol";
import {IAdminBase} from "./IBase.sol";
import {AppStorage} from "../AppStorage.sol";
import "../../../utils/IERC20.sol";

abstract contract AdminBase is AppStorage, IAdminBase, EIP712Base {
    function _hashOrder(Order memory order) internal view returns (bytes32) {
        return
            _getDigest(
                keccak256(
                    abi.encode(
                        TYPEHASH_ORDER,
                        order.salt,
                        order.maker,
                        order.tokenId,
                        order.tokenAmount,
                        order.tokenPriceInPaymentToken,
                        order.paymentTokenAddress,
                        order.slippageBps,
                        order.deadline,
                        order.side,
                        order.feeTokenAddress
                    )
                )
            );
    }
}

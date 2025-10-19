// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {EIP712Base} from "../../../facets/EIP712/Base.sol";
import {ERC1155Base} from "../../../facets/ERC1155/Base.sol";
import {IOrderMatcherBase} from "./IBase.sol";
import "../../../utils/IERC20.sol";
import {AppStorage} from "../AppStorage.sol";

abstract contract OrderMatcherBase is IOrderMatcherBase, AppStorage, ERC1155Base, EIP712Base {
    function _performOrderMerge(Order memory takerOrder, Order[] memory makerOrders, OrderMeta memory orderMeta) internal {
        _ensureOrderSide(takerOrder, OrderSide.sell);
        _validateOrderAndUpdateStatus(takerOrder, orderMeta);
        _chargeAllFee(takerOrder);

        // makerOrders
        uint256 length = makerOrders.length;
        uint256 i = 0;

        uint256 takerShouldBurnNft = 0;
        uint256 takerShouldBePaidAmount = 0;
        uint256 takerAlreadySendNft = 0;
        uint256 marketAlreadyPayAmount = 0;
        uint256 one = 10 ** IERC20(takerOrder.paymentTokenAddress).decimals();
        uint256 takerMinPrice = takerOrder.slippageBps == 0
            ? takerOrder.tokenPriceInPaymentToken
            : (takerOrder.tokenPriceInPaymentToken - (one * takerOrder.slippageBps) / 10000);

        for (; i < length; ) {
            Order memory order = makerOrders[i];
            _validateOrderAndUpdateStatus(order, orderMeta);
            _chargeAllFee(order);

            uint256 makerOrderPrice = (order.paymentTokenAmount * (10 ** TOKEN_DECIMALS)) / order.exchangeNftAmount;

            // merge
            if (order.side == OrderSide.sell) {
                if ((one - makerOrderPrice) < takerMinPrice) revert InvalidPrice(order.salt, order.tokenPriceInPaymentToken);
                // burn nft
                _burn(order.maker, order.tokenId, order.exchangeNftAmount);
                takerShouldBurnNft += order.exchangeNftAmount;
                takerShouldBePaidAmount += ((one - makerOrderPrice) * order.exchangeNftAmount) / (10 ** TOKEN_DECIMALS);
                // market pay usdc to maker
                bool paymentResultMaker = IERC20(order.paymentTokenAddress).transfer(order.maker, order.paymentTokenAmount);
                if (!paymentResultMaker)
                    revert PaymentTransferFailed(order.salt, address(this), order.maker, order.paymentTokenAddress, order.paymentTokenAmount);
                s.marketVaultMap[orderMeta.marketId][order.paymentTokenAddress] -= order.paymentTokenAmount;
                marketAlreadyPayAmount += order.paymentTokenAmount;
            }

            // mergeMixNormal only
            if (order.side == OrderSide.buy) {
                if (makerOrderPrice < takerMinPrice) revert InvalidBuyerPrice(order.side, order.salt, makerOrderPrice, takerMinPrice);
                // pay to market
                takerShouldBePaidAmount += _payToMarket(order, orderMeta.marketId);
                // taker transfer nft to maker
                _transfer(takerOrder.maker, order.maker, takerOrder.tokenId, order.exchangeNftAmount);
                emit TransferSingle(msg.sender, takerOrder.maker, order.maker, takerOrder.tokenId, order.exchangeNftAmount);
                takerAlreadySendNft += order.exchangeNftAmount;
            }

            unchecked {
                ++i;
            }
        }

        if ((takerShouldBurnNft + takerAlreadySendNft) != takerOrder.exchangeNftAmount)
            revert TakerNFTSendOutNotValidate(takerOrder.salt, takerOrder.exchangeNftAmount, (takerShouldBurnNft + takerAlreadySendNft));
        if (takerShouldBePaidAmount != takerOrder.paymentTokenAmount)
            revert TakerPaymentNotValidate(takerOrder.salt, takerShouldBePaidAmount, takerOrder.paymentTokenAmount);
        // burn taker nft
        _burn(takerOrder.maker, takerOrder.tokenId, takerShouldBurnNft);
        // market pay usdc to taker
        bool paymentResult = IERC20(takerOrder.paymentTokenAddress).transfer(takerOrder.maker, takerShouldBePaidAmount);
        if (!paymentResult)
            revert PaymentTransferFailed(takerOrder.salt, address(this), takerOrder.maker, takerOrder.paymentTokenAddress, takerShouldBePaidAmount);
        s.marketVaultMap[orderMeta.marketId][takerOrder.paymentTokenAddress] -= takerShouldBePaidAmount;
    }

    function _performOrderNormal(Order memory takerOrder, Order[] memory makerOrders, OrderMeta memory orderMeta) internal {
        _validateOrderAndUpdateStatus(takerOrder, orderMeta);
        _chargeAllFee(takerOrder);
        uint256 takerPay = 0;
        OrderSide makersSide = takerOrder.side == OrderSide.buy ? OrderSide.sell : OrderSide.buy;
        if (takerOrder.side == OrderSide.buy) {
            takerPay = _payToMarket(takerOrder, orderMeta.marketId);
        }

        // makerOrders
        uint256 length = makerOrders.length;
        uint256 i = 0;
        // taker sell
        uint256 takerAlreadyReceivedPayment = 0;
        uint256 takerAlreadySendNft = 0;
        // taker buy
        uint256 takerShouldPay = 0;
        uint256 takerShouldReceiveNft = 0;

        (uint256 takerMinPrice, uint256 takerMaxPrice) = _getTakerOrderPrice(takerOrder);

        for (; i < length; ) {
            if (takerOrder.tokenId != makerOrders[i].tokenId) revert InvalidNftId(takerOrder.tokenId, takerOrder.salt, makerOrders[i].tokenId);
            Order memory order = makerOrders[i];
            _ensureOrderSide(order, makersSide);
            _validateOrderAndUpdateStatus(order, orderMeta);
            _chargeAllFee(order);

            uint256 makerOrderPrice = (order.paymentTokenAmount * (10 ** TOKEN_DECIMALS)) / order.exchangeNftAmount;
            // buy
            if (order.side == OrderSide.buy) {
                if (makerOrderPrice < takerMinPrice) revert InvalidBuyerPrice(order.side, order.salt, makerOrderPrice, takerMinPrice);
                // maker pay usdc
                takerAlreadyReceivedPayment += _payToMarket(order, orderMeta.marketId);
                // taker send nft to maker
                _transfer(takerOrder.maker, order.maker, takerOrder.tokenId, order.exchangeNftAmount);
                emit TransferSingle(msg.sender, takerOrder.maker, order.maker, takerOrder.tokenId, order.exchangeNftAmount);
                takerAlreadySendNft += order.exchangeNftAmount;
            }
            // sell
            if (order.side == OrderSide.sell) {
                if (makerOrderPrice > takerMaxPrice) revert InvalidBuyerPrice(order.side, order.salt, makerOrderPrice, takerMaxPrice);
                _sellNft(order, takerOrder.maker);

                takerShouldPay += order.paymentTokenAmount;
                takerShouldReceiveNft += order.exchangeNftAmount;
            }

            unchecked {
                ++i;
            }
        }

        if (takerOrder.side == OrderSide.sell) {
            if (takerOrder.paymentTokenAmount != takerAlreadyReceivedPayment)
                revert TakerPaymentNotValidate(takerOrder.salt, takerAlreadyReceivedPayment, takerOrder.paymentTokenAmount);
            if (takerOrder.exchangeNftAmount != takerAlreadySendNft)
                revert TakerNFTSendOutNotValidate(takerOrder.salt, takerOrder.exchangeNftAmount, takerAlreadySendNft);
            bool paymentResult = IERC20(takerOrder.paymentTokenAddress).transfer(takerOrder.maker, takerOrder.paymentTokenAmount);
            if (!paymentResult)
                revert PaymentTransferFailed(
                    takerOrder.salt,
                    address(this),
                    takerOrder.maker,
                    takerOrder.paymentTokenAddress,
                    takerOrder.paymentTokenAmount
                );
        }
        if (takerOrder.side == OrderSide.buy) {
            if (takerOrder.paymentTokenAmount != takerShouldPay)
                revert TakerPaymentNotValidate(takerOrder.salt, takerAlreadyReceivedPayment, takerOrder.paymentTokenAmount);
            if (takerOrder.exchangeNftAmount != takerShouldReceiveNft)
                revert TakerNFTSendOutNotValidate(takerOrder.salt, takerOrder.exchangeNftAmount, takerAlreadySendNft);
            // nothing todo, as the taker already transfered StableCoin to this contract at the beginning of matchOrder function
        }
    }

    function _getTakerOrderPrice(Order memory takerOrder) internal view returns (uint256 takerMinPrice, uint256 takerMaxPrice) {
        uint256 one = 10 ** IERC20(takerOrder.paymentTokenAddress).decimals();
        takerMinPrice = takerOrder.slippageBps == 0
            ? takerOrder.tokenPriceInPaymentToken
            : (takerOrder.tokenPriceInPaymentToken - (one * takerOrder.slippageBps) / 10000);
        takerMaxPrice = takerOrder.slippageBps == 0
            ? takerOrder.tokenPriceInPaymentToken
            : (takerOrder.tokenPriceInPaymentToken + (one * takerOrder.slippageBps) / 10000);
    }

    function _performOrderMint(Order memory takerOrder, Order[] memory makerOrders, OrderMeta memory orderMeta) internal {
        _ensureOrderSide(takerOrder, OrderSide.buy);
        _validateOrderAndUpdateStatus(takerOrder, orderMeta);
        _chargeAllFee(takerOrder);
        uint256 takerPay = _payToMarket(takerOrder, orderMeta.marketId);

        // makerOrders
        uint256 length = makerOrders.length;
        uint256 i = 0;
        uint256 makerTotalPay = 0;
        uint256 makerTotalMint = 0;
        uint256 takerShouldPay = 0;
        uint256 takerShouldReceiveNft = 0;
        uint256 takerAlreadyReceivedNft = 0;
        uint256 one = 10 ** IERC20(takerOrder.paymentTokenAddress).decimals();

        for (; i < length; ) {
            Order memory order = makerOrders[i];
            // _ensureOrderSide(order, OrderSide.buy);
            _validateOrderAndUpdateStatus(order, orderMeta);
            _chargeAllFee(order);

            // mint only
            if (order.side == OrderSide.buy) {
                takerShouldReceiveNft += order.exchangeNftAmount;
                uint256 price = (order.paymentTokenAmount * 10 ** TOKEN_DECIMALS) / order.exchangeNftAmount;
                takerShouldPay += ((one - price) * order.exchangeNftAmount) / (10 ** TOKEN_DECIMALS);
                makerTotalPay += _payToMarket(order, orderMeta.marketId);
                makerTotalMint += _mintNFT(order, orderMeta.takerNftIdPair);
            }
            // mintMixNormal
            if (order.side == OrderSide.sell) {
                takerShouldPay += order.paymentTokenAmount;
                takerShouldReceiveNft += order.exchangeNftAmount;
                takerAlreadyReceivedNft += order.exchangeNftAmount;
                takerOrder.exchangeNftAmount -= order.exchangeNftAmount;
                _sellNft(order, takerOrder.maker);
            }

            unchecked {
                ++i;
            }
        }
        uint256 takerMint = _mintNFT(takerOrder, orderMeta.takerNftId);

        if (takerPay != takerShouldPay) revert TakerPaymentNotValidate(takerOrder.salt, takerShouldPay, takerPay);

        if ((takerMint + takerAlreadyReceivedNft) != takerShouldReceiveNft)
            revert TakerNFTReceivedNotValidate(takerOrder.salt, takerShouldReceiveNft, takerMint + takerAlreadyReceivedNft);
    }

    function _sellNft(Order memory sellOrder, address buyer) internal {
        // transfer StableCoin from buyer to this contract
        // we do not need these code here, as taker already transfered StableCoin to this contract at the beginning of matchOrder function
        // bool paymentResult = IERC20(sellOrder.paymentTokenAddress).transferFrom(buyer, address(this), sellOrder.paymentTokenAmount);
        // if (!paymentResult)
        //     revert PaymentTransferFailed(sellOrder.salt, buyer, address(this), sellOrder.paymentTokenAddress, sellOrder.paymentTokenAmount);
        // for makers buy the Nft case, maker already call `_payToMarket` to pay the StableCoin first.

        // transfer StableCoin from this contract to seller
        bool paymentResult2 = IERC20(sellOrder.paymentTokenAddress).transfer(sellOrder.maker, sellOrder.paymentTokenAmount);
        if (!paymentResult2)
            revert PaymentTransferFailed(sellOrder.salt, address(this), sellOrder.maker, sellOrder.paymentTokenAddress, sellOrder.paymentTokenAmount);

        _transfer(sellOrder.maker, buyer, sellOrder.tokenId, sellOrder.exchangeNftAmount);

        emit TransferSingle(msg.sender, sellOrder.maker, buyer, sellOrder.tokenId, sellOrder.exchangeNftAmount);
    }

    function _ensureOrderSide(Order memory order, OrderSide orderSide) internal pure {
        if (order.side != orderSide) revert InvalidOrderSide(order.salt, orderSide, order.side);
    }

    function _payToMarket(Order memory order, uint256 marketId) internal returns (uint256) {
        bool paymentResult = IERC20(order.paymentTokenAddress).transferFrom(order.maker, address(this), order.paymentTokenAmount);
        if (!paymentResult) revert PaymentTransferFailed(order.salt, order.maker, address(this), order.paymentTokenAddress, order.paymentTokenAmount);

        s.marketVaultMap[marketId][order.paymentTokenAddress] += order.paymentTokenAmount;
        return order.paymentTokenAmount;
    }

    function _mintNFT(Order memory order, uint256 targetNftId) internal returns (uint256) {
        if (order.tokenId != targetNftId) revert InvalidNftId(targetNftId, order.salt, order.tokenId);
        _mint(order.maker, targetNftId, order.exchangeNftAmount, "");
        return order.exchangeNftAmount;
    }

    function _validateOrderAndUpdateStatus(Order memory order, OrderMeta memory orderMeta) internal {
        if (order.salt < s.minimumOrderSalt) revert InvalidOrderSalt(order.salt, s.minimumOrderSalt);
        if (s.nftIdMapToMarketId[order.tokenId] != orderMeta.marketId)
            revert InvalidMarketIdForMaker(orderMeta.marketId, s.nftIdMapToMarketId[order.tokenId], order.salt);

        uint256 one = 10 ** IERC20(order.paymentTokenAddress).decimals();

        // part of takerOrder turn into makerOrder
        if (order.slippageBps > 0) {
            uint256 price = (order.paymentTokenAmount * 10 ** TOKEN_DECIMALS) / order.exchangeNftAmount;
            uint256 priceDelta = price > order.tokenPriceInPaymentToken
                ? price - order.tokenPriceInPaymentToken
                : order.tokenPriceInPaymentToken - price;
            uint256 slippage = priceDelta / one;
            if (slippage > order.slippageBps) {
                revert InvalidSlippage(order.salt, order.slippageBps, slippage);
            }
        }
        // Slippage is too large
        if (order.slippageBps > s.maxSlippageBps) revert InvalidSlippage(order.salt, order.slippageBps, s.maxSlippageBps);
        // Order expired
        if (order.deadline > 0 && order.deadline < block.timestamp) revert OrderExpired(order.salt, order.deadline, block.timestamp);

        if (order.tokenPriceInPaymentToken > one) revert InvalidPrice(order.salt, order.tokenPriceInPaymentToken);

        bytes32 digest = _hashOrder(order);

        // The order has been fully executed or cancelled
        if (s.orderIsFilledOrCancelledMap[digest]) revert OrderFilledOrCancelled(order.salt);
        // Initially, the order has not been recorded on the chain and needs to be initialized
        uint256 remaining = s.orderRemainingMap[digest];
        if (remaining == 0) {
            // Note that if the order has been fully filled, this value is also 0, but orderIsFilledOrCancelledMap has already excluded this situation.
            remaining = order.tokenAmount;
        }
        // Verify remaining quantity of order
        if (remaining < order.exchangeNftAmount) revert OrderRemainingNotEnough(order.salt, order.exchangeNftAmount, remaining);
        remaining -= order.exchangeNftAmount;
        if (remaining == 0) {
            s.orderIsFilledOrCancelledMap[digest] = true;
        }

        address signer = _recoverSigner(digest, order.sig);
        if (order.maker != signer) revert InvalidSignature(order.salt, order.sig, order.maker, signer);

        // To purchase NFTs, you need to ensure that the payment token is allowed
        if (order.side == OrderSide.buy && s.paymentAddressMap[order.paymentTokenAddress] == false) {
            revert InvalidPaymentToken(order.salt, order.paymentTokenAddress);
        }

        s.orderRemainingMap[digest] = remaining;
    }

    function _chargeAllFee(Order memory order) internal {
        uint256 totalFee = 0;
        totalFee += _chargeFee(order.salt, order.maker, order.fee1TokenAddress, order.fee1Amount);
        totalFee += _chargeFee(order.salt, order.maker, order.fee2TokenAddress, order.fee2Amount);
        // Check if the fee exceeds the maximum fee
        if (totalFee > (order.paymentTokenAmount * s.maxFeeRateBps) / 10000)
            revert MaxFeeExceeded(order.salt, order.paymentTokenAmount, s.maxFeeRateBps, totalFee);
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

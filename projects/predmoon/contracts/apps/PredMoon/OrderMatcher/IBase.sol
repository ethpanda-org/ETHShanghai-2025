// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import {IAppStorage} from "../IAppStorage.sol";

interface IOrderMatcherBase is IAppStorage {
    enum TradeType {
        mint, // taker buy A, maker1 buy A'
        mintSelf, // taker buy A and buy A'
        mintMixNormal, // taker buy 2 A, maker1 buy 1 A', maker2 sell 1 A
        normal, // taker buy/sell
        merge, // taker sell A, maker1 sell A'
        mergeSelf, // taker sell A and sell A'
        mergeMixNormal // taker sell 2 A, maker1 sell 1 A', maker2 buy 1 A
    }

    struct Reward {
        uint256 marketId;
        uint256 nftId;
        address user;
        address paymentTokenAddress;
        uint256 nonce;
        bytes sig;
        // extra info for fee
        uint256 feeAmount;
    }

    struct OrderMeta {
        address taker;
        uint256 marketId;
        uint256 takerNftId;
        TradeType tradeType;
        uint256 takerNftIdPair;
    }

    struct OrderResult {
        uint256 makerPaymentAmount; // Total payment amount from maker (to exchange or taker)
        uint256 makerPayToMarketPaymentAmount; // Payment from maker to exchange
        uint256 marketPayToMakerPaymentAmount; // Payment from exchange to maker (for burned NFTs)
        uint256 mintTakerNftIdPair; // Amount of takerNftIdPair NFTs minted
        uint256 needTakerTransferToMakerNftAmount; // NFT amount taker needs to transfer to maker
        uint256 needTakerTransferToMakerPaymentAmount; // StableCoin amount taker needs to transfer to maker
        uint256 needPayToTakerPaymentAmount; // StableCoin amount to be paid to taker
        uint256 needBurnTakerNftAmount; // Amount of taker's NFTs to burn
        // Market payment tracking
        uint256 payToMarketForNftId;
        uint256 payToMarketForNftIdPair;
        // Taker payment tracking (no nftIdPair payments to taker)
        uint256 payToTakerForNftId;
        // NFT operations
        uint256 mintNftIdAmount;
        uint256 mintNftIdPairAmount;
        uint256 burnNftIdAmount;
        uint256 burnNftIdPairAmount;
        // NFT transfers
        uint256 takeNftIdAmountFromTaker; // NFT amount taken from taker
        uint256 giveTakerNftIdAmount; // NFT amount given to taker
    }

    struct MarketInfo {
        uint256 marketId;
        uint256 nftId1;
        uint256 nftId2;
        uint256 vaultAmount;
        uint256 marketWinnerPayAmount;
        bool isEnded;
        bool isBlocked;
        bool isFinallized;
        uint256 winNftId;
    }

    error MarketAlreadyExists();
    error MaxMarketReached();
    error InvalidSignature(uint256 orderSalt, bytes sig, address orderMaker, address signer);
    error OrderExpired(uint256 orderSalt, uint256 orderDeadline, uint256 currentTimestamp);
    error MarketIsEndedOrBlocked(uint256 marketId, uint256 orderSalt);
    error OrderFilledOrCancelled(uint256 salt);
    error OrderRemainingNotEnough(uint256 orderSalt, uint256 nftAmount, uint256 orderRemaining);
    error InvalidFeeToken(uint256 orderSalt, address feeTokenAddress);
    error ChargeFeeFailed(uint256 orderSalt, address feeTokenAddress, uint256 feeAmount);
    error PaymentTransferFailed(uint256 orderSalt, address from, address to, address paymentTokenAddress, uint256 paymentAmount);
    error InvalidMarketIdForMaker(uint256 marketId, uint256 marketIdMaker, uint256 orderSalt);
    error InvalidNftId(uint256 targetNftId, uint256 orderSalt, uint256 orderNftId);
    error MarketIdNotExist(uint256 nftId, uint256 orderSalt);
    error TakerPaymentNotValidate(uint256 orderSalt, uint256 takerShouldPayOrReceived, uint256 orderPaymentTokenAmount);
    error TakerNFTReceivedNotValidate(uint256 orderSalt, uint256 takerShouldMint, uint256 takerMint);
    error TakerNFTSendOutNotValidate(uint256 orderSalt, uint256 takerShouldSend, uint256 takerSend);
    error MintNFTAmountNotEqual(uint256 orderSalt, uint256 nftAmount, uint256 nftPairAmount);
    error InvalidPaymentToken(uint256 orderSalt, address paymentTokenAddress);
    error InvalidOrderSide(uint256 orderSalt, OrderSide expectSide, OrderSide orderSide);
    error InvalidSlippage(uint256 orderSalt, uint256 orderSlippage, uint256 maxSlippage);
    error PaymentTokenAmountOverflow(
        uint8 flag,
        uint256 orderSalt,
        OrderSide orderSide,
        uint256 paymentTokenAmount,
        uint256 totalNeedPay,
        uint256 slippageBps
    );
    error MaxFeeExceeded(uint256 orderSalt, uint256 paymentAmount, uint256 totalFee, uint256 maxFeeRate);
    error InvalidTradeType(uint256 orderSalt, OrderMeta orderMeta);
    error InvalidBuyerPrice(OrderSide side, uint256 orderSalt, uint256 buyerPrice, uint256 sellerPrice);
    error InvalidPrice(uint256 orderSalt, uint256 orderPrice);
    error InvalidOrderSalt(uint256 orderSalt, uint256 minimumOrderSalt);
    error NotWinningNft(uint256 marketId, uint256 nftId);
    error RewardAlreadyClaimed(uint256 marketId, address user);
    error NoNftOwned(uint256 nftId, address user);
    error MarketNotFinallized(uint256 marketId);
    error MarketAlreadyFinallized(uint256 marketId);
    error MarketVaultNotEnoughForPayReward(
        uint256 marketId,
        uint256 marketVaultAmount,
        uint256 marketWinnerAlreadyPayAmount,
        address user,
        address paymentTokenAddress
    );
    error RewardTransferFailed(Reward reward, address paymentTokenAddress, uint256 amount, uint256 paymentTokenFeeAmount);
    error MarketVaultBalanceInsufficient(uint256 available, uint256 required);
    error NonceAlreadyUsed(uint256 nonce);
}

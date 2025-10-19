// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import {IAppStorage} from "./IAppStorage.sol";

contract AppStorage is IAppStorage {
    struct Storage {
        uint256 maxSlippageBps;
        uint256 maxFeeRateBps;
        uint256 minimumOrderSalt;
        mapping(address => bool) paymentAddressMap;
        mapping(uint256 => uint256[]) marketIdMap; // marketId => [nftId1, nftId2]
        mapping(uint256 => uint256) nftIdMapToMarketId; // nftId => marketId
        mapping(uint256 => mapping(address => uint256)) marketVaultMap; // marketId => (paymentTokenAddress => vaultAmount)
        mapping(uint256 => mapping(address => uint256)) marketWinnerPayAmountMap; // marketId => (paymentTokenAddress => payAmount)
        mapping(bytes32 => bool) orderIsFilledOrCancelledMap; // hash => true/false, true: filled or cancelled, false: default value
        mapping(bytes32 => uint256) orderRemainingMap; // hash => remaining amount
        // fee stuff
        mapping(address => bool) feeTokenAddressMap;
        mapping(address => bool) shouldBurnFeeTokenAddressMap;
        mapping(address => uint256) feeTokenPriceStableCoinMap; // base on StableCoin
        mapping(address => uint256) feeVaultAmountMap; // key by tokenAddress
        mapping(address => uint256) feeVaultProfitDistributedAmountMap;
        mapping(address => mapping(string => ProfitDistributedDetail)) profitDistributedLogMap; // feeTokenAddress => (dateString => ProfitDistributedDetail)
        // these vault map will increase while profit distributed, and decrease while do payout
        mapping(PayoutType => mapping(address => uint256)) profitVaultMap; // payoutType => (paymentTokenAddress => vaultAmount)
        mapping(address => uint256) totalPayoutMap;
        // market stuff
        mapping(uint256 => uint256) marketWinNftIdMap; // marketId => winNftId
        mapping(uint256 => mapping(address => bool)) claimedUserMapByMarketId; // marketId => (userAddress => isClaimed)
        mapping(uint256 => bool) marketIsBlockedMap;
        mapping(uint256 => bool) marketIsEndedMap; // marketId => isEnded
        mapping(uint256 => bool) marketIsFinallizedMap; // marketId => isFinallized
        mapping(uint256 => bool) rewardClaimedNonceMap; // nonce => isClaimed
    }
    Storage internal s;

    uint256 constant MAX_ID = 2 ** 256 - 2;
    uint256 constant TOKEN_DECIMALS = 6;

    bytes32 constant TYPEHASH_ORDER =
        keccak256(
            "Order(uint256 salt,address maker,uint256 tokenId,uint256 tokenAmount,uint256 tokenPriceInPaymentToken,address paymentTokenAddress,uint256 slippageBps,uint256 deadline,uint8 side,address feeTokenAddress)"
        );

    bytes32 constant TYPEHASH_PAYOUT = keccak256("Payout(address to,address feeTokenAddress,uint256 amount,uint8 payoutType,uint256 nonce)");

    bytes32 constant TYPEHASH_ORDER_SELF =
        keccak256(
            "OrderSelf(uint256 salt,address maker,uint256 marketId,uint256 tradeType,uint256 paymentTokenAmount,address paymentTokenAddress,uint256 deadline,address feeTokenAddress)"
        );

    bytes32 constant TYPEHASH_REWARD = keccak256("Reward(uint256 marketId,uint256 nftId, address user,address paymentTokenAddress,uint256 nonce)");
    bytes32 constant TYPEHASH_WITHDRAW = keccak256("Withdraw(address from,address to,address tokenAddress,uint256 amount,uint256 nonce)");
}

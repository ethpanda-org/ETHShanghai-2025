// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Facet} from "../../../Facet.sol";
import {MarketManagerBase} from "./Base.sol";
import {IMarketManagerFacet} from "./IFacet.sol";
import "../../../utils/IERC20.sol";
import {AccessControlBase} from "../../../facets/AccessControl/Base.sol";
import {ERC1155Storage} from "../../../facets/ERC1155/Storage.sol";
import {TTOQManagerBase} from "../../../facets/TTOQManager/Base.sol";

contract MarketManagerFacet is Facet, AccessControlBase, MarketManagerBase, TTOQManagerBase, IMarketManagerFacet {
    function MarketManagerFacet_init(uint8 roleA, uint8 roleB, uint8 roleC) external onlyInitializing {
        _setFunctionAccess(this.unBlockMarket.selector, roleA, true);

        _setFunctionAccess(this.claimReward.selector, roleB, true);
        _setFunctionAccess(this.endMarket.selector, roleB, true);
        _setFunctionAccess(this.finalizeMarket.selector, roleB, true);
        _setFunctionAccess(this.createMarket.selector, roleB, true);
        _setFunctionAccess(this.withdrawToken.selector, roleB, true);

        _setFunctionAccess(this.blockMarket.selector, roleC, true);

        _addInterface(type(IMarketManagerFacet).interfaceId);
    }

    function withdrawToken(
        address from,
        address to,
        address tokenAddress,
        uint256 amount,
        uint256 nonce,
        bytes memory userSig
    ) external whenNotPaused protected nonReentrant {
        require(tokenAddress != address(0), "Invalid token address");
        require(to != address(0), "Invalid to address");
        _useNonce(from, nonce);

        bytes memory encodedData = abi.encode(TYPEHASH_WITHDRAW, from, to, tokenAddress, amount, nonce);
        _verifySignature(from, userSig, encodedData);
        require(IERC20(tokenAddress).transferFrom(from, address(this), amount), "TransferFrom failed");
        require(IERC20(tokenAddress).transfer(to, amount), "TransferTo failed");
        emit TokenWithdrawn(from, to, tokenAddress, amount);
    }

    function claimReward(Reward memory reward) external whenNotPaused protected nonReentrant {
        _isPayoutDisabled();
        uint256 marketId = reward.marketId;
        uint256 nftId = reward.nftId;
        address user = reward.user;
        address paymentTokenAddress = reward.paymentTokenAddress;

        _requireNonZero(user);

        if (s.rewardClaimedNonceMap[reward.nonce]) revert NonceAlreadyUsed(reward.nonce);
        s.rewardClaimedNonceMap[reward.nonce] = true;
        if (!s.marketIsEndedMap[marketId] || !s.marketIsFinallizedMap[marketId]) revert MarketNotFinallized(marketId);
        if (nftId == 0 || s.marketWinNftIdMap[marketId] != nftId) revert NotWinningNft(marketId, nftId);
        // is user already claimed?
        if (s.claimedUserMapByMarketId[marketId][user]) revert RewardAlreadyClaimed(marketId, user);
        s.claimedUserMapByMarketId[marketId][user] = true;

        ERC1155Storage.Storage storage _ds = ERC1155Storage.load();
        uint256 amount = _ds._balances[nftId][user];
        if (amount == 0) revert NoNftOwned(nftId, user);

        // should disable nft transfer if the market is end/blocked/finallized （defined in the _checkStatus func in TuringMarketFacet.sol）
        // so the calc reward is correct
        s.marketWinnerPayAmountMap[marketId][paymentTokenAddress] += amount;
        if (s.marketWinnerPayAmountMap[marketId][paymentTokenAddress] > s.marketVaultMap[marketId][paymentTokenAddress])
            revert MarketVaultNotEnoughForPayReward(
                marketId,
                s.marketVaultMap[marketId][paymentTokenAddress],
                s.marketWinnerPayAmountMap[marketId][paymentTokenAddress],
                user,
                paymentTokenAddress
            );

        if (reward.feeAmount > (amount * s.maxFeeRateBps) / 10000) revert MaxFeeExceeded(reward.nonce, amount, reward.feeAmount, s.maxFeeRateBps);

        s.feeVaultAmountMap[paymentTokenAddress] += reward.feeAmount;
        uint256 transferAmount = amount - reward.feeAmount;
        _tokenTransferOutQuoteCheck("claimReward", paymentTokenAddress, transferAmount);
        bool paymentResult = IERC20(paymentTokenAddress).transfer(user, transferAmount);
        if (!paymentResult) revert RewardTransferFailed(reward, paymentTokenAddress, amount, reward.feeAmount);

        emit RewardClaimed(marketId, nftId, user, paymentTokenAddress, amount, reward.feeAmount);
    }

    function blockMarket(uint256 marketId) external protected {
        s.marketIsBlockedMap[marketId] = true;
        emit MarketBlocked(marketId, true);
    }

    function unBlockMarket(uint256 marketId) external protected {
        s.marketIsBlockedMap[marketId] = false;
        emit MarketBlocked(marketId, false);
    }

    function endMarket(uint256 marketId, uint256 winNftId) external protected {
        s.marketIsEndedMap[marketId] = true;
        s.marketWinNftIdMap[marketId] = winNftId;
        emit MarketEnded(marketId, winNftId);
    }

    function finalizeMarket(uint256 marketId, uint256 winNftId) external protected {
        if (s.marketIsFinallizedMap[marketId]) revert MarketAlreadyFinallized(marketId);
        s.marketIsFinallizedMap[marketId] = true;
        s.marketWinNftIdMap[marketId] = winNftId;
        emit MarketFinalized(marketId, winNftId);
    }

    function createMarket(uint256 marketId) external protected returns (uint256 nftId1, uint256 nftId2) {
        if (s.marketIdMap[marketId].length != 0) revert MarketAlreadyExists();

        ERC1155Storage.Storage storage _ds = ERC1155Storage.load();
        if (_ds._idx >= MAX_ID) revert MaxMarketReached();

        nftId1 = ++_ds._idx;
        nftId2 = ++_ds._idx;
        s.marketIdMap[marketId] = [nftId1, nftId2];

        s.nftIdMapToMarketId[nftId1] = marketId;
        s.nftIdMapToMarketId[nftId2] = marketId;

        // enable market
        s.marketIsEndedMap[marketId] = false;

        emit MarketCreated(marketId, nftId1, nftId2);
    }

    function getMarketInfo(uint256 marketId, address paymentTokenAddress) external view returns (MarketInfo memory) {
        return
            MarketInfo({
                marketId: marketId,
                nftId1: s.marketIdMap[marketId][0],
                nftId2: s.marketIdMap[marketId][1],
                vaultAmount: s.marketVaultMap[marketId][paymentTokenAddress],
                marketWinnerPayAmount: s.marketWinnerPayAmountMap[marketId][paymentTokenAddress],
                isEnded: s.marketIsEndedMap[marketId],
                isBlocked: s.marketIsBlockedMap[marketId],
                isFinallized: s.marketIsFinallizedMap[marketId],
                winNftId: s.marketWinNftIdMap[marketId]
            });
    }
}

// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Facet} from "../../../Facet.sol";
import {OrderMatcherBase} from "./Base.sol";
import {IOrderMatcherFacet} from "./IFacet.sol";
import {AppStorage} from "../AppStorage.sol";
import "../../../utils/IERC20.sol";
import {AccessControlBase} from "../../../facets/AccessControl/Base.sol";

contract OrderMatcherFacet is Facet, AccessControlBase, OrderMatcherBase, IOrderMatcherFacet {
    function OrderMatcherFacet_init(uint8 roleB) external onlyInitializing {
        _setFunctionAccess(this.matchOrder.selector, roleB, true);
        _addInterface(type(IOrderMatcherFacet).interfaceId);
    }

    function _checkStatus(address from_, address to_, uint256 id_, uint256 amount_) internal virtual override {
        uint256 marketId = s.nftIdMapToMarketId[id_];
        if (s.marketIsEndedMap[marketId] || s.marketIsBlockedMap[marketId] || s.marketIsFinallizedMap[marketId])
            revert MarketIsEndedOrBlocked(marketId, id_);

        super._checkStatus(from_, to_, id_, amount_);
    }

    function matchOrder(Order memory takerOrder, Order[] memory makerOrders, TradeType tradeType) external whenNotPaused protected nonReentrant {
        uint256 takerNftId = takerOrder.tokenId;
        uint256 marketId = s.nftIdMapToMarketId[takerNftId];
        // Ensuring that the market exists
        if (marketId == 0) revert MarketIdNotExist(takerNftId, takerOrder.salt);
        // The market is closed or disabled
        if (s.marketIsEndedMap[marketId] || s.marketIsBlockedMap[marketId]) revert MarketIsEndedOrBlocked(marketId, takerOrder.salt);

        uint256 takerNftIdPair = s.marketIdMap[marketId][0] == takerNftId ? s.marketIdMap[marketId][1] : s.marketIdMap[marketId][0];
        OrderMeta memory orderMeta = OrderMeta(takerOrder.maker, marketId, takerNftId, tradeType, takerNftIdPair);

        if (tradeType == TradeType.mint || tradeType == TradeType.mintMixNormal) {
            _performOrderMint(takerOrder, makerOrders, orderMeta);
        } else if (tradeType == TradeType.normal) {
            _performOrderNormal(takerOrder, makerOrders, orderMeta);
        } else if (tradeType == TradeType.merge || tradeType == TradeType.mergeMixNormal) {
            _performOrderMerge(takerOrder, makerOrders, orderMeta);
        } else {
            revert InvalidTradeType(takerOrder.salt, orderMeta);
        }
    }
}

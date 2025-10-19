// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ITTOQManagerBase} from "./IBase.sol";
import {TTOQManagerStorage} from "./Storage.sol";

abstract contract TTOQManagerBase is ITTOQManagerBase {
    function _isPayoutDisabled() internal view {
        if (TTOQManagerStorage.load().isPayoutDisabled == true) {
            revert PayoutTemporarilyDisabled();
        }
    }

    function _tokenTransferOutQuoteCheck(string memory context, address tokenAddress, uint256 amount) internal {
        TTOQManagerStorage.Storage storage $ = TTOQManagerStorage.load();
        $.usedTokenTransferOutQuoteMap[tokenAddress] += amount;
        if ($.maxTokenTransferOutQuoteMap[tokenAddress] < $.usedTokenTransferOutQuoteMap[tokenAddress]) {
            revert ExceedsMaxTokenTransferOutQuote(
                context,
                tokenAddress,
                amount,
                $.usedTokenTransferOutQuoteMap[tokenAddress],
                $.maxTokenTransferOutQuoteMap[tokenAddress]
            );
        }
        emit TTOQUpdated(context, tokenAddress, amount, $.usedTokenTransferOutQuoteMap[tokenAddress], msg.sender);
    }
}

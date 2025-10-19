// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface ITTOQManagerBase {
    error PayoutTemporarilyDisabled();
    error ExceedsMaxTokenTransferOutQuote(string context, address tokenAddress, uint256 amount, uint256 newQuote, uint256 maxQuote);
    event MaxTTOQUpdated(address indexed tokenAddress, uint256 newMaxTTOQ, address sender);
    event TTOQUpdated(string indexed context, address indexed tokenAddress, uint256 amount, uint256 newTTOQ, address sender);
}

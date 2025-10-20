// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

library TTOQManagerStorage {
    bytes32 internal constant POSITION = keccak256("TTOQManagerStorage");

    struct Storage {
        mapping(address => uint256) usedTokenTransferOutQuoteMap; // tokenAddress => ttoqAmount
        mapping(address => uint256) maxTokenTransferOutQuoteMap; // tokenAddress => maxAmountLimit
        bool isPayoutDisabled;
    }

    function load() internal pure returns (Storage storage $) {
        bytes32 position = POSITION;
        assembly {
            $.slot := position
        }
    }
}

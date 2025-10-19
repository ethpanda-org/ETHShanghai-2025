// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import {IOrderMatcherBase} from "../OrderMatcher/IBase.sol";

interface IMatchOrderSelfBase is IOrderMatcherBase {
    struct OrderSelf {
        uint256 salt;
        address maker;
        uint256 marketId;
        uint256 tradeType; // mintSelf: 0 or mergeSelf: 1
        // Merge/Split order payment amount
        // Merge, burn 1 YES and 1 NO, pay 1 StableCoin to maker
        // Split, get 1 StableCoin paid from user to marketVault, then mint 1 YES and 1 NO to maker
        uint256 paymentTokenAmount;
        address paymentTokenAddress;
        uint256 deadline;
        address feeTokenAddress;
        bytes sig;
        uint256 fee1Amount;
        address fee1TokenAddress;
        uint256 fee2Amount;
        address fee2TokenAddress;
    }
}

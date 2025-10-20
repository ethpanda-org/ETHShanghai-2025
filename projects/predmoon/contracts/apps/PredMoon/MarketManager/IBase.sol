// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import {IOrderMatcherBase} from "../OrderMatcher/IBase.sol";

interface IMarketManagerBase is IOrderMatcherBase {
    event MarketCreated(uint256 indexed marketId, uint256 nftId1, uint256 nftId2);
    event MarketEnded(uint256 indexed marketId, uint256 winNftId);
    event MarketFinalized(uint256 indexed marketId, uint256 winNftId);
    event MarketBlocked(uint256 indexed marketId, bool isBlocked);
    event RewardClaimed(
        uint256 indexed marketId,
        uint256 nftId,
        address indexed user,
        address paymentTokenAddress,
        uint256 amount,
        uint256 paymentTokenFeeAmount
    );
    event TokenWithdrawn(address indexed from, address indexed to, address tokenAddress, uint256 amount);
}

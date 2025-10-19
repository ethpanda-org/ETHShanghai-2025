// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;
import {IOrderMatcherBase} from "../OrderMatcher/IBase.sol";
import {IAppStorage} from "../IAppStorage.sol";

interface IAdminBase is IAppStorage {
    event FeeTokenPayout(PayoutType payoutType, address indexed to, address feeTokenAddress, uint256 amount);
    event FeeTokenUpdated(address indexed feeTokenAddress, uint256 feeTokenPriceStableCoin, bool isEnabled);
    event ProfitDistribution(string indexed dateString, address indexed profitTokenAddress, ProfitDistributedDetail detail);
}

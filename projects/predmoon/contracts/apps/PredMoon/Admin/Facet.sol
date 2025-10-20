// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {Facet} from "../../../Facet.sol";
import {AdminBase} from "./Base.sol";
import {IAdminFacet} from "./IFacet.sol";
import "../../../utils/IERC20.sol";
import {TTOQManagerBase} from "../../../facets/TTOQManager/Base.sol";
import {AccessControlBase} from "../../../facets/AccessControl/Base.sol";

contract AdminFacet is IAdminFacet, AdminBase, AccessControlBase, TTOQManagerBase, Facet {
    function AdminFacet_init(uint8 roleA, uint8 roleB, uint8 roleC) external onlyInitializing {
        _setFunctionAccess(this.setPayment.selector, roleA, true);
        _setFunctionAccess(this.setMaxSlippageBps.selector, roleA, true);
        _setFunctionAccess(this.setFeeToken.selector, roleA, true);
        _setFunctionAccess(this.setShouldBurnFeeToken.selector, roleA, true);
        _setFunctionAccess(this.setMaxFeeRateBps.selector, roleA, true);

        _setFunctionAccess(this.profitDistribution.selector, roleB, true);
        _setFunctionAccess(this.doPayoutVault.selector, roleB, true);

        _setFunctionAccess(this.setMinimumOrderSalt.selector, roleC, true);

        _addInterface(type(IAdminFacet).interfaceId);
    }

    function profitDistribution(
        string memory dateString,
        address profitTokenAddress,
        uint256 brokerageAmount,
        uint256 revenueAmount,
        uint256 rewardFeeAmount
    ) external whenNotPaused protected nonReentrant {
        require(s.feeTokenAddressMap[profitTokenAddress], "fee token not enabled");
        require(brokerageAmount > 0 && revenueAmount > 0, "Amount must be greater than 0");

        uint256 amount = s.feeVaultProfitDistributedAmountMap[profitTokenAddress] + brokerageAmount + revenueAmount + rewardFeeAmount;
        require(s.feeVaultAmountMap[profitTokenAddress] >= amount, "Insufficient fee vault balance");
        s.feeVaultProfitDistributedAmountMap[profitTokenAddress] = amount;

        uint256 baseAmount = revenueAmount / 100; // 1%
        uint256 liquidity = baseAmount * 40; // 40%
        uint256 buyBackBurn = baseAmount * 30; // 30%
        uint256 stakingDividends = baseAmount * 20; // 20%
        uint256 riskReserve = baseAmount * 10; // 10%

        s.profitVaultMap[PayoutType.brokerage][profitTokenAddress] += brokerageAmount;
        s.profitVaultMap[PayoutType.liquidityFund][profitTokenAddress] += liquidity;
        s.profitVaultMap[PayoutType.buyBackBurnFund][profitTokenAddress] += buyBackBurn;
        s.profitVaultMap[PayoutType.stakingDividendsFund][profitTokenAddress] += stakingDividends;
        s.profitVaultMap[PayoutType.riskReserveFund][profitTokenAddress] += riskReserve;
        s.profitVaultMap[PayoutType.operatingCostsFund][profitTokenAddress] += rewardFeeAmount;

        require(s.profitDistributedLogMap[profitTokenAddress][dateString].isDistributed == false, "Profit already distributed");
        s.profitDistributedLogMap[profitTokenAddress][dateString] = ProfitDistributedDetail({
            isDistributed: true,
            brokerageAmount: brokerageAmount,
            revenueAmount: revenueAmount,
            liquidity: liquidity,
            buyBackBurn: buyBackBurn,
            stakingDividends: stakingDividends,
            riskReserve: riskReserve,
            operatingCosts: rewardFeeAmount
        });

        emit ProfitDistribution(dateString, profitTokenAddress, s.profitDistributedLogMap[profitTokenAddress][dateString]);
    }

    function doPayoutVault(PayoutType payoutType, address to, address feeTokenAddress, uint256 amount) external whenNotPaused protected nonReentrant {
        _isPayoutDisabled();
        require(s.feeTokenAddressMap[feeTokenAddress], "Fee token not enabled");
        require(amount > 0, "Amount must be greater than 0");

        require(s.profitVaultMap[payoutType][feeTokenAddress] >= amount, "Insufficient fee vault balance");
        s.profitVaultMap[payoutType][feeTokenAddress] = s.profitVaultMap[payoutType][feeTokenAddress] - amount;

        _tokenTransferOutQuoteCheck("doPayoutVault", feeTokenAddress, amount);
        s.totalPayoutMap[feeTokenAddress] += amount;
        require(IERC20(feeTokenAddress).transfer(to, amount), "Transfer failed");
        emit FeeTokenPayout(payoutType, to, feeTokenAddress, amount);
    }

    function setMinimumOrderSalt(uint256 minimumOrderSalt_) external protected {
        s.minimumOrderSalt = minimumOrderSalt_;
    }

    // Only the StableCoin address (or wrap token address) will be set, because feeToken will calculate the fee based on StableCoin
    function setPayment(address val, bool isEnabled) external protected {
        s.paymentAddressMap[val] = isEnabled;
    }

    function setMaxSlippageBps(uint256 maxSlippageBps) external protected {
        s.maxSlippageBps = maxSlippageBps;
    }

    function setFeeToken(address val, uint256 feeTokenPriceStableCoin, bool isEnabled) external protected {
        s.feeTokenAddressMap[val] = isEnabled;
        s.feeTokenPriceStableCoinMap[val] = feeTokenPriceStableCoin;
        emit FeeTokenUpdated(val, feeTokenPriceStableCoin, isEnabled);
    }

    function setShouldBurnFeeToken(address val, bool isEnabled) external protected {
        s.shouldBurnFeeTokenAddressMap[val] = isEnabled;
    }

    function setMaxFeeRateBps(uint256 val) external protected {
        s.maxFeeRateBps = val;
    }

    // getter functions
    function getProfitDistributedDetail(
        string memory dateString, // YYYYMMDD
        address profitTokenAddress
    ) external view returns (ProfitDistributedDetail memory) {
        require(s.profitDistributedLogMap[profitTokenAddress][dateString].isDistributed == true, "Profit not distributed");
        return s.profitDistributedLogMap[profitTokenAddress][dateString];
    }

    function getRemainingAmount(Order memory order) external view returns (uint256) {
        bytes32 digest = _hashOrder(order);
        return s.orderRemainingMap[digest];
    }

    function isValidatePayment(address val) external view returns (bool) {
        return s.paymentAddressMap[val];
    }

    function getMaxFeeRateBps() external view returns (uint256 maxFeeRateBps) {
        return s.maxFeeRateBps;
    }

    function getFeeTokenInfo(address val) external view returns (FeeTokenInfo memory) {
        return
            FeeTokenInfo({
                isEnabled: s.feeTokenAddressMap[val],
                priceStableCoin: s.feeTokenPriceStableCoinMap[val],
                shouldBurn: s.shouldBurnFeeTokenAddressMap[val],
                decimals: IERC20(val).decimals(),
                // vault states
                vaultAmount: s.feeVaultAmountMap[val],
                profitDistributedAmount: s.feeVaultProfitDistributedAmountMap[val],
                brokerageVault: s.profitVaultMap[PayoutType.brokerage][val],
                liquidityFundVault: s.profitVaultMap[PayoutType.liquidityFund][val],
                buyBackBurnFundVault: s.profitVaultMap[PayoutType.buyBackBurnFund][val],
                stakingDividendsFundVault: s.profitVaultMap[PayoutType.stakingDividendsFund][val],
                riskReserveFundVault: s.profitVaultMap[PayoutType.riskReserveFund][val],
                operatingCostsFundVault: s.profitVaultMap[PayoutType.operatingCostsFund][val],
                totalPayout: s.totalPayoutMap[val]
            });
    }

    function getFeeTokenPrice(address val) external view returns (uint256 priceStableCoin) {
        return s.feeTokenPriceStableCoinMap[val];
    }

    function getMaxSlippageBps() external view returns (uint256) {
        return s.maxSlippageBps;
    }
}

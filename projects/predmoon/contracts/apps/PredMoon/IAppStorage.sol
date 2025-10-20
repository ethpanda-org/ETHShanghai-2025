// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IAppStorage {
    struct ProfitDistributedDetail {
        bool isDistributed;
        uint256 brokerageAmount;
        uint256 revenueAmount;
        uint256 liquidity;
        uint256 buyBackBurn;
        uint256 stakingDividends;
        uint256 riskReserve;
        uint256 operatingCosts;
    }

    enum PayoutType {
        brokerage,
        liquidityFund,
        buyBackBurnFund,
        stakingDividendsFund,
        riskReserveFund,
        operatingCostsFund
    }

    enum OrderSide {
        buy,
        sell
    }

    struct Order {
        uint256 salt;
        address maker;
        uint256 tokenId;
        uint256 tokenAmount;
        uint256 tokenPriceInPaymentToken;
        address paymentTokenAddress;
        uint256 slippageBps;
        uint256 deadline;
        OrderSide side;
        address feeTokenAddress;
        bytes sig;
        // order extra info for exchange to calculate and validate
        uint256 exchangeNftAmount;
        uint256 paymentTokenAmount;
        uint256 fee1Amount;
        address fee1TokenAddress;
        uint256 fee2Amount;
        address fee2TokenAddress;
    }

    struct FeeTokenInfo {
        bool isEnabled;
        uint256 priceStableCoin;
        bool shouldBurn;
        uint256 decimals;
        // vault states
        uint256 vaultAmount;
        uint256 profitDistributedAmount;
        uint256 brokerageVault;
        uint256 liquidityFundVault;
        uint256 buyBackBurnFundVault;
        uint256 stakingDividendsFundVault;
        uint256 riskReserveFundVault;
        uint256 operatingCostsFundVault;
        uint256 totalPayout;
    }
}

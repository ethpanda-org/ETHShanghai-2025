// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IPriceOracle.sol";

interface IBlockETFCore {
    struct AssetInfo {
        address token;
        uint32 weight; // Basis points, 10000 = 100%
        uint224 reserve; // Current reserve amount
    }

    struct FeeInfo {
        uint32 withdrawFee; // Redemption fee rate (basis points)
        uint128 managementFeeRate; // Per-second fee rate (precision 1e27)
        uint256 accumulatedFee; // Accumulated management fees
        uint256 lastCollectTime; // Last collection time
    }

    // Events
    event Mint(address indexed to, uint256 shares, uint256[] amounts);
    event Burn(address indexed from, uint256 shares, uint256[] amounts);
    event Initialized(
        address[] tokens, uint32[] weights, uint256[] amounts, uint256 targetValueUSD, uint256 actualValueUSD
    );
    event FeeUpdated(uint32 withdrawFee, uint256 annualManagementFeeBps);
    event ManagementFeeCollected(address indexed collector, uint256 shares, uint256 feeValue);
    event FeeCollectorUpdated(address indexed feeCollector);
    event PriceOracleUpdated(address indexed oracle);
    event RebalancerUpdated(address indexed rebalancer);
    event RebalanceThresholdUpdated(uint256 threshold);
    event MinRebalanceCooldownUpdated(uint256 cooldown);
    event Rebalanced(uint256[] oldWeights, uint256[] newWeights);
    event WeightsAdjusted(address[] assets, uint32[] newWeights);
    event Paused();
    event Unpaused();
    event RebalanceVerificationThresholdsUpdated(
        uint256 maxSellSlippageBps,
        uint256 maxBuySlippageBps,
        uint256 maxTotalValueLossBps,
        uint256 weightImprovementToleranceBps,
        uint256 unchangedAssetToleranceBps
    );

    // Core functions - can be called by anyone
    function mint(address to) external returns (uint256 shares);

    function mintExactShares(uint256 shares, address to) external returns (uint256[] memory amounts);

    function burn(uint256 shares, address to) external returns (uint256[] memory amounts);

    // Asset management - admin only

    function initialize(address[] calldata _assets, uint32[] calldata _weights, uint256 _targetTotalValueUSD)
        external;

    function flashRebalance(address receiver, bytes calldata data) external;

    function getRebalanceInfo()
        external
        view
        returns (uint256[] memory currentWeights, uint256[] memory targetWeights, bool needsRebalance);

    // Fee management - admin only
    function setFees(uint32 withdrawFee, uint256 annualManagementFeeBps) external;

    function collectManagementFee() external returns (uint256);

    // Price Oracle management - admin only
    function setPriceOracle(address oracle) external;

    // Rebalancer management - admin only
    function setRebalancer(address rebalancer) external;

    function setRebalanceThreshold(uint256 threshold) external;

    // Weight adjustment - admin only
    function adjustWeights(uint32[] calldata newWeights) external;

    function executeRebalance() external;

    // Emergency controls - admin only
    function pause() external;

    function unpause() external;

    // View functions
    function getAssets() external view returns (AssetInfo[] memory);

    function getFeeInfo() external view returns (FeeInfo memory);

    function getTotalValue() external view returns (uint256);

    function getShareValue() external view returns (uint256);

    function calculateMintShares(uint256[] calldata amounts) external view returns (uint256);

    function calculateBurnAmounts(uint256 shares) external view returns (uint256[] memory);

    function calculateRequiredAmounts(uint256 shares) external view returns (uint256[] memory);

    function getAnnualManagementFee() external view returns (uint256); // Returns annualized fee rate (basis points)

    function isPaused() external view returns (bool);

    function priceOracle() external view returns (IPriceOracle);
}

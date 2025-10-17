// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IETFRebalancerV1 {
    // Events
    event RebalanceExecuted(
        address indexed executor, uint256 totalValueBefore, uint256 totalValueAfter, uint256 timestamp
    );

    event AssetSwapped(address indexed fromAsset, address indexed toAsset, uint256 fromAmount, uint256 toAmount);

    event PoolConfigured(address indexed asset, address indexed pool, uint24 fee);

    // Main functions
    function canRebalance() external view returns (bool needed, string memory reason);

    function executeRebalance() external returns (uint256 timestamp);

    // Configuration functions
    function configureAssetPool(address asset, address pool, uint24 fee) external;

    function configureAssetPools(address[] calldata assets, address[] calldata pools, uint24[] calldata fees)
        external;

    function setMaxSlippage(uint256 _maxSlippage) external;
    function setCooldownPeriod(uint256 _cooldownPeriod) external;
    function setMinRebalanceAmount(uint256 _minAmount) external;

    // View functions
    function lastRebalanceTime() external view returns (uint256);
    function maxSlippage() external view returns (uint256);
    function cooldownPeriod() external view returns (uint256);
    function minRebalanceAmount() external view returns (uint256);

    // Pool configuration queries
    function assetPools(address asset) external view returns (address pool);
    function poolFees(address pool) external view returns (uint24 fee);
}

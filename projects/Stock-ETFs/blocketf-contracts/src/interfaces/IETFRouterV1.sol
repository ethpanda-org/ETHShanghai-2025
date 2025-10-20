// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IETFRouterV1 {
    // Events
    event MintWithUSDT(address indexed user, uint256 usdtAmount, uint256 sharesReceived, uint256 usdtRefunded);
    event BurnToUSDT(address indexed user, uint256 sharesBurned, uint256 usdtReceived);
    event SharesMinted(address indexed user, uint256 shares, uint256 usdtUsed, uint256 usdtRefunded);
    event PoolSet(address indexed asset, address indexed pool);
    event SlippageUpdated(uint256 newSlippage);
    event RouterModeUpdated(address indexed asset, bool useV2);
    event TokenRecovered(address indexed token, address indexed to, uint256 amount);

    // Main functions
    function mintWithUSDT(uint256 usdtAmount, uint256 minShares, uint256 deadline) external returns (uint256 shares);

    function burnToUSDT(uint256 shares, uint256 minUSDT, uint256 deadline) external returns (uint256 usdtAmount);

    function mintExactShares(uint256 shares, uint256 maxUSDT, uint256 deadline) external returns (uint256 usdtUsed);

    // View functions for estimation - Ultra intuitive naming
    function usdtNeededForShares(uint256 shares) external view returns (uint256 usdtAmount);

    function sharesToUsdt(uint256 shares) external view returns (uint256 usdtAmount);

    function usdtToShares(uint256 usdtAmount) external view returns (uint256 shares);
}

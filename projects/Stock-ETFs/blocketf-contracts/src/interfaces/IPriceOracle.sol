// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IPriceOracle {
    // Events
    event PriceFeedSet(address indexed token, address feed);

    // Core function - only what we actually need
    function getPrice(address token) external view returns (uint256 price);

    // Batch function for getting multiple prices
    function getPrices(address[] calldata tokens) external view returns (uint256[] memory prices);
}

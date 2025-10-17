// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRebalanceCallback {
    /// @dev Rebalance callback with signed amounts
    /// @param assets Array of asset addresses
    /// @param amounts Array of signed amounts:
    ///                positive = sell this amount
    ///                negative = buy this amount (absolute value)
    ///                zero = no action needed
    /// @param data Additional data passed from caller
    function rebalanceCallback(address[] calldata assets, int256[] calldata amounts, bytes calldata data) external;
}

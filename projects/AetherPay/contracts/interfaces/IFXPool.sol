// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IFXPool {
    function updateRate(string memory pair, uint256 rate, uint256 confidence) external;

    function settleTrade(
        address trader,
        string memory pair,
        uint256 amount,
        uint256 rate
    ) external returns (bool success);

    function getPoolBalance(string memory pair) external view returns (uint256);
}
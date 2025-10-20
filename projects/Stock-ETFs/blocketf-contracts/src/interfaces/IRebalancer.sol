// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRebalancer {
    function executeRebalance(address etf) external;
}

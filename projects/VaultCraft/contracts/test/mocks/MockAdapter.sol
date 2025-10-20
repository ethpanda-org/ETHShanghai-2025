// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.23;

import "../../Vault.sol";

contract MockAdapter is IAdapter {
    int256 public lastPnl;
    uint256 public lastSpent;
    uint256 public lastReceived;
    address public lastCaller;

    function canHandle(address /*token*/ ) external pure returns (bool) {
        return true;
    }

    function execute(bytes calldata data)
        external
        override
        returns (int256 pnl, uint256 spent, uint256 received)
    {
        lastCaller = msg.sender;
        (pnl, spent, received) = abi.decode(data, (int256, uint256, uint256));
        lastPnl = pnl; lastSpent = spent; lastReceived = received;
        return (pnl, spent, received);
    }

    function valuation(address /*vault*/) external pure returns (uint256 assetsInUnderlying) {
        return 0;
    }
}


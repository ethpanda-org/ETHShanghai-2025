// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "../types/UserOperation.sol";

interface IEntryPoint {
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;

    function getNonce(address sender, uint192 key) external view returns (uint256);

    function depositTo(address account) external payable;

    function withdrawTo(address payable withdrawAddress, uint256 amount) external;

    function balanceOf(address account) external view returns (uint256);
}


// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IUserNonceFacet {
    function isNonceUsed(address userAddress, uint256 nonce) external view returns (bool);
}

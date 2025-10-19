// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IPausableFacet {
    function pause() external;

    function unpause() external;
}

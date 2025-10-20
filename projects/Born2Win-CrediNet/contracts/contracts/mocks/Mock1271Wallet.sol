// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/interfaces/IERC1271.sol";

contract Mock1271Wallet is IERC1271 {
    // Allow any digest when enabled, or a specific digest
    bool public allowAll;
    mapping(bytes32 => bool) public allowed;

    function setAllowAll(bool v) external { allowAll = v; }
    function allowDigest(bytes32 digest, bool v) external { allowed[digest] = v; }

    function isValidSignature(bytes32 hash, bytes calldata) external view returns (bytes4) {
        if (allowAll || allowed[hash]) {
            return 0x1626ba7e; // ERC1271 magic value
        }
        return 0xffffffff;
    }
}



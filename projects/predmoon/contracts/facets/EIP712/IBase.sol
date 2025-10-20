// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

interface IEIP712Base {
    event EIP712ConfigChanged(string eip712Name, string eip712Version);
    error VerifySignatureFailed(address userAddress, address signer);
}

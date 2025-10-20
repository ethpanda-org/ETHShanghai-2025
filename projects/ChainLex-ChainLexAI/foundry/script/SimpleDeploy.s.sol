// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "../src/example.sol";

contract SimpleDeploy is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        uRWA20 token = new uRWA20(
            "Universal RWA Token",
            "uRWA",
            0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
        );

        vm.stopBroadcast();

        console.log("Deployed at:");
        console.logAddress(address(token));
    }
}
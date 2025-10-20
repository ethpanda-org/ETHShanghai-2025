// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";

contract SendETHScript is Script {
    function run() external {
        // Use Anvil's default private key (account 0 with 10000 ETH)
        uint256 senderPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address sender = vm.addr(senderPrivateKey);
        
        // Target wallet address that needs ETH
        address target = 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A; // User's wallet address
        
        vm.startBroadcast(senderPrivateKey);
        
        // Check current balance
        console.log("Target address:", target);
        console.log("Current balance:", target.balance);
        
        // Send 100 ETH to target address
        (bool success, ) = target.call{value: 100 ether}("");
        require(success, "ETH transfer failed");
        
        vm.stopBroadcast();
        
        console.log("=== ETH Transfer Complete ===");
        console.log("From:", sender);
        console.log("To:", target);
        console.log("Amount: 100 ETH");
        console.log("New balance:", target.balance);
    }
}

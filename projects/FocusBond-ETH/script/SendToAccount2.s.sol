// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/MockUSDC.sol";
import "../contracts/MockFOCUS.sol";

contract SendToAccount2Script is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Contract addresses
        MockUSDC usdc = MockUSDC(0x5FbDB2315678afecb367f032d93F642f64180aa3);
        MockFOCUS focus = MockFOCUS(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);

        // Account #2 address
        address account2 = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
        
        // Send ETH
        (bool success, ) = account2.call{value: 100 ether}("");
        require(success, "ETH transfer failed");
        
        // Mint tokens
        usdc.mint(account2, 50000 * 1e6); // 50,000 USDC
        focus.mint(account2, 500000 * 1e18); // 500,000 FOCUS

        vm.stopBroadcast();

        console.log("=== Funds sent to Account #2 ===");
        console.log("Address:", account2);
        console.log("ETH Balance:", account2.balance);
        console.log("USDC Balance:", usdc.balanceOf(account2));
        console.log("FOCUS Balance:", focus.balanceOf(account2));
    }
}

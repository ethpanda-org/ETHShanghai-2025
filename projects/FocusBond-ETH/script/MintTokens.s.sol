// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/MockUSDC.sol";
import "../contracts/FocusCredit.sol";

contract MintTokensScript is Script {
    function run() external {
        // Use Anvil's default private key for local deployment
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Contract addresses from latest deployment
        MockUSDC usdc = MockUSDC(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0);
        FocusCredit focus = FocusCredit(0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9);

        // User's wallet address
        address userWallet = 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A;
        
        // Mint tokens to deployer account
        usdc.mint(deployer, 10000 * 1e6); // 10,000 USDC
        focus.mint(deployer, 100000 * 1e18); // 100,000 FOCUS
        
        // Mint tokens to user's wallet
        usdc.mint(userWallet, 50000 * 1e6); // 50,000 USDC
        focus.mint(userWallet, 500000 * 1e18); // 500,000 FOCUS

        vm.stopBroadcast();

        console.log("=== Token Minting Complete ===");
        console.log("Deployer:", deployer);
        console.log("Deployer USDC Balance:", usdc.balanceOf(deployer));
        console.log("Deployer FOCUS Balance:", focus.balanceOf(deployer));
        console.log("");
        console.log("User Wallet:", userWallet);
        console.log("User USDC Balance:", usdc.balanceOf(userWallet));
        console.log("User FOCUS Balance:", focus.balanceOf(userWallet));
    }
}

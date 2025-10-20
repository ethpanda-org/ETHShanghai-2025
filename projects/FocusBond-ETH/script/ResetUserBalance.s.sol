// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/MockUSDC.sol";
import "../contracts/FocusCredit.sol";

contract ResetUserBalanceScript is Script {
    function run() external {
        // Use Anvil's default private key for local deployment
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Contract addresses from latest deployment
        MockUSDC usdc = MockUSDC(0x5FbDB2315678afecb367f032d93F642f64180aa3);
        FocusCredit focus = FocusCredit(0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512);

        // User's wallet address (default test address)
        address userWallet = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266;
        
        // Reset FOCUS balance to 2000 tokens
        uint256 currentFocusBalance = focus.balanceOf(userWallet);
        if (currentFocusBalance > 2000 * 1e18) {
            // Burn excess tokens
            focus.burn(userWallet, currentFocusBalance - 2000 * 1e18);
        } else if (currentFocusBalance < 2000 * 1e18) {
            // Mint additional tokens
            focus.mint(userWallet, (2000 * 1e18) - currentFocusBalance);
        }

        vm.stopBroadcast();

        console.log("=== User Balance Reset Complete ===");
        console.log("User Wallet:", userWallet);
        console.log("FOCUS Balance Reset to:", focus.balanceOf(userWallet));
        console.log("Note: ETH balance reset requires sending 1 ETH to user wallet manually");
        console.log("Command: cast send --value 1ether 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80");
    }
}
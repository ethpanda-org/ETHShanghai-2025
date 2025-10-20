// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../contracts/FocusCredit.sol";

contract ResetBalanceFinal is Script {
    address constant USER = 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A;
    address constant FOCUS_TOKEN = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        FocusCredit focusCredit = FocusCredit(FOCUS_TOKEN);
        
        // Check current balance
        uint256 currentBalance = focusCredit.balanceOf(USER);
        console.log("Current FOCUS balance:", currentBalance / 1e18, "FOCUS");
        
        // Calculate the adjustment needed
        uint256 targetBalance = 2000 * 1e18;
        
        if (currentBalance > targetBalance) {
            // Need to burn excess tokens
            uint256 burnAmount = currentBalance - targetBalance;
            console.log("Need to burn:", burnAmount / 1e18, "FOCUS");
            
            // Try to burn the excess
            try focusCredit.revokeCredits(USER, burnAmount, "Reset to 2000 FOCUS") {
                console.log("Successfully burned excess tokens");
            } catch Error(string memory reason) {
                console.log("Burn failed:", reason);
                // Alternative approach: set balance to 0 first, then grant 2000
                console.log("Trying alternative approach...");
                focusCredit.revokeCredits(USER, currentBalance, "Reset balance to 0");
                focusCredit.grantCredits(USER, targetBalance, "Set balance to 2000 FOCUS");
            }
        } else if (currentBalance < targetBalance) {
            // Need to grant more tokens
            uint256 grantAmount = targetBalance - currentBalance;
            console.log("Need to grant:", grantAmount / 1e18, "FOCUS");
            focusCredit.grantCredits(USER, grantAmount, "Set balance to 2000 FOCUS");
        } else {
            console.log("Balance is already 2000 FOCUS");
        }
        
        // Verify final balance
        uint256 finalBalance = focusCredit.balanceOf(USER);
        console.log("Final FOCUS balance:", finalBalance / 1e18, "FOCUS");
        
        // Send 1 ETH if needed
        uint256 ethBalance = USER.balance;
        if (ethBalance < 1 ether) {
            uint256 ethToSend = 1 ether - ethBalance;
            (bool success, ) = USER.call{value: ethToSend}("");
            require(success, "ETH transfer failed");
            console.log("Sent", ethToSend / 1e18, "ETH");
        } else {
            console.log("ETH balance sufficient:", ethBalance / 1e18, "ETH");
        }
        
        vm.stopBroadcast();
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}
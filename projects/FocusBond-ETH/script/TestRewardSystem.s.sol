// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/FocusBond.sol";
import "../contracts/MockUSDC.sol";
import "../contracts/MockFOCUS.sol";

contract TestRewardSystemScript is Script {
    function run() external {
        uint256 userPrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d; // Account #1
        address user = vm.addr(userPrivateKey);
        
        vm.startBroadcast(userPrivateKey);

        FocusBond focusBond = FocusBond(0x959922bE3CAee4b8Cd9a407cc3ac1C251C2007B1);
        MockUSDC usdc = MockUSDC(0x9A676e781A523b5d0C0e43731313A708CB607508);
        MockFOCUS focus = MockFOCUS(0x0B306BF915C4d645ff596e518fAf3F9669b97016);

        console.log("=== Testing New Reward System ===");
        console.log("User address:", user);
        console.log("User ETH balance:", user.balance);
        
        // Check current fees
        uint256 usdcFee = focusBond.baseFeeUsdc();
        uint256 focusFee = focusBond.baseFeeFocus();
        console.log("USDC base fee:", usdcFee);
        console.log("FOCUS base fee:", focusFee);
        
        // Check contract balance for rewards
        console.log("Contract ETH balance:", address(focusBond).balance);
        
        // Start a 2-minute session with 0.1 ETH stake
        uint256 stakeAmount = 0.1 ether;
        console.log("Starting session with 0.1 ETH stake...");
        
        focusBond.startSession{value: stakeAmount}(2); // 2 minutes
        
        // Check session
        FocusBond.Session memory session = focusBond.getSession(user);
        console.log("Session started:");
        console.log("  Deposit:", session.depositWei);
        console.log("  Target minutes:", session.targetMinutes);
        console.log("  Is active:", session.isActive);
        
        // Calculate expected reward (5% of deposit)
        uint256 expectedReward = (stakeAmount * 5) / 100;
        console.log("Expected completion reward:", expectedReward);
        
        vm.stopBroadcast();
        
        console.log("=== Test Session Created ===");
        console.log("Wait 2+ minutes, then call completeSession() to get reward!");
        console.log("Or call breakSession to test penalty system!");
    }
}

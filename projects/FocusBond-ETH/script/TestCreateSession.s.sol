// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/FocusBond.sol";

contract TestCreateSessionScript is Script {
    function run() external {
        // 使用用户的私钥进行测试
        uint256 userPrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d; // Anvil account #1
        address user = vm.addr(userPrivateKey);
        
        vm.startBroadcast(userPrivateKey);

        // 合约地址
        FocusBond focusBond = FocusBond(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0);
        
        console.log("=== Test Create Session ===");
        console.log("User address:", user);
        console.log("User ETH balance:", user.balance);
        console.log("FocusBond contract address:", address(focusBond));
        
        // Check contract configuration
        console.log("Base fee USDC:", focusBond.baseFeeUsdc());
        console.log("Base fee FOCUS:", focusBond.baseFeeFocus());
        console.log("Min complete minutes:", focusBond.minCompleteMinutes());
        
        // Try to start session
        focusBond.startSession{value: 0.1 ether}(60); // 60 minutes
        
        console.log("Session started successfully!");
        
        // Read session info
        (
            uint64 startTs,
            uint64 lastHeartbeatTs,
            uint96 depositWei,
            uint16 targetMinutes,
            bool isActive,
            bool watchdogClosed
        ) = focusBond.sessions(user);
        
        console.log("Session details:");
        console.log("- Start timestamp:", startTs);
        console.log("- Last heartbeat:", lastHeartbeatTs);
        console.log("- Deposit amount:", depositWei);
        console.log("- Target minutes:", targetMinutes);
        console.log("- Is active:", isActive);
        console.log("- Watchdog closed:", watchdogClosed);

        vm.stopBroadcast();
    }
}

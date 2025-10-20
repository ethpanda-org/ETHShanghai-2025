// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/FocusBond.sol";

contract TestFeeCalculationScript is Script {
    function run() external {
        // 使用用户的私钥进行测试
        uint256 userPrivateKey = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d; // Anvil account #1
        address user = vm.addr(userPrivateKey);
        
        // 合约地址
        FocusBond focusBond = FocusBond(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0);
        address usdcAddress = 0x5FbDB2315678afecb367f032d93F642f64180aa3;
        address focusAddress = 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512;
        
        console.log("=== Test Fee Calculation ===");
        console.log("User address:", user);
        console.log("FocusBond contract:", address(focusBond));
        
        // 检查用户是否有活跃会话
        (
            uint64 startTs,
            uint64 lastHeartbeatTs,
            uint96 depositWei,
            uint16 targetMinutes,
            bool isActive,
            bool watchdogClosed
        ) = focusBond.sessions(user);
        
        console.log("Session info:");
        console.log("- Is active:", isActive);
        console.log("- Start time:", startTs);
        console.log("- Target minutes:", targetMinutes);
        console.log("- Deposit:", depositWei);
        
        if (isActive) {
            // 计算当前的中断费用
            uint256 usdcFee = focusBond.calculateBreakFee(user, usdcAddress);
            uint256 focusFee = focusBond.calculateBreakFee(user, focusAddress);
            
            console.log("Break fees:");
            console.log("- USDC fee:", usdcFee);
            console.log("- FOCUS fee:", focusFee);
            
            // 计算经过的时间
            uint256 currentTime = block.timestamp;
            uint256 elapsedMinutes = (currentTime - startTs) / 60;
            uint256 remainingMinutes = targetMinutes > elapsedMinutes ? targetMinutes - elapsedMinutes : 0;
            
            console.log("Timing:");
            console.log("- Elapsed minutes:", elapsedMinutes);
            console.log("- Remaining minutes:", remainingMinutes);
            console.log("- Completion percentage:", (elapsedMinutes * 100) / targetMinutes);
            
            // 显示基础费用信息
            console.log("Base fees:");
            console.log("- Base USDC fee:", focusBond.baseFeeUsdc());
            console.log("- Base FOCUS fee:", focusBond.baseFeeFocus());
        } else {
            console.log("No active session found");
        }
    }
}

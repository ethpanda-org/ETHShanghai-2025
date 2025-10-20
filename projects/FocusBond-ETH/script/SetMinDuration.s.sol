// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/FocusBond.sol";

contract SetMinDurationScript is Script {
    function run() external {
        // 使用部署者的私钥（默认管理员）
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // 合约地址
        FocusBond focusBond = FocusBond(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0);
        
        console.log("=== Set Minimum Duration ===");
        console.log("Admin address:", deployer);
        console.log("FocusBond contract:", address(focusBond));
        
        // 检查当前的最小完成时间
        uint16 currentMinMinutes = focusBond.minCompleteMinutes();
        console.log("Current min complete minutes:", currentMinMinutes);
        
        // 设置为1分钟
        focusBond.setMinCompleteMinutes(1);
        
        // 验证设置
        uint16 newMinMinutes = focusBond.minCompleteMinutes();
        console.log("New min complete minutes:", newMinMinutes);
        
        vm.stopBroadcast();
        
        console.log("=== Configuration Updated ===");
        console.log("Minimum session duration changed from %d to %d minutes", currentMinMinutes, newMinMinutes);
    }
}

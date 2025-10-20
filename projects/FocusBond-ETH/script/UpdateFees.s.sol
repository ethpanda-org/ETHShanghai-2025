// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/FocusBond.sol";

contract UpdateFeesScript is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address admin = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        FocusBond focusBond = FocusBond(0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0);

        console.log("=== Update Fees Configuration ===");
        console.log("Admin address:", admin);
        console.log("FocusBond contract:", address(focusBond));
        
        // 获取当前费用
        uint256 currentUsdcFee = focusBond.baseFeeUsdc();
        uint256 currentFocusFee = focusBond.baseFeeFocus();
        
        console.log("Current USDC base fee:", currentUsdcFee);
        console.log("Current FOCUS base fee:", currentFocusFee);
        
        // 设置更高的基础费用 (确保大于gas费用)
        // USDC: 10 USDC (10 * 10^6)
        // FOCUS: 100 FOCUS (100 * 10^18)
        uint256 newUsdcFee = 10 * 10**6;  // 10 USDC
        uint256 newFocusFee = 100 * 10**18; // 100 FOCUS
        
        focusBond.setBaseFeeUsdc(newUsdcFee);
        focusBond.setBaseFeeFocus(newFocusFee);
        
        console.log("New USDC base fee:", newUsdcFee);
        console.log("New FOCUS base fee:", newFocusFee);
        
        vm.stopBroadcast();
        
        console.log("=== Fees Updated Successfully ===");
        console.log("USDC base fee: 10 USDC (ensures penalty > gas cost)");
        console.log("FOCUS base fee: 100 FOCUS (ensures penalty > gas cost)");
    }
}

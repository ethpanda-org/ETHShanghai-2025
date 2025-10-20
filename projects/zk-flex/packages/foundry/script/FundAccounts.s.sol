// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";

/**
 * @title FundAccounts
 * @notice 给你的地址真正转账 ETH
 * @dev 使用 Anvil Account #0 给其他地址转账
 */
contract FundAccounts is Script {
    
    function run() external {
        // 从环境变量读取地址
        address bobReal = vm.envOr("BOB_REAL_ADDRESS", address(0x15AfABaA426334636008Bc15805760716E8b5c5E));
        address bobProxy = vm.envOr("BOB_PROXY_ADDRESS", address(0xBA699556d41CD93e794952Bf1476ce9069b1EA03));
        address alice = vm.envOr("ALICE_ADDRESS", address(0x332772fce634D38cdfC649beE923AF52c9b6a2E5));
        
        console.log("Funding accounts from Anvil Account #0...");
        console.log("");
        
        // 使用 Anvil Account #0 的私钥（有 10,000 ETH）
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("From (Anvil #0):", deployer);
        console.log("Balance:", deployer.balance / 1 ether, "ETH");
        console.log("");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 真正的转账（会在链上发生）
        if (bobReal != deployer) {
            payable(bobReal).transfer(100 ether);
            console.log("[OK] Transferred 100 ETH to Bob_real:", bobReal);
        }
        
        if (bobProxy != deployer) {
            payable(bobProxy).transfer(50 ether);
            console.log("[OK] Transferred 50 ETH to Bob_proxy:", bobProxy);
        }
        
        if (alice != deployer && alice != bobReal && alice != bobProxy) {
            payable(alice).transfer(10 ether);
            console.log("[OK] Transferred 10 ETH to Alice:", alice);
        }
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("Funding complete! Check MetaMask.");
        console.log("");
    }
}


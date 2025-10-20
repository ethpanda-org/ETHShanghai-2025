// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "forge-std/Script.sol";
import "../src/eip7702/DeadManSwitchRegistry.sol";
import "../src/eip7702/DeadManSwitchEnforcer.sol";
import "../src/eip7702/AssetTransferExecutor.sol";

contract DeployEIP7702 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. 部署 Registry
        DeadManSwitchRegistry registry = new DeadManSwitchRegistry();
        console.log("DeadManSwitchRegistry deployed at:", address(registry));

        // 2. 部署 Enforcer
        DeadManSwitchEnforcer enforcer = new DeadManSwitchEnforcer(address(registry));
        console.log("DeadManSwitchEnforcer deployed at:", address(enforcer));

        // 3. 部署 AssetExecutor
        AssetTransferExecutor executor = new AssetTransferExecutor(address(registry));
        console.log("AssetTransferExecutor deployed at:", address(executor));

        vm.stopBroadcast();

        // 输出部署信息
        console.log("\n=== Deployment Summary ===");
        console.log("Registry:", address(registry));
        console.log("Enforcer:", address(enforcer));
        console.log("Executor:", address(executor));
    }
}

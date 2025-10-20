// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/uRWA.sol";
import "../src/ChainlinkRisk.sol";

contract CompleteDeployURWAScript is Script {
    function run() external {
        // 从环境变量获取私钥，如果未设置则使用默认值
        uint256 deployerPrivateKey  = 0xd622dc3961df2132861b6a312fbcb96448f9e37645dd63cfeb700c1a68193ae9;
        if (deployerPrivateKey == 0) {
            deployerPrivateKey = 0xd622dc3961df2132861b6a312fbcb96448f9e37645dd63cfeb700c1a68193ae9;
        }
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with account:", deployer);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // 首先部署 ChainlinkRisk 合约
        console.log("Deploying ChainlinkRisk contract...");
        ChainlinkRisk riskAssessment = new ChainlinkRisk(deployer);
        console.log("ChainlinkRisk contract deployed at:", address(riskAssessment));

        // 部署 uRWA 合约
        console.log("Deploying uRWA contract...");
        uRWA token = new uRWA(
            "Universal RWA Token",
            "uRWA",
            deployer,
            address(riskAssessment)
        );
        console.log("uRWA contract deployed at:", address(token));

        vm.stopBroadcast();

        console.log("Deployment completed successfully!");
        console.log("ChainlinkRisk address:", address(riskAssessment));
        console.log("uRWA address:", address(token));
        console.log("Deployer address:", deployer);

        // 输出用于验证的命令
        console.log("");
        console.log("To verify the contracts, run the following commands:");
        console.logString(string.concat("forge verify-contract ", vm.toString(address(riskAssessment)), " src/ChainlinkRisk.sol:ChainlinkRisk --chain sepolia --constructor-args $(cast abi-encode \"constructor(address)\" ", vm.toString(deployer), ")"));
        console.logString(string.concat("forge verify-contract ", vm.toString(address(token)), " src/uRWA.sol:uRWA --chain sepolia --constructor-args $(cast abi-encode \"constructor(string,string,address,address)\" \"Universal RWA Token\" \"uRWA\" ", vm.toString(deployer), " ", vm.toString(address(riskAssessment)), ")"));
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/uRWA.sol";
import "../src/ChainlinkRisk.sol";

contract DeployAndVerifyURWAScript is Script {
    function run() external {
        // 使用您提供的私钥（请在实际部署时替换为环境变量）
        uint256 deployerPrivateKey = 0xd622dc3961df2132861b6a312fbcb96448f9e37645dd63cfeb700c1a68193ae9;
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying contracts with account:", deployer);

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
    }

    // 验证函数需要在部署后手动调用
    // 请将下面的地址替换为实际部署的合约地址
    function verifyContracts(
        address chainlinkRiskAddress,
        address uRWAAddress,
        address deployer
    ) external {
        console.log("Verifying contracts on Etherscan...");

        // 验证 ChainlinkRisk 合约
        console.log("Verifying ChainlinkRisk contract at:", chainlinkRiskAddress);

        // 验证 uRWA 合约
        console.log("Verifying uRWA contract at:", uRWAAddress);

        console.log("Verification commands (run manually after deployment):");
        console.logString(string.concat("forge verify-contract ", vm.toString(chainlinkRiskAddress), " src/ChainlinkRisk.sol:ChainlinkRisk --chain sepolia --constructor-args $(cast abi-encode \"constructor(address)\" ", vm.toString(deployer), ")"));
        console.logString(string.concat("forge verify-contract ", vm.toString(uRWAAddress), " src/uRWA.sol:uRWA --chain sepolia --constructor-args $(cast abi-encode \"constructor(string,string,address,address)\" \"Universal RWA Token\" \"uRWA\" ", vm.toString(deployer), " ", vm.toString(chainlinkRiskAddress), ")"));
    }
}
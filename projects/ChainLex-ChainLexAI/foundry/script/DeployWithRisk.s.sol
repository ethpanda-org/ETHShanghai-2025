// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "../src/ChainlinkRisk.sol";
import "../src/uRWA.sol";

contract DeployWithRiskScript is Script {
    function run() external {
        // 使用提供的私钥
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        // 第一步：部署 ChainlinkRisk 合约
        ChainlinkRisk riskContract = new ChainlinkRisk(vm.addr(deployerPrivateKey));

        console.log("ChainlinkRisk contract deployed at:", address(riskContract));

        // 第二步：部署 uRWA 合约，传入 ChainlinkRisk 合约地址
        uRWA token = new uRWA(
            "Universal RWA Token with Risk Assessment",
            "uRWA-R",
            vm.addr(deployerPrivateKey),
            address(riskContract)
        );

        vm.stopBroadcast();

        console.log("uRWA contract deployed successfully!");
        console.log("Contract address:", address(token));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Token name:", token.name());
        console.log("Token symbol:", token.symbol());
        console.log("Total supply:", token.totalSupply());

        // 验证接口支持
        console.log("Supports IERC7943:", token.supportsInterface(type(IERC7943).interfaceId));
        console.log("Supports IERC20:", token.supportsInterface(type(IERC20).interfaceId));
        console.log("Supports IERC165:", token.supportsInterface(type(IERC165).interfaceId));

        // 显示风险评估配置
        console.log("Risk Assessment Contract:", address(token.riskAssessment()));
        console.log("Risk Assessment Enabled:", token.enableRiskAssessment());
        console.log("Whitelist Enabled:", token.enableWhitelist());
    }
}
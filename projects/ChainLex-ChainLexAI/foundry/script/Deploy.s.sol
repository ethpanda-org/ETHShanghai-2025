// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

import "forge-std/Script.sol";
import "../src/example.sol";

contract DeployScript is Script {
    function run() external {
        // 使用提供的私钥
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;

        vm.startBroadcast(deployerPrivateKey);

        // 部署uRWA20合约
        // 代币名称：Universal RWA Token
        // 代币符号：uRWA
        // 初始管理员：部署者地址
        uRWA20 token = new uRWA20(
            "Universal RWA Token",
            "uRWA",
            vm.addr(deployerPrivateKey)
        );

        vm.stopBroadcast();

        console.log("uRWA20 contract deployed successfully!");
        console.log("Contract address:", address(token));
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Token name:", token.name());
        console.log("Token symbol:", token.symbol());
        console.log("Total supply:", token.totalSupply());
    }
}
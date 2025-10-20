// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title UpgradeAaveProxy
 * @notice 升级 AaveFundingPool 代理到新实现
 */
contract UpgradeAaveProxyScript is Script {
    address constant PROXY_ADMIN = 0x7bc6535d75541125fb3b494deCfdE10Db20C16d8;
    address constant AAVE_POOL_PROXY = 0xAb20B978021333091CA307BB09E022Cec26E8608;
    address constant NEW_IMPLEMENTATION = 0xE986c11a0aF002007f7B7240916EFBd5b312Fc4E;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Upgrading AaveFundingPool Proxy");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("");
        
        ProxyAdmin proxyAdmin = ProxyAdmin(PROXY_ADMIN);
        
        console.log("Proxy:", AAVE_POOL_PROXY);
        console.log("New Implementation:", NEW_IMPLEMENTATION);
        console.log("");
        
        // 升级（不重新初始化）
        console.log("Upgrading...");
        proxyAdmin.upgradeAndCall(
            ITransparentUpgradeableProxy(AAVE_POOL_PROXY),
            NEW_IMPLEMENTATION,
            "" // 空数据
        );
        
        console.log("SUCCESS: Proxy upgraded!");
        console.log("");
        
        // 验证升级
        console.log("Verifying upgrade...");
        console.log("Note: Check implementation on Etherscan:");
        console.log("  ", AAVE_POOL_PROXY);
        
        vm.stopBroadcast();
        
        console.log("");
        console.log("===========================================");
        console.log("Upgrade Complete!");
        console.log("===========================================");
    }
}


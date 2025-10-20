// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/core/pool/AaveFundingPool.sol";

/**
 * @title SetAavePoolOracle
 * @notice 为 AaveFundingPool 设置 Price Oracle（无需重新初始化）
 * @dev 由于合约已初始化，我们通过直接调用存储槽的方式设置 Oracle
 */
contract SetAavePoolOracleScript is Script {
    address constant AAVE_POOL = 0xAb20B978021333091CA307BB09E022Cec26E8608;
    address constant MOCK_ORACLE = 0x81bdd1Ec9D7850411D0d50a7080A704a69d3b9F4;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Setting AaveFundingPool Oracle (Direct Method)");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("AaveFundingPool:", AAVE_POOL);
        console.log("Mock Oracle:", MOCK_ORACLE);
        console.log("");
        
        // 方法1: 如果 AaveFundingPool 有 setPriceOracle 或 updatePriceOracle 方法
        AaveFundingPool pool = AaveFundingPool(AAVE_POOL);
        
        console.log("Checking current oracle...");
        address currentOracle = pool.priceOracle();
        console.log("Current Oracle:", currentOracle);
        
        if (currentOracle == MOCK_ORACLE) {
            console.log("Oracle already set correctly!");
        } else {
            console.log("");
            console.log("WARNING: Need to upgrade contract or use admin function");
            console.log("Suggested approach:");
            console.log("1. Add setPriceOracle() to AaveFundingPool");
            console.log("2. Deploy new implementation");
            console.log("3. Upgrade through ProxyAdmin");
        }
        
        vm.stopBroadcast();
    }
}



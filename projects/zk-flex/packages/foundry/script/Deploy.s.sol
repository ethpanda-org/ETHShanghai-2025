// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WealthProofRegistry} from "../contracts/WealthProofRegistry.sol";

/**
 * @title Deploy
 * @notice 主部署脚本 - 用于 yarn deploy
 * @dev 部署 WealthProofRegistry，Scaffold-ETH 会自动生成 deployedContracts.ts
 */
contract DeployScript is Script {
    
    error InvalidPrivateKey(string);

    function run() external {
        uint256 deployerPrivateKey = setupLocalhostEnv();
        if (deployerPrivateKey == 0) {
            revert InvalidPrivateKey(
                "You don't have a deployer account. Make sure you have set DEPLOYER_PRIVATE_KEY in .env or use `yarn generate` to generate a new random account"
            );
        }
        
        vm.startBroadcast(deployerPrivateKey);
        
        WealthProofRegistry registry = new WealthProofRegistry();
        
        console.log("WealthProofRegistry deployed at:", address(registry));
        console.log("Groth16Verifier deployed at:", address(registry.verifier()));
        
        vm.stopBroadcast();
        
        exportDeployments();
    }
    
    function setupLocalhostEnv() internal returns (uint256) {
        if (block.chainid == 31337) {
            // Anvil default account #0 private key
            return 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        } else {
            return vm.envUint("DEPLOYER_PRIVATE_KEY");
        }
    }
    
    function exportDeployments() internal {
        // Scaffold-ETH will automatically generate deployedContracts.ts
        // based on the broadcast files
    }
    
    function test() public {}
}


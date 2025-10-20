// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma abicoder v2;

import "forge-std/Script.sol";
import "../src/Quoter.sol";

/**
 * @title DeployQuoter
 * @notice Deploy Quoter contract for PancakeSwap V3 on BSC Testnet
 * @dev Usage: forge script script/DeployQuoter.s.sol --rpc-url bnb_testnet --broadcast --verify
 */
contract DeployQuoter is Script {
    // PancakeSwap V3 Deployer on BSC Testnet
    address constant PANCAKE_V3_DEPLOYER = 0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        console.log("========================================");
        console.log("Deploying Quoter for PancakeSwap V3");
        console.log("========================================");
        console.log("V3Deployer:", PANCAKE_V3_DEPLOYER);
        console.log("Deployer:", vm.addr(deployerPrivateKey));
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        Quoter quoter = new Quoter(PANCAKE_V3_DEPLOYER);

        vm.stopBroadcast();

        console.log("========================================");
        console.log("Deployment Complete");
        console.log("========================================");
        console.log("Quoter deployed at:", address(quoter));
        console.log("");
        console.log("Save this address for future use!");
    }
}

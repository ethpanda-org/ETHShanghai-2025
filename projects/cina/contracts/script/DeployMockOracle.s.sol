// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/mocks/MockPriceOracle.sol";

contract DeployMockOracleScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploying Mock Price Oracle to Sepolia");
        console.log("===========================================");
        console.log("");
        
        // Deploy MockPriceOracle
        // Parameters: anchorPrice, minPrice, maxPrice (all in 18 decimals)
        uint256 price = 1e18; // 1 USD
        MockPriceOracle mockOracle = new MockPriceOracle(price, price, price);
        console.log("MockPriceOracle deployed:", address(mockOracle));
        console.log("Prices set: anchor=1.0, min=1.0, max=1.0 USD");
        
        console.log("");
        console.log("===========================================");
        console.log("Deployment Summary");
        console.log("===========================================");
        console.log("MockPriceOracle:", address(mockOracle));
        console.log("Anchor Price: 1.0 USD");
        console.log("Min Price: 1.0 USD");
        console.log("Max Price: 1.0 USD");
        
        vm.stopBroadcast();
    }
}


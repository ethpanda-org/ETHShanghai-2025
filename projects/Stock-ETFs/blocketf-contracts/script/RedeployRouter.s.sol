// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {ETFRouterV1} from "../src/ETFRouterV1.sol";

/**
 * @title RedeployRouter
 * @notice Redeploy Router contract with mintWithUSDT bug fix
 */
contract RedeployRouter is Script {
    using stdJson for string;

    function run() public {
        // Load existing contract addresses
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        address etfCore = json.readAddress(".contracts.etfCore.contractAddress");
        address quoterV3 = json.readAddress(".contracts.quoterV3.contractAddress");
        address usdt = json.readAddress(".contracts.mockTokens[5].contractAddress");
        address wbnb = json.readAddress(".contracts.mockTokens[0].contractAddress");

        // PancakeSwap addresses on BSC Testnet
        address v3Router = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
        address v2Router = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

        // Price Oracle - from deployed contracts
        address priceOracle = json.readAddress(".contracts.priceOracle.contractAddress");

        console2.log("========================================");
        console2.log("Redeploying Router Contract");
        console2.log("========================================");
        console2.log("ETF Core:", etfCore);
        console2.log("V3 Router:", v3Router);
        console2.log("Price Oracle:", priceOracle);
        console2.log("V2 Router:", v2Router);
        console2.log("QuoterV3:", quoterV3);
        console2.log("USDT:", usdt);
        console2.log("WBNB:", wbnb);
        console2.log("");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deployer:", deployer);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy new Router
        ETFRouterV1 router = new ETFRouterV1(
            etfCore,
            v3Router,
            priceOracle,
            v2Router,
            quoterV3,
            usdt,
            wbnb
        );

        vm.stopBroadcast();

        console2.log("========================================");
        console2.log("New Router deployed at:", address(router));
        console2.log("========================================");
        console2.log("");
        console2.log("IMPORTANT: Update the following:");
        console2.log("1. deployed-contracts.json");
        console2.log("2. Configure V3 pools: forge script script/ConfigureRouterPools.s.sol");
        console2.log("3. Update frontend addresses");
        console2.log("4. Grant MINTER_ROLE to new Router in ETFCore");
    }
}

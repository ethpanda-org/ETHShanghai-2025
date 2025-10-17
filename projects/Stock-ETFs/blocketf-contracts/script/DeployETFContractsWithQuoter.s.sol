// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BlockETFCore} from "../src/BlockETFCore.sol";
import {ETFRouterV1} from "../src/ETFRouterV1.sol";
import {ETFRebalancerV1} from "../src/ETFRebalancerV1.sol";

/**
 * @title DeployETFContractsWithQuoter
 * @notice Deploy BlockETFCore, ETFRouterV1, and ETFRebalancerV1 with manual QuoterV3 address
 * @dev Usage:
 *      1. First deploy QuoterV3 in the view-quoter-v3 project
 *      2. Update QUOTER_V3 constant below with the deployed address
 *      3. Run: forge script script/DeployETFContractsWithQuoter.s.sol --rpc-url bnb_testnet --broadcast
 */
contract DeployETFContractsWithQuoter is Script {
    using stdJson for string;

    // PancakeSwap addresses on BSC Testnet
    address constant PANCAKE_V3_SWAP_ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
    address constant PANCAKE_V2_ROUTER = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

    // ⚠️ UPDATE THIS ADDRESS AFTER DEPLOYING QUOTER_V3! ⚠️
    address constant QUOTER_V3 = address(0); // TODO: Set this after deploying QuoterV3

    // Addresses from deployed-contracts.json
    address public priceOracle;
    address public wbnb;
    address public usdt;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying ETF Contracts");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("");

        // Validate QuoterV3 address
        if (QUOTER_V3 == address(0)) {
            console2.log("ERROR: QuoterV3 address not set!");
            console2.log("");
            console2.log("Please follow these steps:");
            console2.log("1. Deploy QuoterV3:");
            console2.log("   cd ../view-quoter-v3");
            console2.log("   forge script script/DeployQuoter.s.sol --rpc-url bnb_testnet --broadcast");
            console2.log("");
            console2.log("2. Copy the deployed QuoterV3 address");
            console2.log("");
            console2.log("3. Update QUOTER_V3 constant in this script");
            console2.log("");
            console2.log("4. Run this script again");
            console2.log("");
            revert("QuoterV3 address required");
        }

        // Load addresses from deployed-contracts.json
        loadContractsFromJson();

        console2.log("Using addresses:");
        console2.log("  PriceOracle:   ", priceOracle);
        console2.log("  WBNB:          ", wbnb);
        console2.log("  USDT:          ", usdt);
        console2.log("  V3 SwapRouter: ", PANCAKE_V3_SWAP_ROUTER);
        console2.log("  V2 Router:     ", PANCAKE_V2_ROUTER);
        console2.log("  QuoterV3:      ", QUOTER_V3);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy BlockETFCore
        console2.log("Step 1/4: Deploying BlockETFCore...");
        BlockETFCore etfCore = new BlockETFCore("Block ETF", "BETF", priceOracle);
        console2.log("  BlockETFCore deployed at:", address(etfCore));
        console2.log("");

        // 2. Deploy ETFRebalancerV1
        console2.log("Step 2/4: Deploying ETFRebalancerV1...");
        ETFRebalancerV1 rebalancer =
            new ETFRebalancerV1(address(etfCore), PANCAKE_V3_SWAP_ROUTER, PANCAKE_V2_ROUTER, usdt, wbnb);
        console2.log("  ETFRebalancerV1 deployed at:", address(rebalancer));
        console2.log("");

        // 3. Deploy ETFRouterV1
        console2.log("Step 3/4: Deploying ETFRouterV1...");
        ETFRouterV1 router = new ETFRouterV1(
            address(etfCore), PANCAKE_V3_SWAP_ROUTER, priceOracle, PANCAKE_V2_ROUTER, QUOTER_V3, usdt, wbnb
        );
        console2.log("  ETFRouterV1 deployed at:", address(router));
        console2.log("");

        // 4. Set Rebalancer in Core
        console2.log("Step 4/4: Configuring contracts...");
        etfCore.setRebalancer(address(rebalancer));
        console2.log("  Rebalancer configured in ETFCore");
        console2.log("");

        vm.stopBroadcast();

        console2.log("========================================");
        console2.log("Deployment Complete!");
        console2.log("========================================");
        console2.log("");
        console2.log("Deployed Contract Addresses:");
        console2.log("----------------------------------------");
        console2.log("BlockETFCore:     ", address(etfCore));
        console2.log("ETFRebalancerV1:  ", address(rebalancer));
        console2.log("ETFRouterV1:      ", address(router));
        console2.log("----------------------------------------");
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Save these addresses");
        console2.log("2. Initialize ETFCore with assets and weights");
        console2.log("3. Configure fee settings (optional)");
        console2.log("4. Test minting functionality");
        console2.log("");
        console2.log("Tip: Save addresses to deployed-contracts.json:");
        console2.log('   "etfCore": "', address(etfCore), '",');
        console2.log('   "rebalancer": "', address(rebalancer), '",');
        console2.log('   "router": "', address(router), '"');
        console2.log("");
    }

    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Load token addresses
        wbnb = json.readAddress(".contracts.mockTokens[0].contractAddress");
        usdt = json.readAddress(".contracts.mockTokens[5].contractAddress");
        priceOracle = json.readAddress(".contracts.priceOracle.contractAddress");

        console2.log("Loaded contracts from deployed-contracts.json");
        console2.log("");
    }
}

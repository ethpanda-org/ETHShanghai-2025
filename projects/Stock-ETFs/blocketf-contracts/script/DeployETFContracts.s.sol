// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";

import {BlockETFCore} from "../src/BlockETFCore.sol";
import {ETFRouterV1} from "../src/ETFRouterV1.sol";
import {ETFRebalancerV1} from "../src/ETFRebalancerV1.sol";

/**
 * @title DeployETFContracts
 * @notice Deploy BlockETFCore, ETFRouterV1, and ETFRebalancerV1 contracts
 * @dev Usage: forge script script/DeployETFContracts.s.sol --rpc-url bnb_testnet --broadcast
 */
contract DeployETFContracts is Script {
    using stdJson for string;

    // PancakeSwap V3 addresses on BSC Testnet
    address constant PANCAKE_V3_SWAP_ROUTER = 0x1b81D678ffb9C0263b24A97847620C99d213eB14;
    address constant PANCAKE_V2_ROUTER = 0xD99D1c33F9fC3444f8101754aBC46c52416550D1;

    // QuoterV3 address (will be deployed separately or use existing)
    // You can update this after deploying the Quoter
    address public quoterV3;

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

        // Load addresses from deployed-contracts.json
        loadContractsFromJson();

        // Prompt for QuoterV3 address
        console2.log("Using addresses:");
        console2.log("  PriceOracle:", priceOracle);
        console2.log("  WBNB:", wbnb);
        console2.log("  USDT:", usdt);
        console2.log("  V3 SwapRouter:", PANCAKE_V3_SWAP_ROUTER);
        console2.log("  V2 Router:", PANCAKE_V2_ROUTER);
        console2.log("");

        // Check if QuoterV3 is set
        if (quoterV3 == address(0)) {
            console2.log("ERROR: QuoterV3 address not set!");
            console2.log("Please deploy QuoterV3 first or set the address in the script");
            console2.log("");
            revert("QuoterV3 address required");
        }
        console2.log("  QuoterV3:", quoterV3);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy BlockETFCore
        console2.log("1. Deploying BlockETFCore...");
        BlockETFCore etfCore = new BlockETFCore("Top 5 Crypto", "T5", priceOracle);
        console2.log("   BlockETFCore deployed at:", address(etfCore));
        console2.log("");

        // 2. Deploy ETFRebalancerV1
        console2.log("2. Deploying ETFRebalancerV1...");
        ETFRebalancerV1 rebalancer =
            new ETFRebalancerV1(address(etfCore), PANCAKE_V3_SWAP_ROUTER, PANCAKE_V2_ROUTER, usdt, wbnb);
        console2.log("   ETFRebalancerV1 deployed at:", address(rebalancer));
        console2.log("");

        // 3. Deploy ETFRouterV1
        console2.log("3. Deploying ETFRouterV1...");
        ETFRouterV1 router = new ETFRouterV1(
            address(etfCore), PANCAKE_V3_SWAP_ROUTER, priceOracle, PANCAKE_V2_ROUTER, quoterV3, usdt, wbnb
        );
        console2.log("   ETFRouterV1 deployed at:", address(router));
        console2.log("");

        // 4. Set Rebalancer in Core
        console2.log("4. Setting rebalancer in ETFCore...");
        etfCore.setRebalancer(address(rebalancer));
        console2.log("   Rebalancer set successfully");
        console2.log("");

        vm.stopBroadcast();

        console2.log("========================================");
        console2.log("Deployment Complete!");
        console2.log("========================================");
        console2.log("");
        console2.log("Deployed Contract Addresses:");
        console2.log("----------------------------");
        console2.log("BlockETFCore:     ", address(etfCore));
        console2.log("ETFRebalancerV1:  ", address(rebalancer));
        console2.log("ETFRouterV1:      ", address(router));
        console2.log("");
        console2.log("Save these addresses for future use!");
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Initialize ETFCore with assets and weights");
        console2.log("2. Configure fee settings if needed");
        console2.log("3. Test minting/burning functionality");
    }

    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Load token addresses
        wbnb = json.readAddress(".contracts.mockTokens[0].contractAddress");
        usdt = json.readAddress(".contracts.mockTokens[5].contractAddress");
        priceOracle = json.readAddress(".contracts.priceOracle.contractAddress");

        // Try to load QuoterV3 address if it exists
        try vm.parseJsonAddress(json, ".contracts.quoterV3.contractAddress") returns (address _quoterV3) {
            quoterV3 = _quoterV3;
        } catch {
            // QuoterV3 not found, will need to set manually or deploy first
            quoterV3 = address(0);
        }

        console2.log("Loaded contracts from deployed-contracts.json");
    }
}

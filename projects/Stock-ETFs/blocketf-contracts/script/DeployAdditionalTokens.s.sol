// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MockERC20} from "../src/mock/MockERC20.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {stdJson} from "forge-std/StdJson.sol";

/**
 * @title DeployAdditionalTokens
 * @notice Deploy ADA and BCH tokens and configure Chainlink price feeds
 * @dev Usage: forge script script/DeployAdditionalTokens.s.sol --rpc-url bnb_testnet --broadcast
 *
 * This script:
 * 1. Deploys ADA and BCH mock tokens
 * 2. Configures Chainlink price feeds in PriceOracle
 *
 * Prerequisites:
 * - PriceOracle deployed (from deployed-contracts.json)
 * - USDT token deployed (from deployed-contracts.json)
 */
contract DeployAdditionalTokens is Script {
    using stdJson for string;

    // Chainlink Price Feeds on BSC Testnet
    address constant FEED_ADA_USD = 0x5e66a1775BbC249b5D51C13d29245522582E671C;
    address constant FEED_BCH_USD = 0x887f177CBED2cf555a64e7bF125E1825EB69dB82;

    // Deployed contracts
    MockERC20 public adaToken;
    MockERC20 public bchToken;
    PriceOracle public priceOracle;
    address public usdtToken;

    // Initial supply for each token (1 million tokens)
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 1e18;

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying Additional Tokens (ADA & BCH)");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Network: BNB Testnet");

        // Load existing contracts
        loadExistingContracts();

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy ADA and BCH tokens
        deployTokens();

        // Step 2: Configure Chainlink price feeds in PriceOracle
        configurePriceFeeds();

        vm.stopBroadcast();

        // Step 3: Print summary
        printDeploymentSummary();
    }

    /**
     * @notice Load existing contracts from deployed-contracts.json
     */
    function loadExistingContracts() internal {
        console2.log("\n1. Loading Existing Contracts...");

        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Load USDT address
        usdtToken = json.readAddress(".contracts.mockTokens[5].contractAddress");
        console2.log("  USDT:", usdtToken);

        // Load PriceOracle address from JSON
        priceOracle = PriceOracle(json.readAddress(".contracts.priceOracle.contractAddress"));
        console2.log("  PriceOracle:", address(priceOracle));
    }

    /**
     * @notice Deploy ADA and BCH tokens
     */
    function deployTokens() internal {
        console2.log("\n2. Deploying New Tokens...");

        adaToken = new MockERC20("Cardano BEP20", "ADA", 18, INITIAL_SUPPLY);
        bchToken = new MockERC20("Bitcoin Cash BEP20", "BCH", 18, INITIAL_SUPPLY);

        console2.log("  ADA:", address(adaToken));
        console2.log("  BCH:", address(bchToken));
        console2.log("  Initial supply per token:", INITIAL_SUPPLY / 1e18);
    }

    /**
     * @notice Configure Chainlink price feeds for ADA and BCH in PriceOracle
     */
    function configurePriceFeeds() internal {
        console2.log("\n3. Configuring Chainlink Price Feeds in PriceOracle...");

        address[] memory tokens = new address[](2);
        address[] memory feeds = new address[](2);

        tokens[0] = address(adaToken);
        tokens[1] = address(bchToken);

        feeds[0] = FEED_ADA_USD;
        feeds[1] = FEED_BCH_USD;

        priceOracle.setPriceFeeds(tokens, feeds);

        console2.log("  ADA -> Chainlink ADA/USD:", FEED_ADA_USD);
        console2.log("  BCH -> Chainlink BCH/USD:", FEED_BCH_USD);
    }

    /**
     * @notice Print deployment summary
     */
    function printDeploymentSummary() internal view {
        console2.log("\n========================================");
        console2.log("Deployment Summary");
        console2.log("========================================");
        console2.log("\nNew Tokens Deployed:");
        console2.log("  ADA:", address(adaToken));
        console2.log("  BCH:", address(bchToken));

        console2.log("\nChainlink Price Feeds Configured:");
        console2.log("  ADA/USD:", FEED_ADA_USD);
        console2.log("  BCH/USD:", FEED_BCH_USD);

        console2.log("\n========================================");
        console2.log("Next Steps:");
        console2.log("========================================");
        console2.log("1. Update deployed-contracts.json with new token addresses:");
        console2.log("   ADA:", address(adaToken));
        console2.log("   BCH:", address(bchToken));
        console2.log("\n2. Verify prices from Chainlink:");
        console2.log("   cast call", address(priceOracle));
        console2.log("     'getPrice(address)(uint256)'", address(adaToken));
        console2.log("\n3. Setup liquidity pools using SetupLiquidity script");
        console2.log("\n4. Test swaps through Router/Rebalancer");
        console2.log("\n5. Update ETF asset allocation if needed");
    }
}

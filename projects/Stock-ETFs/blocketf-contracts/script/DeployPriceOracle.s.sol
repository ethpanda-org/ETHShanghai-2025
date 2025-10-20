// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {stdJson} from "forge-std/StdJson.sol";

/**
 * @title DeployPriceOracle
 * @notice Script to deploy PriceOracle contract and configure price feeds from multiple sources
 * @dev Usage: forge script script/DeployPriceOracle.s.sol --rpc-url bnb_testnet --broadcast --verify
 *
 * This script:
 * 1. Reads token addresses from deployed-contracts.json
 * 2. Deploys PriceOracle contract
 * 3. Configures price feeds for all 6 tokens (Chainlink + Binance Oracle)
 * 4. Verifies price feed configuration
 *
 * Supported Oracle Sources:
 * - Chainlink Price Feeds (BNB, BTC, ETH, XRP)
 * - Binance Oracle (SOL, or as alternative)
 * - Custom feeds as needed
 */
contract DeployPriceOracle is Script {
    using stdJson for string;

    // Price Feed addresses on BSC Testnet
    // Chainlink Price Feeds
    address constant FEED_BNB_USD = 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526; // Chainlink
    address constant FEED_BTC_USD = 0x5741306c21795FdCBb9b265Ea0255F499DFe515C; // Chainlink
    address constant FEED_ETH_USD = 0x635780E5D02Ab29d7aE14d266936A38d3D5B0CC5; // Binance Oracle
    address constant FEED_ADA_USD = 0x5e66a1775BbC249b5D51C13d29245522582E671C; // Chainlink
    address constant FEED_BCH_USD = 0x887f177CBED2cf555a64e7bF125E1825EB69dB82; // Chainlink
    address constant FEED_USDT_USD = 0x9331b55D9830EF609A2aBCfAc0FBCE050A52fdEa; // Chainlink (BUSD as proxy)

    // Token addresses (loaded from deployed-contracts.json)
    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;
    address public usdtToken;

    // Deployed contract
    PriceOracle public priceOracle;

    function setUp() public {
        // Load token addresses from deployed-contracts.json
        loadTokenAddresses();
    }

    /**
     * @notice Load token addresses from deployed-contracts.json
     */
    function loadTokenAddresses() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Parse token addresses from JSON
        wbnbToken = json.readAddress(".contracts.mockTokens[0].contractAddress");
        btcToken = json.readAddress(".contracts.mockTokens[1].contractAddress");
        ethToken = json.readAddress(".contracts.mockTokens[2].contractAddress");
        adaToken = json.readAddress(".contracts.mockTokens[3].contractAddress");
        bchToken = json.readAddress(".contracts.mockTokens[4].contractAddress");
        usdtToken = json.readAddress(".contracts.mockTokens[5].contractAddress");

        console2.log("Loaded token addresses from deployed-contracts.json:");
        console2.log("  WBNB:", wbnbToken);
        console2.log("  BTCB:", btcToken);
        console2.log("  ETH:", ethToken);
        console2.log("  ADA:", adaToken);
        console2.log("  BCH:", bchToken);
        console2.log("  USDT:", usdtToken);
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying PriceOracle");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Network: BNB Testnet");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy PriceOracle
        deployPriceOracle();

        // Step 2: Set staleness threshold to 24 hours
        setStalenessThreshold();

        // Step 3: Configure Chainlink price feeds
        configurePriceFeeds();

        // Step 4: Verify configuration
        verifyPriceFeeds();

        vm.stopBroadcast();

        // Step 4: Print summary
        printDeploymentSummary();
    }

    function deployPriceOracle() internal {
        console2.log("\n1. Deploying PriceOracle...");

        priceOracle = new PriceOracle();

        console2.log("  PriceOracle deployed at:", address(priceOracle));
        console2.log("  Owner:", priceOracle.owner());
        console2.log("  Initial staleness threshold:", priceOracle.stalenessThreshold(), "seconds");
    }

    function setStalenessThreshold() internal {
        console2.log("\n2. Setting Staleness Threshold to 24 hours...");

        uint256 newThreshold = 24 hours; // 86400 seconds

        priceOracle.setStalenessThreshold(newThreshold);

        console2.log("  Staleness threshold updated to:", newThreshold, "seconds (24 hours)");
        console2.log("  Verified threshold:", priceOracle.stalenessThreshold(), "seconds");
    }

    function configurePriceFeeds() internal {
        console2.log("\n3. Configuring Price Feeds (Chainlink + Others)...");

        // Prepare arrays for batch configuration (6 tokens)
        address[] memory tokens = new address[](6);
        address[] memory feeds = new address[](6);

        tokens[0] = wbnbToken;
        tokens[1] = btcToken;
        tokens[2] = ethToken;
        tokens[3] = adaToken;
        tokens[4] = bchToken;
        tokens[5] = usdtToken;

        feeds[0] = FEED_BNB_USD;
        feeds[1] = FEED_BTC_USD;
        feeds[2] = FEED_ETH_USD;
        feeds[3] = FEED_ADA_USD;
        feeds[4] = FEED_BCH_USD;
        feeds[5] = FEED_USDT_USD;

        // Set price feeds in batch
        priceOracle.setPriceFeeds(tokens, feeds);

        console2.log("  Configured price feeds for 6 tokens:");
        console2.log("\n  Chainlink Feeds:");
        console2.log("    WBNB -> BNB/USD:", FEED_BNB_USD);
        console2.log("    BTCB -> BTC/USD:", FEED_BTC_USD);
        console2.log("    ETH  -> ETH/USD:", FEED_ETH_USD);
        console2.log("    ADA  -> ADA/USD:", FEED_ADA_USD);
        console2.log("    BCH  -> BCH/USD:", FEED_BCH_USD);
        console2.log("    USDT -> BUSD/USD (proxy):", FEED_USDT_USD);
    }

    function verifyPriceFeeds() internal view {
        console2.log("\n4. Verifying Price Feed Configuration...");

        address wbnbFeed = priceOracle.priceFeeds(wbnbToken);
        address btcFeed = priceOracle.priceFeeds(btcToken);
        address ethFeed = priceOracle.priceFeeds(ethToken);
        address adaFeed = priceOracle.priceFeeds(adaToken);
        address bchFeed = priceOracle.priceFeeds(bchToken);
        address usdtFeed = priceOracle.priceFeeds(usdtToken);

        require(wbnbFeed == FEED_BNB_USD, "WBNB feed mismatch");
        require(btcFeed == FEED_BTC_USD, "BTC feed mismatch");
        require(ethFeed == FEED_ETH_USD, "ETH feed mismatch");
        require(adaFeed == FEED_ADA_USD, "ADA feed mismatch");
        require(bchFeed == FEED_BCH_USD, "BCH feed mismatch");
        require(usdtFeed == FEED_USDT_USD, "USDT feed mismatch");

        console2.log("  All 6 price feeds verified successfully!");
    }

    function printDeploymentSummary() internal view {
        console2.log("\n========================================");
        console2.log("Deployment Summary");
        console2.log("========================================");
        console2.log("\nDeployed Contracts:");
        console2.log("  PriceOracle:", address(priceOracle));
        console2.log("  Staleness Threshold:", priceOracle.stalenessThreshold(), "seconds (24 hours)");

        console2.log("\nToken Price Feeds (6 tokens):");
        console2.log("  WBNB:", priceOracle.priceFeeds(wbnbToken), "(Chainlink)");
        console2.log("  BTCB:", priceOracle.priceFeeds(btcToken), "(Chainlink)");
        console2.log("  ETH:", priceOracle.priceFeeds(ethToken), "(Chainlink)");
        console2.log("  ADA:", priceOracle.priceFeeds(adaToken), "(Chainlink)");
        console2.log("  BCH:", priceOracle.priceFeeds(bchToken), "(Chainlink)");
        console2.log("  USDT:", priceOracle.priceFeeds(usdtToken), "(Chainlink BUSD)");

        console2.log("\n========================================");
        console2.log("Next Steps:");
        console2.log("========================================");
        console2.log("1. Save PriceOracle address to .env:");
        console2.log("   PRICE_ORACLE=", address(priceOracle));

        console2.log("\n2. Test price fetching:");
        console2.log("   cast call", address(priceOracle));
        console2.log("     'getPrice(address)(uint256)' <TOKEN_ADDRESS>");
        console2.log("\n3. Deploy BlockETF system with this oracle");
    }
}

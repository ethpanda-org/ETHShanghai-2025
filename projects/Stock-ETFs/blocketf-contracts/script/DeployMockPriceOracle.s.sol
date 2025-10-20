// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MockPriceOracle} from "../src/mock/MockPriceOracle.sol";
import {stdJson} from "forge-std/StdJson.sol";

/**
 * @title DeployMockPriceOracle
 * @notice Script to deploy MockPriceOracle contract and set initial prices
 * @dev Usage: forge script script/DeployMockPriceOracle.s.sol --rpc-url bnb_testnet --broadcast --verify
 *
 * This script:
 * 1. Reads token addresses from deployed-contracts.json
 * 2. Deploys MockPriceOracle contract
 * 3. Sets initial prices for all 6 tokens
 * 4. Verifies price configuration
 *
 * Use this for testnet deployments where Chainlink feeds may not be available
 */
contract DeployMockPriceOracle is Script {
    using stdJson for string;

    // Token addresses (loaded from deployed-contracts.json)
    address public wbnbToken;
    address public btcToken;
    address public ethToken;
    address public xrpToken;
    address public solToken;
    address public usdtToken;

    // Deployed contract
    MockPriceOracle public priceOracle;

    // Initial prices (18 decimals, USD)
    // These are approximate market prices as of deployment
    uint256 constant PRICE_WBNB = 600e18; // $600
    uint256 constant PRICE_BTC = 95000e18; // $95,000
    uint256 constant PRICE_ETH = 3400e18; // $3,400
    uint256 constant PRICE_XRP = 2.5e18; // $2.50
    uint256 constant PRICE_SOL = 190e18; // $190
    uint256 constant PRICE_USDT = 1e18; // $1

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
        xrpToken = json.readAddress(".contracts.mockTokens[3].contractAddress");
        solToken = json.readAddress(".contracts.mockTokens[4].contractAddress");
        usdtToken = json.readAddress(".contracts.mockTokens[5].contractAddress");

        console2.log("Loaded token addresses from deployed-contracts.json:");
        console2.log("  WBNB:", wbnbToken);
        console2.log("  BTCB:", btcToken);
        console2.log("  ETH:", ethToken);
        console2.log("  XRP:", xrpToken);
        console2.log("  SOL:", solToken);
        console2.log("  USDT:", usdtToken);
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying MockPriceOracle");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Network: BNB Testnet");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy MockPriceOracle
        deployMockPriceOracle();

        // Step 2: Set initial prices
        setInitialPrices();

        // Step 3: Verify prices
        verifyPrices();

        vm.stopBroadcast();

        // Step 4: Print summary
        printDeploymentSummary();
    }

    function deployMockPriceOracle() internal {
        console2.log("\n1. Deploying MockPriceOracle...");

        priceOracle = new MockPriceOracle();

        console2.log("  MockPriceOracle deployed at:", address(priceOracle));
        console2.log("  Owner:", priceOracle.owner());
    }

    function setInitialPrices() internal {
        console2.log("\n2. Setting Initial Prices...");

        // Prepare arrays for batch configuration
        address[] memory tokens = new address[](6);
        uint256[] memory prices = new uint256[](6);

        tokens[0] = wbnbToken;
        tokens[1] = btcToken;
        tokens[2] = ethToken;
        tokens[3] = xrpToken;
        tokens[4] = solToken;
        tokens[5] = usdtToken;

        prices[0] = PRICE_WBNB;
        prices[1] = PRICE_BTC;
        prices[2] = PRICE_ETH;
        prices[3] = PRICE_XRP;
        prices[4] = PRICE_SOL;
        prices[5] = PRICE_USDT;

        // Set prices in batch
        priceOracle.setPrices(tokens, prices);

        console2.log("  Set prices for 6 tokens:");
        console2.log("    WBNB: $", PRICE_WBNB / 1e18);
        console2.log("    BTCB: $", PRICE_BTC / 1e18);
        console2.log("    ETH:  $", PRICE_ETH / 1e18);
        console2.log("    XRP:  $", PRICE_XRP / 1e18);
        console2.log("    SOL:  $", PRICE_SOL / 1e18);
        console2.log("    USDT: $", PRICE_USDT / 1e18);
    }

    function verifyPrices() internal view {
        console2.log("\n3. Verifying Prices...");

        uint256 wbnbPrice = priceOracle.getPrice(wbnbToken);
        uint256 btcPrice = priceOracle.getPrice(btcToken);
        uint256 ethPrice = priceOracle.getPrice(ethToken);
        uint256 xrpPrice = priceOracle.getPrice(xrpToken);
        uint256 solPrice = priceOracle.getPrice(solToken);
        uint256 usdtPrice = priceOracle.getPrice(usdtToken);

        require(wbnbPrice == PRICE_WBNB, "WBNB price mismatch");
        require(btcPrice == PRICE_BTC, "BTC price mismatch");
        require(ethPrice == PRICE_ETH, "ETH price mismatch");
        require(xrpPrice == PRICE_XRP, "XRP price mismatch");
        require(solPrice == PRICE_SOL, "SOL price mismatch");
        require(usdtPrice == PRICE_USDT, "USDT price mismatch");

        console2.log("  All prices verified successfully!");
    }

    function printDeploymentSummary() internal view {
        console2.log("\n========================================");
        console2.log("Deployment Summary");
        console2.log("========================================");
        console2.log("\nDeployed Contracts:");
        console2.log("  MockPriceOracle:", address(priceOracle));

        console2.log("\nToken Prices (USD with 18 decimals):");
        console2.log("  WBNB:", priceOracle.getPrice(wbnbToken) / 1e18, "USD");
        console2.log("  BTCB:", priceOracle.getPrice(btcToken) / 1e18, "USD");
        console2.log("  ETH:", priceOracle.getPrice(ethToken) / 1e18, "USD");
        console2.log("  XRP:", priceOracle.getPrice(xrpToken) / 1e18, "USD");
        console2.log("  SOL:", priceOracle.getPrice(solToken) / 1e18, "USD");
        console2.log("  USDT:", priceOracle.getPrice(usdtToken) / 1e18, "USD");

        console2.log("\n========================================");
        console2.log("Next Steps:");
        console2.log("========================================");
        console2.log("1. Save MockPriceOracle address to .env:");
        console2.log("   PRICE_ORACLE=", address(priceOracle));
        console2.log("\n2. Update prices if needed:");
        console2.log("   cast send", address(priceOracle));
        console2.log("     'setPrice(address,uint256)' <TOKEN> <PRICE>");
        console2.log("\n3. Test price fetching:");
        console2.log("   cast call", address(priceOracle));
        console2.log("     'getPrice(address)(uint256)' <TOKEN_ADDRESS>");
        console2.log("\n4. Run SetupLiquidity script:");
        console2.log("   forge script script/SetupLiquidity.s.sol \\");
        console2.log("     --rpc-url bnb_testnet --broadcast");
        console2.log("\n5. Deploy BlockETF system with this oracle");
        console2.log("\nNote: MockPriceOracle is for testing only!");
        console2.log("      For production, use PriceOracle with Chainlink feeds");
    }
}

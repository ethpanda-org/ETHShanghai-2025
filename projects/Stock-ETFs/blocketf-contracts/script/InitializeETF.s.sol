// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {BlockETFCore} from "../src/BlockETFCore.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {DeployConfig} from "./DeployConfig.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {stdJson} from "forge-std/StdJson.sol";

/**
 * @title InitializeETF
 * @notice Script to initialize the first ETF with initial liquidity
 * @dev This script reads all addresses from deployed-contracts.json:
 *      - ETF Core address
 *      - Price Oracle address
 *      - All 5 token addresses (WBNB, BTCB, ETH, ADA, BCH)
 *
 * @dev Usage:
 *      forge script script/InitializeETF.s.sol:InitializeETF --rpc-url bnb_testnet --broadcast
 *
 * @dev Environment Variables Required:
 *      - PRIVATE_KEY: Deployer private key (only thing needed!)
 */
contract InitializeETF is Script, DeployConfig {
    using stdJson for string;

    // Contract instances
    BlockETFCore public etfCore;
    PriceOracle public oracle;

    // Token addresses (loaded from JSON)
    address public wbnbToken;
    address public btcbToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;

    // Deployer address
    address public deployer;

    // Initial ETF parameters
    uint256 public constant TARGET_TOTAL_VALUE_USD = 100e18; // $100 USD

    function setUp() public {
        // Load all addresses from deployed-contracts.json
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        // Load ETF Core address
        address etfCoreAddress = json.readAddress(".contracts.etfCore.contractAddress");
        require(etfCoreAddress != address(0), "ETF Core address not found in JSON");
        etfCore = BlockETFCore(etfCoreAddress);

        // Load Price Oracle address
        address oracleAddress = json.readAddress(".contracts.priceOracle.contractAddress");
        require(oracleAddress != address(0), "Price Oracle address not found in JSON");
        oracle = PriceOracle(oracleAddress);

        // Load token addresses from mockTokens array
        wbnbToken = json.readAddress(".contracts.mockTokens[0].contractAddress");
        btcbToken = json.readAddress(".contracts.mockTokens[1].contractAddress");
        ethToken = json.readAddress(".contracts.mockTokens[2].contractAddress");
        adaToken = json.readAddress(".contracts.mockTokens[3].contractAddress");
        bchToken = json.readAddress(".contracts.mockTokens[4].contractAddress");

        require(wbnbToken != address(0), "WBNB address not found in JSON");
        require(btcbToken != address(0), "BTCB address not found in JSON");
        require(ethToken != address(0), "ETH address not found in JSON");
        require(adaToken != address(0), "ADA address not found in JSON");
        require(bchToken != address(0), "BCH address not found in JSON");
    }

    function run() public {
        // Get deployer from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Initializing BlockETF");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        console2.log("");
        console2.log("Loaded from deployed-contracts.json:");
        console2.log("  ETF Core:", address(etfCore));
        console2.log("  Price Oracle:", address(oracle));
        console2.log("");

        // Check if already initialized
        if (etfCore.initialized()) {
            console2.log("ERROR: ETF is already initialized!");
            console2.log("If you want to re-initialize, deploy a new ETF Core contract.");
            return;
        }

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Verify deployer has sufficient token balances
        verifyTokenBalances();

        // Step 2: Calculate required token amounts
        uint256[] memory requiredAmounts = calculateRequiredAmounts();

        // Step 3: Approve tokens for ETF Core
        approveTokens(requiredAmounts);

        // Step 4: Initialize ETF
        initializeETF();

        // Step 5: Verify initialization
        verifyInitialization();

        vm.stopBroadcast();

        // Print summary
        printSummary();
    }

    /**
     * @notice Verify deployer has sufficient token balances
     */
    function verifyTokenBalances() internal view {
        console2.log("1. Checking Token Balances...");

        address[] memory tokens = getTokenAddresses();
        string[] memory symbols = getTokenSymbols();

        for (uint256 i = 0; i < tokens.length; i++) {
            uint256 balance = IERC20(tokens[i]).balanceOf(deployer);
            console2.log("  %s Balance: %s", symbols[i], balance);

            if (balance == 0) {
                console2.log("  WARNING: No %s balance!", symbols[i]);
            }
        }
        console2.log("");
    }

    /**
     * @notice Calculate required token amounts based on target value and weights
     */
    function calculateRequiredAmounts() internal view returns (uint256[] memory amounts) {
        console2.log("2. Calculating Required Token Amounts...");

        address[] memory tokens = getTokenAddresses();
        uint32[] memory weights = getInitialWeights32();
        amounts = new uint256[](tokens.length);

        for (uint256 i = 0; i < tokens.length; i++) {
            // Get token price from oracle
            uint256 price = oracle.getPrice(tokens[i]);
            require(price > 0, string(abi.encodePacked("Price not set for token ", i)));

            // Calculate target value for this asset
            uint256 targetValueUSD = (TARGET_TOTAL_VALUE_USD * weights[i]) / WEIGHT_PRECISION;

            // Calculate required token amount
            // amount = targetValue / price (accounting for decimals)
            uint8 decimals = 18; // Assuming all tokens have 18 decimals
            amounts[i] = (targetValueUSD * (10 ** decimals)) / price;

            console2.log("  Token %s:", i);
            console2.log("    Weight: %s bps", weights[i]);
            console2.log("    Price: $%s", price / 1e18);
            console2.log("    Target Value: $%s", targetValueUSD / 1e18);
            console2.log("    Required Amount: %s", amounts[i]);
        }
        console2.log("");

        return amounts;
    }

    /**
     * @notice Approve tokens for ETF Core
     */
    function approveTokens(uint256[] memory amounts) internal {
        console2.log("3. Approving Tokens...");

        address[] memory tokens = getTokenAddresses();
        string[] memory symbols = getTokenSymbols();

        for (uint256 i = 0; i < tokens.length; i++) {
            // Add 10% buffer to handle any transfer fees
            uint256 approvalAmount = (amounts[i] * 110) / 100;

            IERC20(tokens[i]).approve(address(etfCore), approvalAmount);
            console2.log("  Approved %s: %s", symbols[i], approvalAmount);
        }
        console2.log("");
    }

    /**
     * @notice Initialize the ETF with target assets and weights
     */
    function initializeETF() internal {
        console2.log("4. Initializing ETF...");

        address[] memory assets = getTokenAddresses();
        uint32[] memory weights = getInitialWeights32();

        console2.log("  Target Total Value: $%s", TARGET_TOTAL_VALUE_USD / 1e18);
        console2.log("  Number of Assets: %s", assets.length);
        console2.log("");

        // Initialize the ETF
        etfCore.initialize(assets, weights, TARGET_TOTAL_VALUE_USD);

        console2.log("  ETF Initialized Successfully!");
        console2.log("");
    }

    /**
     * @notice Verify ETF initialization
     */
    function verifyInitialization() internal view {
        console2.log("5. Verifying Initialization...");

        // Check if initialized
        require(etfCore.initialized(), "ETF not initialized");
        console2.log("  Status: Initialized [OK]");

        // Check total supply
        uint256 totalSupply = etfCore.totalSupply();
        console2.log("  Total Supply: %s BETF", totalSupply / 1e18);

        // Check deployer balance
        uint256 deployerBalance = etfCore.balanceOf(deployer);
        console2.log("  Deployer Balance: %s BETF", deployerBalance / 1e18);

        // Check total value
        uint256 totalValue = etfCore.getTotalValue();
        console2.log("  Total Value: $%s", totalValue / 1e18);

        // Check share value (should be ~$1)
        uint256 shareValue = etfCore.getShareValue();
        console2.log("  Share Value: $%s", shareValue / 1e18);

        console2.log("");
    }

    /**
     * @notice Print initialization summary
     */
    function printSummary() internal view {
        console2.log("========================================");
        console2.log("Initialization Summary");
        console2.log("========================================");
        console2.log("Network: BNB Testnet (Chain ID 97)");
        console2.log("Deployer:", deployer);
        console2.log("");
        console2.log("ETF Details:");
        console2.log("  Name: %s", etfCore.name());
        console2.log("  Symbol: %s", etfCore.symbol());
        console2.log("  Total Supply: %s", etfCore.totalSupply() / 1e18);
        console2.log("  Total Value: $%s", etfCore.getTotalValue() / 1e18);
        console2.log("  Share Value: $%s", etfCore.getShareValue() / 1e18);
        console2.log("");
        console2.log("Assets:");
        address[] memory tokens = getTokenAddresses();
        string[] memory symbols = getTokenSymbols();
        uint32[] memory weights = getInitialWeights32();
        for (uint256 i = 0; i < tokens.length; i++) {
            console2.log("  %s: %s%% (%s)", symbols[i], weights[i] / 100, tokens[i]);
        }
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Configure ETF fees (setFees)");
        console2.log("2. Set rebalancer address (setRebalancer)");
        console2.log("3. Test minting/burning operations");
        console2.log("4. Monitor ETF performance");
        console2.log("========================================");
    }

    // ==================== Helper Functions ====================

    function getTokenAddresses() internal view returns (address[] memory) {
        address[] memory tokens = new address[](5);
        tokens[0] = wbnbToken;
        tokens[1] = btcbToken;
        tokens[2] = ethToken;
        tokens[3] = adaToken;
        tokens[4] = bchToken;
        return tokens;
    }

    function getTokenSymbols() internal pure returns (string[] memory) {
        string[] memory symbols = new string[](5);
        symbols[0] = "WBNB";
        symbols[1] = "BTCB";
        symbols[2] = "ETH";
        symbols[3] = "ADA";
        symbols[4] = "BCH";
        return symbols;
    }

    // Use WEIGHT_PRECISION from the imported contract
    uint256 private constant WEIGHT_PRECISION = 10000;
}

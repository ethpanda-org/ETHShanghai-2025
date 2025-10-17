// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {BlockETFCore} from "../src/BlockETFCore.sol";
import {ETFRebalancerV1} from "../src/ETFRebalancerV1.sol";
import {ETFRouterV1} from "../src/ETFRouterV1.sol";
import {MockPriceOracle} from "../src/mock/MockPriceOracle.sol";
import {MockERC20} from "../src/mock/MockERC20.sol";
import {USDTFaucet} from "../src/mock/USDTFaucet.sol";
import {DeployConfig} from "./DeployConfig.sol";

/**
 * @title DeployBlockETFWithMocks
 * @notice Deployment script for BlockETF system on BNB Testnet with Mock tokens
 * @dev Usage: forge script script/DeployBlockETFWithMocks.s.sol --rpc-url bnb_testnet --broadcast --verify
 */
contract DeployBlockETFWithMocks is Script, DeployConfig {
    // Deployed contract instances
    BlockETFCore public etfCore;
    ETFRebalancerV1 public rebalancer;
    ETFRouterV1 public router;
    MockPriceOracle public oracle;
    USDTFaucet public usdtFaucet;

    // Mock token addresses
    MockERC20 public wbnbToken;
    MockERC20 public btcToken;
    MockERC20 public ethToken;
    MockERC20 public xrpToken;
    MockERC20 public solToken;
    MockERC20 public usdtToken;

    // Deployer address
    address public deployer;

    // Initial token supply for mocks (1 million tokens)
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 1e18;

    function setUp() public {
        // Validate configuration before deployment
        validateConfigForMainnet();
    }

    function run() public {
        // Get deployer from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying BlockETF System to BNB Testnet");
        console2.log("Using Mock Tokens (5-asset strategy)");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        require(block.chainid == CHAIN_ID, "Wrong network");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy mock tokens
        deployMockTokens();

        // Step 2: Deploy MockPriceOracle
        deployMockOracle();

        // Step 3: Set initial prices
        setInitialPrices();

        // Step 4: Deploy BlockETFCore
        deployBlockETFCore();

        // Step 5: Deploy ETFRebalancerV1
        deployRebalancer();

        // Step 6: Deploy ETFRouterV1
        deployRouter();

        // Step 7: Initialize BlockETFCore with 5 assets
        initializeBlockETFCore();

        // Step 8: Configure permissions
        configurePermissions();

        // Step 9: Deploy USDT faucet
        deployUSDTFaucet();

        vm.stopBroadcast();

        // Step 10: Print deployment summary
        printDeploymentSummary();
    }

    function deployMockTokens() internal {
        console2.log("\n1. Deploying Mock Tokens...");

        // Deploy mock tokens matching mainnet targets
        // Using Mock WBNB instead of real WBNB for easier testing and liquidity provision
        wbnbToken = new MockERC20("Wrapped BNB", "WBNB", 18, INITIAL_SUPPLY);
        btcToken = new MockERC20("Bitcoin BEP20", "BTCB", 18, INITIAL_SUPPLY);
        ethToken = new MockERC20("Ethereum BEP20", "ETH", 18, INITIAL_SUPPLY);
        xrpToken = new MockERC20("Ripple BEP20", "XRP", 18, INITIAL_SUPPLY);
        solToken = new MockERC20("Solana BEP20", "SOL", 18, INITIAL_SUPPLY);
        usdtToken = new MockERC20("Tether USD", "USDT", 18, INITIAL_SUPPLY);

        console2.log("  WBNB (Mock):", address(wbnbToken));
        console2.log("  BTCB (Mock):", address(btcToken));
        console2.log("  ETH (Mock):", address(ethToken));
        console2.log("  XRP (Mock):", address(xrpToken));
        console2.log("  SOL (Mock):", address(solToken));
        console2.log("  USDT (Mock):", address(usdtToken));
    }

    function deployMockOracle() internal {
        console2.log("\n2. Deploying MockPriceOracle...");
        oracle = new MockPriceOracle();
        console2.log("  MockPriceOracle:", address(oracle));
    }

    function setInitialPrices() internal {
        console2.log("\n3. Setting Initial Prices...");

        // Set realistic prices (18 decimals)
        // Note: These are approximate prices, update as needed
        address[] memory tokens = new address[](6);
        uint256[] memory prices = new uint256[](6);

        tokens[0] = address(wbnbToken);
        prices[0] = 1109.27e18; // BNB ~ $1,109.27 (current market price)

        tokens[1] = address(btcToken);
        prices[1] = 95000e18; // BTC ~ $95,000

        tokens[2] = address(ethToken);
        prices[2] = 3400e18; // ETH ~ $3,400

        tokens[3] = address(xrpToken);
        prices[3] = 2.5e18; // XRP ~ $2.5

        tokens[4] = address(solToken);
        prices[4] = 190e18; // SOL ~ $190

        tokens[5] = address(usdtToken);
        prices[5] = 1e18; // USDT = $1

        oracle.setPrices(tokens, prices);

        console2.log("  Prices set for 6 tokens");
    }

    function deployBlockETFCore() internal {
        console2.log("\n4. Deploying BlockETFCore...");
        etfCore = new BlockETFCore("BlockETF Index", "BETF", address(oracle));
        console2.log("  BlockETFCore:", address(etfCore));
    }

    function deployRebalancer() internal {
        console2.log("\n5. Deploying ETFRebalancerV1...");
        rebalancer = new ETFRebalancerV1(
            address(etfCore), PANCAKE_V3_SWAP_ROUTER, PANCAKE_V2_ROUTER, address(usdtToken), address(wbnbToken)
        );
        console2.log("  ETFRebalancerV1:", address(rebalancer));
    }

    function deployRouter() internal {
        console2.log("\n6. Deploying ETFRouterV1...");
        router = new ETFRouterV1(
            address(etfCore),
            PANCAKE_V3_SWAP_ROUTER,
            address(oracle),
            PANCAKE_V2_ROUTER,
            PANCAKE_V3_QUOTER_V2,
            address(usdtToken),
            address(wbnbToken)
        );
        console2.log("  ETFRouterV1:", address(router));
    }

    function initializeBlockETFCore() internal {
        console2.log("\n7. Initializing BlockETFCore with 5 assets...");

        address[] memory assets = new address[](5);
        uint32[] memory weights = new uint32[](5);

        // Asset allocation: BNB 20%, BTC 30%, ETH 25%, XRP 10%, SOL 15%
        assets[0] = address(wbnbToken);
        weights[0] = 2000; // 20%

        assets[1] = address(btcToken);
        weights[1] = 3000; // 30%

        assets[2] = address(ethToken);
        weights[2] = 2500; // 25%

        assets[3] = address(xrpToken);
        weights[3] = 1000; // 10%

        assets[4] = address(solToken);
        weights[4] = 1500; // 15%

        // Verify weights sum to 10000 (100%)
        uint32 totalWeight = 0;
        for (uint256 i = 0; i < weights.length; i++) {
            totalWeight += weights[i];
        }
        require(totalWeight == 10000, "Weights must sum to 10000");

        // Target total value: $100,000 USD (in 18 decimals)
        uint256 targetTotalValueUSD = 100_000e18;

        etfCore.initialize(assets, weights, targetTotalValueUSD);

        console2.log("  ETF initialized with 5 assets");
        console2.log("  BNB: 20%, BTC: 30%, ETH: 25%, XRP: 10%, SOL: 15%");
    }

    function configurePermissions() internal {
        console2.log("\n8. Configuring Permissions...");

        // Set rebalancer in BlockETFCore
        etfCore.setRebalancer(address(rebalancer));

        // Configure rebalance thresholds
        etfCore.setRebalanceThreshold(REBALANCE_THRESHOLD);
        etfCore.setMinRebalanceCooldown(MIN_REBALANCE_COOLDOWN);

        console2.log("  Rebalancer set:", address(rebalancer));
        console2.log("  Rebalance threshold:", REBALANCE_THRESHOLD);
        console2.log("  Min cooldown:", MIN_REBALANCE_COOLDOWN);

        // Configure router settings for WBNB
        // NOTE: In testnet with mocks, we use V2 by default since there's no real V3 liquidity
        // For mainnet deployment with real tokens, set useV2Router to false and configure V3 pool
        console2.log("\n8.1. Configuring Router Settings...");
        console2.log("  WBNB V2 Router Mode: enabled (testnet with mocks)");
        console2.log("  For mainnet: disable V2 mode and configure V3 pool address");

        // Testnet: use V2 for WBNB (no real V3 pools for mock tokens)
        router.setAssetUseV2Router(address(wbnbToken), true);
        rebalancer.setAssetUseV2Router(address(wbnbToken), true);

        // For mainnet deployment with real WBNB/USDT V3 pool:
        // router.setAssetUseV2Router(WBNB, false);
        // router.setAssetV3Pool(WBNB, WBNB_USDT_V3_POOL_ADDRESS);
        // rebalancer.setAssetUseV2Router(WBNB, false);
        // rebalancer.configureAssetPool(WBNB, WBNB_USDT_V3_POOL_ADDRESS, 500); // or 2500 for 0.25% fee
    }

    function deployUSDTFaucet() internal {
        console2.log("\n9. Deploying USDT Faucet...");

        // Deploy faucet with configurable parameters
        // Default: 500 USDT per claim, 10 minutes cooldown
        uint256 defaultAmount = 500e18; // 500 USDT
        uint256 defaultCooldown = 10 minutes; // 10 minutes

        usdtFaucet = new USDTFaucet(address(usdtToken), defaultAmount, defaultCooldown);

        // Grant minter role to faucet (instead of transferring ownership)
        // This allows deployer to retain full control over USDT
        usdtToken.setMinter(address(usdtFaucet), true);

        console2.log("  USDTFaucet:", address(usdtFaucet));
        console2.log("  Default amount:", defaultAmount / 1e18, "USDT");
        console2.log("  Default cooldown:", defaultCooldown / 60, "minutes");
        console2.log("  Granted minter role to faucet");
        console2.log("  Deployer retains USDT ownership for full control");
    }

    function printDeploymentSummary() internal view {
        console2.log("\n========================================");
        console2.log("Deployment Summary");
        console2.log("========================================");
        console2.log("Network: BNB Testnet (Chain ID 97)");
        console2.log("Deployer:", deployer);
        console2.log("");
        console2.log("Core Contracts:");
        console2.log("  BlockETFCore:", address(etfCore));
        console2.log("  ETFRebalancerV1:", address(rebalancer));
        console2.log("  ETFRouterV1:", address(router));
        console2.log("  MockPriceOracle:", address(oracle));
        console2.log("  USDTFaucet:", address(usdtFaucet));
        console2.log("");
        console2.log("Mock Tokens:");
        console2.log("  WBNB (Mock):", address(wbnbToken));
        console2.log("  BTCB (Mock):", address(btcToken));
        console2.log("  ETH (Mock):", address(ethToken));
        console2.log("  XRP (Mock):", address(xrpToken));
        console2.log("  SOL (Mock):", address(solToken));
        console2.log("  USDT (Mock):", address(usdtToken));
        console2.log("");
        console2.log("Asset Allocation:");
        console2.log("  BNB: 20%");
        console2.log("  BTC: 30%");
        console2.log("  ETH: 25%");
        console2.log("  XRP: 10%");
        console2.log("  SOL: 15%");
        console2.log("");
        console2.log("Configuration:");
        console2.log("  Mint Fee:", MINT_FEE, "bps (0.3%)");
        console2.log("  Burn Fee:", BURN_FEE, "bps (0.3%)");
        console2.log("  Management Fee:", MANAGEMENT_FEE, "bps (2% annual)");
        console2.log("  Rebalance Threshold:", REBALANCE_THRESHOLD, "bps (5%)");
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Claim USDT:");
        console2.log("   cast send", address(usdtFaucet), '"claim()"');
        console2.log("   --rpc-url bnb_testnet --private-key $PRIVATE_KEY");
        console2.log("");
        console2.log("2. Mint ETF with USDT:");
        console2.log("   - Approve USDT to ETFRouterV1");
        console2.log("   - Call mintWithUSDT(amount, minShares, deadline)");
        console2.log("   - Router will auto-swap USDT for other assets!");
        console2.log("");
        console2.log("3. Test rebalancing operations");
        console2.log("4. Verify contracts on BscScan");
        console2.log("========================================");
    }

    /**
     * @notice Validate configuration for mainnet-like 5-asset strategy
     */
    function validateConfigForMainnet() internal pure {
        // Verify basic config is valid
        require(CHAIN_ID == 97, "Must be BNB Testnet");
        require(PANCAKE_V2_ROUTER != address(0), "V2 Router not set");
        require(PANCAKE_V3_SWAP_ROUTER != address(0), "V3 Router not set");
    }
}

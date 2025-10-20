// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {MockERC20} from "../src/mock/MockERC20.sol";
import {USDTFaucet} from "../src/mock/USDTFaucet.sol";

/**
 * @title DeployMockTokens
 * @notice Deploy Mock tokens and USDT faucet for testing
 * @dev Usage: forge script script/DeployMockTokens.s.sol --rpc-url bnb_testnet --broadcast --verify
 *
 * This script deploys:
 * 1. 6 Mock ERC20 tokens (WBNB, BTCB, ETH, ADA, BCH, USDT)
 * 2. USDTFaucet for easy USDT distribution
 *
 * Note: MockPriceOracle is NOT deployed here - it's part of the BlockETF system
 *       and will be deployed by DeployBlockETFWithMocks.s.sol
 */
contract DeployMockTokens is Script {
    // Deployed contracts
    MockERC20 public wbnbToken;
    MockERC20 public btcbToken;
    MockERC20 public ethToken;
    MockERC20 public adaToken;
    MockERC20 public bchToken;
    MockERC20 public usdtToken;
    USDTFaucet public usdtFaucet;

    // Deployer address
    address public deployer;

    // Initial supply for each token (1 million tokens)
    uint256 constant INITIAL_SUPPLY = 1_000_000 * 1e18;

    // Faucet configuration
    uint256 constant DEFAULT_FAUCET_AMOUNT = 500e18; // 500 USDT
    uint256 constant DEFAULT_FAUCET_COOLDOWN = 10 minutes; // 10 minutes

    function run() external {
        // Get deployer from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying Mock Tokens & Infrastructure");
        console2.log("========================================");
        console2.log("Network: BNB Testnet (Chain ID 97)");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        require(block.chainid == 97, "Wrong network - must be BNB Testnet");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy Mock Tokens
        deployMockTokens();

        // Step 2: Deploy USDT Faucet
        deployUSDTFaucet();

        vm.stopBroadcast();

        // Step 3: Print Summary
        printDeploymentSummary();
    }

    function deployMockTokens() internal {
        console2.log("\n1. Deploying Mock Tokens...");

        wbnbToken = new MockERC20("Wrapped BNB", "WBNB", 18, INITIAL_SUPPLY);
        btcbToken = new MockERC20("Bitcoin BEP20", "BTCB", 18, INITIAL_SUPPLY);
        ethToken = new MockERC20("Ethereum BEP20", "ETH", 18, INITIAL_SUPPLY);
        adaToken = new MockERC20("Cardano BEP20", "ADA", 18, INITIAL_SUPPLY);
        bchToken = new MockERC20("Bitcoin Cash BEP20", "BCH", 18, INITIAL_SUPPLY);
        usdtToken = new MockERC20("Tether USD", "USDT", 18, INITIAL_SUPPLY);

        console2.log("  WBNB:", address(wbnbToken));
        console2.log("  BTCB:", address(btcbToken));
        console2.log("  ETH:", address(ethToken));
        console2.log("  ADA:", address(adaToken));
        console2.log("  BCH:", address(bchToken));
        console2.log("  USDT:", address(usdtToken));
    }

    function deployUSDTFaucet() internal {
        console2.log("\n2. Deploying USDT Faucet...");

        usdtFaucet = new USDTFaucet(address(usdtToken), DEFAULT_FAUCET_AMOUNT, DEFAULT_FAUCET_COOLDOWN);

        // Grant minter role to faucet (deployer retains ownership)
        usdtToken.setMinter(address(usdtFaucet), true);

        console2.log("  USDTFaucet:", address(usdtFaucet));
        console2.log("  Faucet amount:", DEFAULT_FAUCET_AMOUNT / 1e18, "USDT");
        console2.log("  Faucet cooldown:", DEFAULT_FAUCET_COOLDOWN / 60, "minutes");
        console2.log("  Granted minter role to faucet");
        console2.log("  Deployer retains USDT ownership");
    }

    function printDeploymentSummary() internal view {
        console2.log("\n========================================");
        console2.log("Deployment Summary");
        console2.log("========================================");
        console2.log("Network: BNB Testnet (Chain ID 97)");
        console2.log("Deployer:", deployer);
        console2.log("");

        console2.log("Mock Tokens:");
        console2.log("  WBNB:", address(wbnbToken));
        console2.log("  BTCB:", address(btcbToken));
        console2.log("  ETH:", address(ethToken));
        console2.log("  ADA:", address(adaToken));
        console2.log("  BCH:", address(bchToken));
        console2.log("  USDT:", address(usdtToken));
        console2.log("");

        console2.log("Faucet:");
        console2.log("  USDTFaucet:", address(usdtFaucet));
        console2.log("");

        console2.log("Token Ownership:");
        console2.log("  All tokens: owner = deployer");
        console2.log("  USDT minter: USDTFaucet (can mint)");
        console2.log("  Deployer can also mint all tokens directly");
        console2.log("");

        console2.log("========================================");
        console2.log("Quick Start Commands");
        console2.log("========================================");
        console2.log("");

        console2.log("# Save these addresses to .env:");
        console2.log("WBNB=", address(wbnbToken));
        console2.log("BTCB=", address(btcbToken));
        console2.log("ETH=", address(ethToken));
        console2.log("ADA=", address(adaToken));
        console2.log("BCH=", address(bchToken));
        console2.log("USDT=", address(usdtToken));
        console2.log("USDT_FAUCET=", address(usdtFaucet));
        console2.log("");

        console2.log("# Claim USDT from faucet:");
        console2.log("cast send", address(usdtFaucet), '"claim()"');
        console2.log("  --rpc-url bnb_testnet --private-key $PRIVATE_KEY");
        console2.log("");

        console2.log("# Deployer can mint any token directly:");
        console2.log("cast send", address(usdtToken), '"mint(address,uint256)"');
        console2.log("  <TO_ADDRESS> 10000000000000000000000");
        console2.log("  --rpc-url bnb_testnet --private-key $PRIVATE_KEY");
        console2.log("");

        console2.log("# Configure faucet amount:");
        console2.log("cast send", address(usdtFaucet), '"setFaucetAmount(uint256)"');
        console2.log("  1000000000000000000000  # 1,000 USDT");
        console2.log("  --rpc-url bnb_testnet --private-key $PRIVATE_KEY");
        console2.log("");

        console2.log("# Configure faucet cooldown:");
        console2.log("cast send", address(usdtFaucet), '"setFaucetCooldown(uint256)"');
        console2.log("  600  # 10 minutes");
        console2.log("  --rpc-url bnb_testnet --private-key $PRIVATE_KEY");
        console2.log("");

        console2.log("========================================");
        console2.log("Next Steps:");
        console2.log("1. Save contract addresses to .env file");
        console2.log("2. Test faucet: cast send <FAUCET> 'claim()'");
        console2.log("3. Verify on BscScan: https://testnet.bscscan.com/");
        console2.log("4. Deploy BlockETF system (use DeployBlockETFWithMocks.s.sol)");
        console2.log("========================================");
    }
}

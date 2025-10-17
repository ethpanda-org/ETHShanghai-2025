// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {BlockETFCore} from "../src/BlockETFCore.sol";
import {ETFRebalancerV1} from "../src/ETFRebalancerV1.sol";
import {ETFRouterV1} from "../src/ETFRouterV1.sol";
import {PriceOracle} from "../src/PriceOracle.sol";
import {DeployConfig} from "./DeployConfig.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title DeployBlockETF
 * @notice Deployment script for BlockETF system on BNB Testnet
 * @dev Usage: forge script script/DeployBlockETF.s.sol --rpc-url bnb_testnet --broadcast --verify
 */
contract DeployBlockETF is Script, DeployConfig {
    // Deployed contract instances
    BlockETFCore public etfCore;
    ETFRebalancerV1 public rebalancer;
    ETFRouterV1 public router;
    PriceOracle public oracle;

    // Mock token addresses (will be set during deployment)
    address public btcbToken;
    address public ethToken;
    address public adaToken;
    address public bchToken;

    // Deployer address
    address public deployer;

    function setUp() public {
        // Validate configuration before deployment
        validateConfig();
    }

    function run() public {
        // Get deployer from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Deploying BlockETF System to BNB Testnet");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("Chain ID:", block.chainid);
        require(block.chainid == CHAIN_ID, "Wrong network");

        vm.startBroadcast(deployerPrivateKey);

        // Step 1: Deploy mock tokens (or use existing testnet tokens)
        deployMockTokens();

        // Step 2: Deploy PriceOracle
        deployPriceOracle();

        // Step 3: Deploy BlockETFCore
        deployBlockETFCore();

        // Step 4: Deploy ETFRebalancerV1
        deployRebalancer();

        // Step 5: Deploy ETFRouterV1
        deployRouter();

        // Step 6: Initialize BlockETFCore
        initializeBlockETFCore();

        // Step 7: Set initial prices in oracle
        setInitialPrices();

        // Step 8: Configure permissions
        configurePermissions();

        vm.stopBroadcast();

        // Step 9: Print deployment summary
        printDeploymentSummary();
    }

    function deployMockTokens() internal {
        console2.log("\n1. Deploying Mock Tokens...");

        // For testnet, we can deploy mock ERC20 tokens
        // Top 5 Crypto assets
        btcbToken = deployMockToken("Bitcoin BEP20", "BTCB", 18);
        ethToken = deployMockToken("Ethereum BEP20", "ETH", 18);
        adaToken = deployMockToken("Cardano BEP20", "ADA", 18);
        bchToken = deployMockToken("Bitcoin Cash BEP20", "BCH", 18);

        console2.log("  WBNB:", WBNB);
        console2.log("  BTCB:", btcbToken);
        console2.log("  ETH:", ethToken);
        console2.log("  ADA:", adaToken);
        console2.log("  BCH:", bchToken);
    }

    function deployMockToken(string memory name, string memory symbol, uint8 decimals) internal returns (address) {
        // Deploy a simple ERC20 token for testing
        // In production, use real token addresses
        bytes memory bytecode = abi.encodePacked(type(MockERC20).creationCode, abi.encode(name, symbol, decimals));
        address token;
        assembly {
            token := create(0, add(bytecode, 0x20), mload(bytecode))
        }
        require(token != address(0), "Token deployment failed");
        return token;
    }

    function deployPriceOracle() internal {
        console2.log("\n2. Deploying PriceOracle...");
        oracle = new PriceOracle();
        console2.log("  PriceOracle:", address(oracle));
    }

    function deployBlockETFCore() internal {
        console2.log("\n3. Deploying BlockETFCore...");
        etfCore = new BlockETFCore("BlockETF Index", "BETF", address(oracle));
        console2.log("  BlockETFCore:", address(etfCore));
    }

    function deployRebalancer() internal {
        console2.log("\n4. Deploying ETFRebalancerV1...");
        // Using WBNB as stable reference for rebalancing
        rebalancer = new ETFRebalancerV1(address(etfCore), PANCAKE_V3_SWAP_ROUTER, PANCAKE_V2_ROUTER, WBNB, WBNB);
        console2.log("  ETFRebalancerV1:", address(rebalancer));
    }

    function deployRouter() internal {
        console2.log("\n5. Deploying ETFRouterV1...");
        // Using WBNB as both quote and wrapped native token
        router = new ETFRouterV1(
            address(etfCore),
            PANCAKE_V3_SWAP_ROUTER,
            address(oracle),
            PANCAKE_V2_ROUTER,
            PANCAKE_V3_QUOTER_V2,
            WBNB,
            WBNB
        );
        console2.log("  ETFRouterV1:", address(router));
    }

    function initializeBlockETFCore() internal {
        console2.log("\n6. Initializing BlockETFCore...");

        address[] memory assets = getInitialAssets(btcbToken, ethToken, adaToken, bchToken);
        uint32[] memory weights = getInitialWeights32();

        // Target total value: $100 USD (in 18 decimals)
        uint256 targetTotalValueUSD = 100e18;

        etfCore.initialize(assets, weights, targetTotalValueUSD);

        console2.log("  ETF initialized with 5 assets (Top 5 Crypto)");
    }

    function setInitialPrices() internal {
        console2.log("\n7. Setting Initial Prices in Oracle...");

        // For testnet, we need to deploy mock price feeds or set up a mock oracle
        // Since PriceOracle expects Chainlink feeds, we'll need to handle this differently
        // For now, we'll skip this step and handle it manually after deployment

        console2.log("  Note: Prices need to be set via Chainlink feeds or mock implementation");
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
        console2.log("  PriceOracle:", address(oracle));
        console2.log("");
        console2.log("Tokens (Top 5 Crypto):");
        console2.log("  WBNB:", WBNB);
        console2.log("  BTCB:", btcbToken);
        console2.log("  ETH:", ethToken);
        console2.log("  ADA:", adaToken);
        console2.log("  BCH:", bchToken);
        console2.log("");
        console2.log("Configuration:");
        console2.log("  Mint Fee:", MINT_FEE, "bps");
        console2.log("  Burn Fee:", BURN_FEE, "bps");
        console2.log("  Management Fee:", MANAGEMENT_FEE, "bps");
        console2.log("  Rebalance Threshold:", REBALANCE_THRESHOLD, "bps");
        console2.log("");
        console2.log("Next Steps:");
        console2.log("1. Verify contracts on BscScan");
        console2.log("2. Test minting with ETFRouterV1");
        console2.log("3. Monitor rebalancing operations");
        console2.log("========================================");
    }
}

// Simple Mock ERC20 for testing (should be replaced with a proper implementation)
contract MockERC20 {
    string public name;
    string public symbol;
    uint8 public decimals;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;
        // Mint initial supply to deployer for testing
        _mint(msg.sender, 1000000 * 10 ** _decimals);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    function _mint(address to, uint256 amount) internal {
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }
}

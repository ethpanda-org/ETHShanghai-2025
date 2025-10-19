// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SoccerAgentRegistry.sol";
import "../src/ServerReputationRegistry.sol";
import "../src/LaunchPad.sol";
import "../src/Competition.sol";

/// @title Deploy Script
/// @notice Deploys all core contracts for AI Soccer on Crypto
contract Deploy is Script {
    // Deployment configuration - UPDATE THESE VALUES FOR YOUR NETWORK
    
    // Uniswap V2 Router addresses for different networks
    // Ethereum Mainnet: 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    // Sepolia Testnet: 0xC532a74256D3Db42D0Bf7a0400fEFDbad7694008
    // Base Mainnet: 0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24
    // Arbitrum: 0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    
    // Foundation address - receives 5% of token launch fees
    address constant FOUNDATION_ADDRESS = address(0x1234567890123456789012345678901234567890); // TODO: Update
    
    // Platform treasury - receives platform fees from matches
    address constant PLATFORM_TREASURY = address(0x1234567890123456789012345678901234567890); // TODO: Update
    
    // Minimum match fee (0.001 ETH = 1000000000000000 wei)
    uint256 constant MIN_MATCH_FEE = 0.001 ether;

    // Deployed contract addresses (will be set during deployment)
    SoccerAgentRegistry public soccerAgentRegistry;
    ServerReputationRegistry public serverReputationRegistry;
    LaunchPad public launchPad;
    Competition public competition;

    function run() external {
        // Get deployer private key from environment
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // ===== Step 1: Deploy SoccerAgentRegistry (serves as IdentityRegistry) =====
        console.log("\n=== Deploying SoccerAgentRegistry ===");
        soccerAgentRegistry = new SoccerAgentRegistry();
        console.log("SoccerAgentRegistry deployed at:", address(soccerAgentRegistry));

        // ===== Step 2: Deploy ServerReputationRegistry =====
        console.log("\n=== Deploying ServerReputationRegistry ===");
        serverReputationRegistry = new ServerReputationRegistry(
            address(soccerAgentRegistry) // Uses SoccerAgentRegistry as IdentityRegistry
        );
        console.log("ServerReputationRegistry deployed at:", address(serverReputationRegistry));

        // ===== Step 3: Deploy LaunchPad =====
        console.log("\n=== Deploying LaunchPad ===");
        launchPad = new LaunchPad(
            address(soccerAgentRegistry), // IdentityRegistry
            FOUNDATION_ADDRESS,           // Foundation address
            UNISWAP_V2_ROUTER            // Uniswap V2 Router
        );
        console.log("LaunchPad deployed at:", address(launchPad));

        // ===== Step 4: Deploy Competition =====
        console.log("\n=== Deploying Competition ===");
        competition = new Competition(
            address(soccerAgentRegistry),        // IdentityRegistry
            address(serverReputationRegistry),   // ServerReputationRegistry
            address(launchPad),                  // LaunchPad
            UNISWAP_V2_ROUTER,                   // Uniswap V2 Router
            MIN_MATCH_FEE,                       // Minimum match fee
            PLATFORM_TREASURY                    // Platform treasury
        );
        console.log("Competition deployed at:", address(competition));

        vm.stopBroadcast();

        // ===== Deployment Summary =====
        console.log("\n=================================");
        console.log("DEPLOYMENT SUMMARY");
        console.log("=================================");
        console.log("Network:", block.chainid);
        console.log("Deployer:", deployer);
        console.log("\nDeployed Contracts:");
        console.log("-------------------");
        console.log("SoccerAgentRegistry:       ", address(soccerAgentRegistry));
        console.log("ServerReputationRegistry:  ", address(serverReputationRegistry));
        console.log("LaunchPad:                 ", address(launchPad));
        console.log("Competition:               ", address(competition));
        console.log("\nConfiguration:");
        console.log("-------------------");
        console.log("Uniswap V2 Router:         ", UNISWAP_V2_ROUTER);
        console.log("Foundation Address:        ", FOUNDATION_ADDRESS);
        console.log("Platform Treasury:         ", PLATFORM_TREASURY);
        console.log("Min Match Fee:             ", MIN_MATCH_FEE);
        console.log("=================================\n");

        // Save deployment addresses to file
        _saveDeploymentInfo(deployer);
    }

    /// @notice Save deployment information to a JSON file
    function _saveDeploymentInfo(address deployer) internal {
        string memory json = string(abi.encodePacked(
            '{\n',
            '  "chainId": ', vm.toString(block.chainid), ',\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "timestamp": ', vm.toString(block.timestamp), ',\n',
            '  "contracts": {\n',
            '    "SoccerAgentRegistry": "', vm.toString(address(soccerAgentRegistry)), '",\n',
            '    "ServerReputationRegistry": "', vm.toString(address(serverReputationRegistry)), '",\n',
            '    "LaunchPad": "', vm.toString(address(launchPad)), '",\n',
            '    "Competition": "', vm.toString(address(competition)), '"\n',
            '  },\n',
            '  "config": {\n',
            '    "uniswapV2Router": "', vm.toString(UNISWAP_V2_ROUTER), '",\n',
            '    "foundationAddress": "', vm.toString(FOUNDATION_ADDRESS), '",\n',
            '    "platformTreasury": "', vm.toString(PLATFORM_TREASURY), '",\n',
            '    "minMatchFee": "', vm.toString(MIN_MATCH_FEE), '"\n',
            '  }\n',
            '}'
        ));

        string memory filename = string(abi.encodePacked(
            "deployments-",
            vm.toString(block.chainid),
            ".json"
        ));
        
        vm.writeFile(filename, json);
        console.log("\nDeployment info saved to:", filename);
    }

    /// @notice Helper function for testing - registers a server
    function registerTestServer(address serverAddress) external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        serverReputationRegistry.registerServer(serverAddress);
        console.log("Registered server:", serverAddress);
        
        vm.stopBroadcast();
    }

    /// @notice Helper function for testing - registers an agent
    function registerTestAgent(
        string memory teamName,
        string memory modelVersion,
        string memory tokenUri
    ) external returns (uint256 agentId) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        agentId = soccerAgentRegistry.registerSoccerAgent(
            teamName,
            modelVersion,
            tokenUri
        );
        console.log("Registered agent ID:", agentId);
        
        vm.stopBroadcast();
    }
}
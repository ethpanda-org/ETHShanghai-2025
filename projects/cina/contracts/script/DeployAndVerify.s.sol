// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/mocks/MockPriceOracle.sol";
import "contracts/core/pool/AaveFundingPool.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title DeployAndVerify
 * @notice 部署关键合约并准备验证
 */
contract DeployAndVerifyScript is Script {
    // 已存在的合约地址
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant POOL_CONFIGURATION = 0x35456038942C91eb16fe2E33C213135E75f8d188;
    address constant PROXY_ADMIN = 0x7bc6535d75541125fb3b494deCfdE10Db20C16d8;
    
    function run() external returns (address mockOracle, address newImpl) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploy Missing Contracts to Sepolia");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("");
        
        // ============================================
        // Step 1: Deploy MockPriceOracle
        // ============================================
        console.log("[1/2] Deploying MockPriceOracle...");
        
        uint256 price = 1e18; // 1 USD
        MockPriceOracle oracle = new MockPriceOracle(price, price, price);
        mockOracle = address(oracle);
        
        console.log("  MockPriceOracle:", mockOracle);
        console.log("  Price: 1.0 USD");
        console.log("  OK");
        console.log("");
        
        // ============================================
        // Step 2: Deploy AaveFundingPool Implementation
        // ============================================
        console.log("[2/2] Deploying AaveFundingPool Implementation...");
        
        AaveFundingPool impl = new AaveFundingPool(
            POOL_MANAGER,
            POOL_CONFIGURATION
        );
        newImpl = address(impl);
        
        console.log("  Implementation:", newImpl);
        console.log("  Constructor args:");
        console.log("    - PoolManager:", POOL_MANAGER);
        console.log("    - Configuration:", POOL_CONFIGURATION);
        console.log("  OK");
        console.log("");
        
        vm.stopBroadcast();
        
        // ============================================
        // Summary
        // ============================================
        console.log("===========================================");
        console.log("Deployment Complete!");
        console.log("===========================================");
        console.log("");
        console.log("Deployed Contracts:");
        console.log("  1. MockPriceOracle:      ", mockOracle);
        console.log("  2. AaveFundingPool Impl: ", newImpl);
        console.log("");
        console.log("===========================================");
        console.log("Verification Commands");
        console.log("===========================================");
        console.log("");
        console.log("# Verify MockPriceOracle");
        console.log("forge verify-contract \\");
        console.log("  ", mockOracle, "\\");
        console.log("  contracts/mocks/MockPriceOracle.sol:MockPriceOracle \\");
        console.log("  --chain sepolia \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(uint256,uint256,uint256)' 1000000000000000000 1000000000000000000 1000000000000000000)");
        console.log("");
        console.log("# Verify AaveFundingPool Implementation");
        console.log("forge verify-contract \\");
        console.log("  ADDRESS \\");
        console.log("  contracts/core/pool/AaveFundingPool.sol:AaveFundingPool \\");
        console.log("  --chain sepolia \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(address,address)' POOL_MANAGER POOL_CONFIG)");
        console.log("");
        console.log("===========================================");
        console.log("Next: Upgrade Proxy (Manual Step)");
        console.log("===========================================");
        console.log("");
        console.log("Use Hardhat or cast to upgrade:");
        console.log("");
        console.log("# Option 1: Hardhat");
        console.log("npx hardhat run scripts/upgrade-aave-proxy.ts --network sepolia");
        console.log("");
        console.log("# Option 2: Cast");
        console.log("cast send", PROXY_ADMIN, "\\");
        console.log("  'upgradeAndCall(address,address,bytes)' \\");
        console.log("  0xAb20B978021333091CA307BB09E022Cec26E8608 \\");
        console.log("  ", newImpl, "\\");
        console.log("  0x \\");
        console.log("  --rpc-url sepolia --private-key $PRIVATE_KEY");
        console.log("");
    }
}


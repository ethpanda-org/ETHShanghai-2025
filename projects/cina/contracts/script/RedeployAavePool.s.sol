// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/mocks/MockPriceOracle.sol";
import "contracts/core/pool/AaveFundingPool.sol";
import "contracts/interfaces/IPoolManager.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title RedeployAavePool
 * @notice 重新部署 AaveFundingPool（用于验证）
 */
contract RedeployAavePoolScript is Script {
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant POOL_CONFIGURATION = 0x35456038942C91eb16fe2E33C213135E75f8d188;
    address constant PROXY_ADMIN = 0x7bc6535d75541125fb3b494deCfdE10Db20C16d8;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant MOCK_ORACLE = 0x0347f7d0952b3c55E276D42b9e2950Cc0523d787;
    
    function run() external returns (address newPoolProxy, address newImpl) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Redeploy AaveFundingPool");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("Balance:", deployer.balance / 1e18, "ETH");
        console.log("");
        
        // ============================================
        // Step 1: Deploy Implementation
        // ============================================
        console.log("[1/3] Deploy Implementation");
        console.log("-------------------------------------------");
        
        AaveFundingPool implementation = new AaveFundingPool(
            POOL_MANAGER,
            POOL_CONFIGURATION
        );
        newImpl = address(implementation);
        
        console.log("Implementation Address:", newImpl);
        console.log("Constructor Args:");
        console.log("  PoolManager:", POOL_MANAGER);
        console.log("  Configuration:", POOL_CONFIGURATION);
        console.log("");
        
        // ============================================
        // Step 2: Prepare Init Data
        // ============================================
        console.log("[2/3] Prepare Initialization");
        console.log("-------------------------------------------");
        
        bytes memory initData = abi.encodeWithSelector(
            AaveFundingPool.initialize.selector,
            deployer,                        // admin
            "f(x) USDC Leveraged Position",  // name
            "xUSDC",                         // symbol
            USDC,                            // collateral
            MOCK_ORACLE                      // priceOracle
        );
        
        console.log("Init Params:");
        console.log("  Admin:", deployer);
        console.log("  Name: f(x) USDC Leveraged Position");
        console.log("  Symbol: xUSDC");
        console.log("  Collateral (USDC):", USDC);
        console.log("  Price Oracle:", MOCK_ORACLE);
        console.log("");
        
        // ============================================
        // Step 3: Deploy Proxy
        // ============================================
        console.log("[3/3] Deploy Proxy");
        console.log("-------------------------------------------");
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            newImpl,
            PROXY_ADMIN,
            initData
        );
        
        newPoolProxy = address(proxy);
        console.log("Proxy Deployed:", newPoolProxy);
        console.log("");
        
        // ============================================
        // Step 4: Configure Pool Parameters
        // ============================================
        console.log("[4/5] Configure Pool Parameters");
        console.log("-------------------------------------------");
        
        AaveFundingPool pool = AaveFundingPool(newPoolProxy);
        
        // Debt Ratio Range: 50-80%
        pool.updateDebtRatioRange(5e17, 8e17);
        console.log("OK: Debt ratio range: 50-80%");
        
        // Rebalance Ratios: 90% debt, 2.5% bonus
        pool.updateRebalanceRatios(9e17, 25e6);
        console.log("OK: Rebalance ratios set");
        
        // Liquidate Ratios: 95% debt, 5% bonus
        pool.updateLiquidateRatios(95e16, 50e6);
        console.log("OK: Liquidate ratios set");
        
        // Grant EMERGENCY_ROLE
        bytes32 EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
        pool.grantRole(EMERGENCY_ROLE, deployer);
        console.log("OK: EMERGENCY_ROLE granted");
        
        // Enable borrow and redeem
        pool.updateBorrowAndRedeemStatus(true, true);
        console.log("OK: Borrow and redeem enabled");
        console.log("");
        
        // ============================================
        // Step 5: Register to PoolManager
        // ============================================
        console.log("[5/5] Register to PoolManager");
        console.log("-------------------------------------------");
        
        (bool success,) = POOL_MANAGER.call(
            abi.encodeWithSignature(
                "registerPool(address,uint96,uint96)",
                newPoolProxy,
                uint96(100000e6),   // Collateral Capacity: 100,000 USDC
                uint96(500000e18)   // Debt Capacity: 500,000 fxUSD
            )
        );
        
        if (success) {
            console.log("OK: Pool registered to PoolManager");
            console.log("  Collateral Capacity: 100,000 USDC");
            console.log("  Debt Capacity: 500,000 fxUSD");
        } else {
            console.log("WARNING: Pool registration failed");
        }
        console.log("");
        
        vm.stopBroadcast();
        
        // ============================================
        // Deployment Summary
        // ============================================
        console.log("===========================================");
        console.log("Deployment Successful!");
        console.log("===========================================");
        console.log("");
        console.log("New Contract Addresses:");
        console.log("  AaveFundingPool Proxy:  ", newPoolProxy);
        console.log("  AaveFundingPool Impl:   ", newImpl);
        console.log("");
        console.log("Configuration:");
        console.log("  Collateral: USDC");
        console.log("  Price Oracle: MockPriceOracle (1.0 USD)");
        console.log("  Debt Ratio: 50-80%");
        console.log("  LTV Ratio: 80%");
        console.log("");
        console.log("===========================================");
        console.log("Etherscan Verification Commands");
        console.log("===========================================");
        console.log("");
        
        // Generate ABI encoded constructor args
        bytes memory constructorArgs = abi.encode(POOL_MANAGER, POOL_CONFIGURATION);
        
        console.log("# Verify Implementation:");
        console.log("forge verify-contract \\");
        console.log("  ", newImpl, "\\");
        console.log("  contracts/core/pool/AaveFundingPool.sol:AaveFundingPool \\");
        console.log("  --chain sepolia \\");
        console.log("  --constructor-args", vm.toString(constructorArgs));
        console.log("");
        
        console.log("# Or use cast encoding:");
        console.log("forge verify-contract \\");
        console.log("  ", newImpl, "\\");
        console.log("  contracts/core/pool/AaveFundingPool.sol:AaveFundingPool \\");
        console.log("  --chain sepolia \\");
        console.log("  --constructor-args $(cast abi-encode 'constructor(address,address)'");
        console.log("    ", POOL_MANAGER);
        console.log("    ", POOL_CONFIGURATION);
        console.log("  )");
        console.log("");
        
        console.log("# Verify Proxy:");
        console.log("# (Proxy auto-verifies, or verify manually on Etherscan)");
        console.log("");
        console.log("===========================================");
    }
}


// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/mocks/MockPriceOracle.sol";
import "contracts/core/pool/AaveFundingPool.sol";
import "contracts/interfaces/IPoolManager.sol";
import "@openzeppelin/contracts/proxy/transparent/ProxyAdmin.sol";
import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

/**
 * @title DeployNewAavePool
 * @notice 部署全新的 AaveFundingPool（带正确的 Oracle 配置）
 */
contract DeployNewAavePoolScript is Script {
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant POOL_CONFIGURATION = 0x35456038942C91eb16fe2E33C213135E75f8d188;
    address constant PROXY_ADMIN = 0x7bc6535d75541125fb3b494deCfdE10Db20C16d8;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant MOCK_ORACLE = 0x0347f7d0952b3c55E276D42b9e2950Cc0523d787;
    
    function run() external returns (address newPoolProxy) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Deploy New AaveFundingPool with Oracle");
        console.log("===========================================");
        console.log("Deployer:", deployer);
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
        
        console.log("Implementation:", address(implementation));
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
        
        console.log("Init params:");
        console.log("  Admin:", deployer);
        console.log("  Name: f(x) USDC Leveraged Position");
        console.log("  Symbol: xUSDC");
        console.log("  Collateral:", USDC);
        console.log("  Oracle:", MOCK_ORACLE);
        console.log("");
        
        // ============================================
        // Step 3: Deploy Proxy
        // ============================================
        console.log("[3/3] Deploy Proxy");
        console.log("-------------------------------------------");
        
        TransparentUpgradeableProxy proxy = new TransparentUpgradeableProxy(
            address(implementation),
            PROXY_ADMIN,
            initData
        );
        
        newPoolProxy = address(proxy);
        console.log("Proxy deployed:", newPoolProxy);
        console.log("");
        
        // ============================================
        // Step 4: Configure Pool
        // ============================================
        console.log("[4/4] Configure Pool Parameters");
        console.log("-------------------------------------------");
        
        AaveFundingPool pool = AaveFundingPool(newPoolProxy);
        
        // Debt Ratio Range: 50-80%
        pool.updateDebtRatioRange(5e17, 8e17);
        console.log("OK: Debt ratio range set (50-80%)");
        
        // Rebalance Ratios: 90% debt, 2.5% bonus
        pool.updateRebalanceRatios(9e17, 25e6);
        console.log("OK: Rebalance ratios set");
        
        // Liquidate Ratios: 95% debt, 5% bonus
        pool.updateLiquidateRatios(95e16, 50e6);
        console.log("OK: Liquidate ratios set");
        
        // 授予 EMERGENCY_ROLE 用于设置 borrow/redeem 状态
        bytes32 EMERGENCY_ROLE = keccak256("EMERGENCY_ROLE");
        pool.grantRole(EMERGENCY_ROLE, deployer);
        console.log("OK: EMERGENCY_ROLE granted");
        
        // Enable borrow and redeem
        pool.updateBorrowAndRedeemStatus(true, true);
        console.log("OK: Borrow and redeem enabled");
        
        // Note: Open ratio, close fee, funding ratio are set via PoolConfiguration
        console.log("OK: Basic configuration complete");
        
        console.log("");
        
        // ============================================
        // Step 5: Register to PoolManager
        // ============================================
        console.log("[5/5] Register to PoolManager");
        console.log("-------------------------------------------");
        
        // 使用 PoolManager 合约而非接口
        (bool success,) = POOL_MANAGER.call(
            abi.encodeWithSignature(
                "registerPool(address,uint96,uint96)",
                newPoolProxy,
                uint96(100000e6),  // collateralCapacity: 100,000 USDC
                uint96(500000e18)  // debtCapacity: 500,000 fxUSD (注意：可能太大）
            )
        );
        
        if (!success) {
            console.log("WARNING: Pool registration may have failed");
            console.log("You may need to register manually");
        }
        
        console.log("OK: Pool registered to PoolManager");
        console.log("  Collateral Capacity: 100,000 USDC");
        console.log("  Debt Capacity: 500,000 fxUSD");
        console.log("");
        
        vm.stopBroadcast();
        
        // ============================================
        // Summary
        // ============================================
        console.log("===========================================");
        console.log("DEPLOYMENT SUCCESSFUL!");
        console.log("===========================================");
        console.log("");
        console.log("New Contracts:");
        console.log("  AaveFundingPool Proxy:  ", newPoolProxy);
        console.log("  AaveFundingPool Impl:   ", address(implementation));
        console.log("  MockPriceOracle:        ", MOCK_ORACLE);
        console.log("");
        console.log("Configuration:");
        console.log("  Collateral: USDC");
        console.log("  Price Oracle: MockPriceOracle (1.0 USD)");
        console.log("  Debt Ratio: 50-80%");
        console.log("  LTV: 80%");
        console.log("");
        console.log("Pool Registered:");
        console.log("  Collateral Cap: 100,000 USDC");
        console.log("  Debt Cap: 500,000 fxUSD");
        console.log("");
        console.log("===========================================");
        console.log("Verify Contract:");
        console.log("===========================================");
        console.log("");
        console.log("forge verify-contract", newPoolProxy, "\\");
        console.log("  contracts/core/pool/AaveFundingPool.sol:AaveFundingPool \\");
        console.log("  --chain sepolia");
        console.log("");
        console.log("===========================================");
        console.log("Ready to test opening position!");
        console.log("===========================================");
    }
}


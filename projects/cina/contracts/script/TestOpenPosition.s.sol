// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestOpenPosition
 * @notice 测试在新部署的 AaveFundingPool 上开仓
 */
contract TestOpenPositionScript is Script {
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant NEW_POOL = 0x3C67A6Fea47A00f2Ce6D3c1D1f170558d2b091AB;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant FXUSD = 0x085a1b6da46aE375b35Dea9920a276Ef571E209c;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address user = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Test Opening Position");
        console.log("===========================================");
        console.log("User:", user);
        console.log("");
        
        IERC20 usdc = IERC20(USDC);
        IERC20 fxUSD = IERC20(FXUSD);
        
        // ============================================
        // Step 1: Check Balances
        // ============================================
        console.log("[Step 1] Check Balances");
        console.log("-------------------------------------------");
        
        uint256 usdcBalance = usdc.balanceOf(user);
        uint256 fxUSDBalanceBefore = fxUSD.balanceOf(user);
        
        console.log("USDC Balance:", usdcBalance / 1e6, "USDC");
        console.log("fxUSD Balance:", fxUSDBalanceBefore / 1e18, "fxUSD");
        console.log("");
        
        if (usdcBalance == 0) {
            console.log("ERROR: No USDC balance!");
            console.log("Please get Sepolia USDC first");
            vm.stopBroadcast();
            return;
        }
        
        // ============================================
        // Step 2: Approve USDC
        // ============================================
        console.log("[Step 2] Approve USDC");
        console.log("-------------------------------------------");
        
        uint256 allowance = usdc.allowance(user, POOL_MANAGER);
        console.log("Current Allowance:", allowance / 1e6, "USDC");
        
        if (allowance < 1e6) {
            usdc.approve(POOL_MANAGER, type(uint256).max);
            console.log("OK: USDC approved");
        } else {
            console.log("OK: Already approved");
        }
        console.log("");
        
        // ============================================
        // Step 3: Open Position
        // ============================================
        console.log("[Step 3] Open Position");
        console.log("-------------------------------------------");
        
        uint256 collateralAmount = 1e6;  // 1 USDC
        uint256 debtAmount = 5e17;       // 0.5 fxUSD
        uint256 positionId = 100;        // 使用 ID 100
        
        console.log("Parameters:");
        console.log("  Pool:", NEW_POOL);
        console.log("  Position ID:", positionId);
        console.log("  Collateral:", collateralAmount / 1e6, "USDC");
        console.log("  Debt:", debtAmount / 1e18, "fxUSD");
        console.log("");
        
        console.log("Calling PoolManager.operate()...");
        
        (bool success, bytes memory returnData) = POOL_MANAGER.call(
            abi.encodeWithSignature(
                "operate(address,uint256,int256,int256)",
                NEW_POOL,
                positionId,
                int256(collateralAmount),
                int256(debtAmount)
            )
        );
        
        if (success) {
            console.log("SUCCESS: Position opened!");
            console.log("");
            
            // ============================================
            // Step 4: Check Results
            // ============================================
            console.log("[Step 4] Verify Results");
            console.log("-------------------------------------------");
            
            uint256 usdcAfter = usdc.balanceOf(user);
            uint256 fxUSDAfter = fxUSD.balanceOf(user);
            
            console.log("USDC Balance After:", usdcAfter / 1e6, "USDC");
            console.log("USDC Used:", (usdcBalance - usdcAfter) / 1e6, "USDC");
            console.log("");
            console.log("fxUSD Balance After:", fxUSDAfter / 1e18, "fxUSD");
            console.log("fxUSD Received:", (fxUSDAfter - fxUSDBalanceBefore) / 1e18, "fxUSD");
            console.log("");
            
            console.log("===========================================");
            console.log("TEST PASSED!");
            console.log("===========================================");
            console.log("");
            console.log("Transaction successful!");
            console.log("Pool is working correctly!");
            console.log("Ready for production use!");
            
        } else {
            console.log("FAILED: Position opening failed");
            console.log("Error data:");
            console.logBytes(returnData);
            console.log("");
            
            console.log("Possible causes:");
            console.log("1. Pool not properly initialized");
            console.log("2. Insufficient collateral/debt ratio");
            console.log("3. Price oracle issue");
            console.log("4. PoolManager permission issue");
        }
        
        vm.stopBroadcast();
    }
}



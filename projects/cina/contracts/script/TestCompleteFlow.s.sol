// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/interfaces/IPoolManager.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title TestCompleteFlow
 * @notice 完整的开仓测试流程
 */
contract TestCompleteFlowScript is Script {
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant AAVE_POOL = 0xAb20B978021333091CA307BB09E022Cec26E8608;
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant FXUSD = 0x085a1b6da46aE375b35Dea9920a276Ef571E209c;
    address constant ROUTER = 0xB8B3e6C7D0f0A9754F383107A6CCEDD8F19343Ec;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address user = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Complete Open Position Flow Test");
        console.log("===========================================");
        console.log("User:", user);
        console.log("");
        
        IPoolManager poolManager = IPoolManager(POOL_MANAGER);
        IERC20 usdc = IERC20(USDC);
        IERC20 fxUSD = IERC20(FXUSD);
        
        // 1. 检查余额
        console.log("Step 1: Check Balances");
        console.log("-------------------------------------------");
        uint256 usdcBalance = usdc.balanceOf(user);
        uint256 fxUSDBalanceBefore = fxUSD.balanceOf(user);
        console.log("USDC Balance:", usdcBalance / 1e6, "USDC");
        console.log("fxUSD Balance Before:", fxUSDBalanceBefore / 1e18, "fxUSD");
        console.log("");
        
        if (usdcBalance == 0) {
            console.log("ERROR: No USDC balance!");
            vm.stopBroadcast();
            return;
        }
        
        // 2. 授权
        console.log("Step 2: Approve USDC");
        console.log("-------------------------------------------");
        uint256 currentAllowance = usdc.allowance(user, POOL_MANAGER);
        console.log("Current Allowance:", currentAllowance / 1e6, "USDC");
        
        if (currentAllowance < 1e6) {
            usdc.approve(POOL_MANAGER, type(uint256).max);
            console.log("Approved USDC to PoolManager");
        } else {
            console.log("Already approved");
        }
        console.log("");
        
        // 3. 开仓参数
        console.log("Step 3: Prepare Position Parameters");
        console.log("-------------------------------------------");
        uint256 collateralAmount = 1e6; // 1 USDC
        uint256 debtAmount = 5e17;      // 0.5 fxUSD
        uint256 positionId = uint256(keccak256(abi.encodePacked(user, block.timestamp))) % 1000000;
        
        console.log("Collateral:", collateralAmount / 1e6, "USDC");
        console.log("Debt:", debtAmount / 1e18, "fxUSD");
        console.log("Position ID:", positionId);
        console.log("");
        
        // 4. 开仓
        console.log("Step 4: Open Position");
        console.log("-------------------------------------------");
        
        try poolManager.operate(
            AAVE_POOL,
            positionId,
            int256(collateralAmount),
            int256(debtAmount)
        ) {
            console.log("SUCCESS: Position opened!");
            console.log("");
            
            // 5. 检查结果
            console.log("Step 5: Verify Results");
            console.log("-------------------------------------------");
            
            uint256 usdcBalanceAfter = usdc.balanceOf(user);
            uint256 fxUSDBalanceAfter = fxUSD.balanceOf(user);
            
            console.log("USDC Balance After:", usdcBalanceAfter / 1e6, "USDC");
            console.log("USDC Used:", (usdcBalance - usdcBalanceAfter) / 1e6, "USDC");
            console.log("");
            console.log("fxUSD Balance After:", fxUSDBalanceAfter / 1e18, "fxUSD");
            console.log("fxUSD Received:", (fxUSDBalanceAfter - fxUSDBalanceBefore) / 1e18, "fxUSD");
            console.log("");
            
            console.log("===========================================");
            console.log("TEST PASSED!");
            console.log("===========================================");
            
        } catch Error(string memory reason) {
            console.log("FAILED: Position opening failed");
            console.log("Reason:", reason);
            console.log("");
            console.log("Possible causes:");
            console.log("1. Price Oracle not set");
            console.log("2. Pool not properly initialized");
            console.log("3. Insufficient collateral/debt ratio");
            console.log("4. Pool capacity exceeded");
        }
        
        vm.stopBroadcast();
    }
}



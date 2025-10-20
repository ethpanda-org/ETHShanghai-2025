// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";

/**
 * @title DiagnoseNewPool
 * @notice 诊断新部署的池子
 */
contract DiagnoseNewPoolScript is Script {
    address constant NEW_POOL = 0x3C67A6Fea47A00f2Ce6D3c1D1f170558d2b091AB;
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant MOCK_ORACLE = 0x0347f7d0952b3c55E276D42b9e2950Cc0523d787;
    
    function run() external view {
        console.log("===========================================");
        console.log("Diagnose New Pool");
        console.log("===========================================");
        console.log("");
        
        // Check pool info from PoolManager
        console.log("[1] Pool Registration");
        console.log("-------------------------------------------");
        
        (bool success1, bytes memory result1) = POOL_MANAGER.staticcall(
            abi.encodeWithSignature(
                "getPoolInfo(address)",
                NEW_POOL
            )
        );
        
        if (success1) {
            (address rewarder, address gauge, uint256 collCap, uint256 debtCap) = 
                abi.decode(result1, (address, address, uint256, uint256));
            console.log("Pool registered:");
            console.log("  Rewarder:", rewarder);
            console.log("  Gauge:", gauge);
            console.log("  Collateral Cap:", collCap / 1e6, "USDC");
            console.log("  Debt Cap:", debtCap / 1e18, "fxUSD");
        } else {
            console.log("ERROR: Pool not registered!");
        }
        console.log("");
        
        // Check pool details
        console.log("[2] Pool Details");
        console.log("-------------------------------------------");
        
        (bool success2, bytes memory result2) = NEW_POOL.staticcall(
            abi.encodeWithSignature("priceOracle()")
        );
        
        if (success2) {
            address oracle = abi.decode(result2, (address));
            console.log("Price Oracle:", oracle);
            console.log("Expected:", MOCK_ORACLE);
            console.log("Match:", oracle == MOCK_ORACLE);
        }
        
        (bool success3, bytes memory result3) = NEW_POOL.staticcall(
            abi.encodeWithSignature("collateral()")
        );
        
        if (success3) {
            address collateral = abi.decode(result3, (address));
            console.log("Collateral:", collateral);
        }
        
        (bool success4, bytes memory result4) = NEW_POOL.staticcall(
            abi.encodeWithSignature("poolManager()")
        );
        
        if (success4) {
            address poolMgr = abi.decode(result4, (address));
            console.log("Pool Manager:", poolMgr);
            console.log("Match:", poolMgr == POOL_MANAGER);
        }
        console.log("");
        
        // Check price
        console.log("[3] Price Oracle");
        console.log("-------------------------------------------");
        
        (bool success5, bytes memory result5) = NEW_POOL.staticcall(
            abi.encodeWithSignature("getPrice()")
        );
        
        if (success5) {
            (uint256 anchorPrice, uint256 minPrice, uint256 maxPrice) = 
                abi.decode(result5, (uint256, uint256, uint256));
            console.log("Anchor Price:", anchorPrice / 1e18, "USD");
            console.log("Min Price:", minPrice / 1e18, "USD");
            console.log("Max Price:", maxPrice / 1e18, "USD");
        } else {
            console.log("ERROR: Cannot get price!");
        }
        console.log("");
        
        // Check borrow/redeem status
        console.log("[4] Borrow/Redeem Status");
        console.log("-------------------------------------------");
        
        (bool success6, bytes memory result6) = NEW_POOL.staticcall(
            abi.encodeWithSignature("canBorrow()")
        );
        
        if (success6) {
            bool canBorrow = abi.decode(result6, (bool));
            console.log("Can Borrow:", canBorrow);
        }
        
        (bool success7, bytes memory result7) = NEW_POOL.staticcall(
            abi.encodeWithSignature("canRedeem()")
        );
        
        if (success7) {
            bool canRedeem = abi.decode(result7, (bool));
            console.log("Can Redeem:", canRedeem);
        }
        console.log("");
        
        // Check debt ratio range
        console.log("[5] Debt Ratio Range");
        console.log("-------------------------------------------");
        
        (bool success8, bytes memory result8) = NEW_POOL.staticcall(
            abi.encodeWithSignature("getDebtRatioRange()")
        );
        
        if (success8) {
            (uint256 lower, uint256 upper) = abi.decode(result8, (uint256, uint256));
            console.log("Lower:", lower * 100 / 1e18, "%");
            console.log("Upper:", upper * 100 / 1e18, "%");
        }
        console.log("");
        
        console.log("===========================================");
        console.log("Diagnosis Complete");
        console.log("===========================================");
    }
}



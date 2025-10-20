// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "forge-std/Script.sol";
import "contracts/interfaces/IFxUSDRegeneracy.sol";

/**
 * @title ConfigurePermissions
 * @notice 配置所有必要的权限
 */
contract ConfigurePermissionsScript is Script {
    address constant POOL_MANAGER = 0xBb644076500Ea106d9029B382C4d49f56225cB82;
    address constant FXUSD = 0x085a1b6da46aE375b35Dea9920a276Ef571E209c;
    address constant FXUSD_BASE_POOL = 0x420D6b8546F14C394A703F5ac167619760A721A9;
    address constant NEW_POOL = 0x3C67A6Fea47A00f2Ce6D3c1D1f170558d2b091AB;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);
        
        console.log("===========================================");
        console.log("Configure Permissions");
        console.log("===========================================");
        console.log("Deployer:", deployer);
        console.log("");
        
        bytes32 POOL_MANAGER_ROLE = keccak256("POOL_MANAGER_ROLE");
        
        // ============================================
        // 1. Grant POOL_MANAGER_ROLE to PoolManager on FxUSD
        // ============================================
        console.log("[1/3] FxUSD Permissions");
        console.log("-------------------------------------------");
        
        (bool success0, bytes memory result0) = FXUSD.call(
            abi.encodeWithSignature(
                "hasRole(bytes32,address)",
                POOL_MANAGER_ROLE,
                POOL_MANAGER
            )
        );
        
        bool hasRole = success0 && abi.decode(result0, (bool));
        console.log("PoolManager has POOL_MANAGER_ROLE:", hasRole);
        
        if (!hasRole) {
            (bool success,) = FXUSD.call(
                abi.encodeWithSignature(
                    "grantRole(bytes32,address)",
                    POOL_MANAGER_ROLE,
                    POOL_MANAGER
                )
            );
            if (success) {
                console.log("OK: POOL_MANAGER_ROLE granted");
            } else {
                console.log("WARNING: Failed to grant role");
            }
        } else {
            console.log("OK: Already has role");
        }
        console.log("");
        
        // ============================================
        // 2. Grant POOL_MANAGER_ROLE to PoolManager on FxUSDBasePool
        // ============================================
        console.log("[2/3] FxUSDBasePool Permissions");
        console.log("-------------------------------------------");
        
        (bool success1, bytes memory result1) = FXUSD_BASE_POOL.call(
            abi.encodeWithSignature(
                "hasRole(bytes32,address)",
                POOL_MANAGER_ROLE,
                POOL_MANAGER
            )
        );
        
        if (success1 && abi.decode(result1, (bool)) == false) {
            (bool success2,) = FXUSD_BASE_POOL.call(
                abi.encodeWithSignature(
                    "grantRole(bytes32,address)",
                    POOL_MANAGER_ROLE,
                    POOL_MANAGER
                )
            );
            
            if (success2) {
                console.log("OK: POOL_MANAGER_ROLE granted to BasePool");
            } else {
                console.log("WARNING: Failed to grant role");
            }
        } else {
            console.log("OK: Already has role or check failed");
        }
        console.log("");
        
        // ============================================
        // 3. Grant POOL_MANAGER_ROLE to PoolManager on New Pool
        // ============================================
        console.log("[3/3] New Pool Permissions");
        console.log("-------------------------------------------");
        
        (bool success3, bytes memory result3) = NEW_POOL.call(
            abi.encodeWithSignature(
                "hasRole(bytes32,address)",
                POOL_MANAGER_ROLE,
                POOL_MANAGER
            )
        );
        
        if (success3 && abi.decode(result3, (bool)) == false) {
            (bool success4,) = NEW_POOL.call(
                abi.encodeWithSignature(
                    "grantRole(bytes32,address)",
                    POOL_MANAGER_ROLE,
                    POOL_MANAGER
                )
            );
            
            if (success4) {
                console.log("OK: POOL_MANAGER_ROLE granted to New Pool");
            } else {
                console.log("WARNING: Failed to grant role");
            }
        } else {
            console.log("OK: Already has role or check failed");
        }
        console.log("");
        
        vm.stopBroadcast();
        
        console.log("===========================================");
        console.log("Permissions Configured!");
        console.log("===========================================");
        console.log("");
        console.log("Ready to test opening position!");
    }
}


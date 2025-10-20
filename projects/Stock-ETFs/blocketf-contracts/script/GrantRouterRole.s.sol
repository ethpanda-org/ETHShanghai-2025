// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

/**
 * @title GrantRouterRole
 * @notice Grant MINTER_ROLE to new Router contract
 */
contract GrantRouterRole is Script {
    function run() public {
        // ETF Core address
        address etfCore = 0xa63E59DEf7Ab22C17030467E75829C7F90f44d0C;

        // New Router address
        address newRouter = 0xa87f31e7c044260d466727607FF3Aed5c8330743;

        // Old Router address (optional - for revocation)
        address oldRouter = 0x504fB83cc09cf55Ac41f1ae660d33980b13Db659;

        console2.log("========================================");
        console2.log("Granting MINTER_ROLE to New Router");
        console2.log("========================================");
        console2.log("ETF Core:", etfCore);
        console2.log("New Router:", newRouter);
        console2.log("Old Router:", oldRouter);
        console2.log("");

        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deployer:", deployer);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        IAccessControl core = IAccessControl(etfCore);
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");

        // Grant MINTER_ROLE to new Router
        console2.log("Granting MINTER_ROLE to new Router...");
        core.grantRole(MINTER_ROLE, newRouter);
        console2.log("MINTER_ROLE granted to:", newRouter);

        // Optionally revoke from old Router
        console2.log("");
        console2.log("Revoking MINTER_ROLE from old Router...");
        core.revokeRole(MINTER_ROLE, oldRouter);
        console2.log("MINTER_ROLE revoked from:", oldRouter);

        vm.stopBroadcast();

        console2.log("");
        console2.log("========================================");
        console2.log("Role Management Complete!");
        console2.log("========================================");
    }
}

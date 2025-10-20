// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/FocusBond.sol";
import "../contracts/MockUSDC.sol";
import "../contracts/FocusCredit.sol";

contract DeployScript is Script {
    function run() external {
        // Use Anvil's default private key for local deployment
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC first
        MockUSDC usdc = new MockUSDC("Mock USDC", "USDC", deployer);
        console.log("MockUSDC deployed at:", address(usdc));

        // Deploy FocusCredit
        FocusCredit focusCredit = new FocusCredit();
        console.log("FocusCredit deployed at:", address(focusCredit));

        // Set reward treasury (can be deployer for testing)
        address rewardTreasury = deployer;

        // Deploy FocusBond contract
        // Base fees: 1 USDC (1e6), 10 FOCUS (10e18)
        FocusBond focusBond = new FocusBond(
            address(usdc),
            address(focusCredit),
            rewardTreasury,
            1e6,  // 1 USDC base fee
            10e18 // 10 FOCUS base fee (从5调整为10)
        );
        console.log("FocusBond deployed at:", address(focusBond));

        // Set up FocusCredit
        focusCredit.setFocusBond(address(focusBond));
        focusCredit.grantRole(focusCredit.MINTER_ROLE(), address(focusBond));
        
        // Mint some test tokens to deployer
        usdc.mint(deployer, 10000); // 10,000 USDC
        focusCredit.grantCredits(deployer, 100000 * 10**18, "Initial test credits"); // 100,000 FOCUS credits

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== Deployment Summary ===");
        console.log("Deployer:", deployer);
        console.log("MockUSDC:", address(usdc));
        console.log("FocusCredit:", address(focusCredit));
        console.log("FocusBond:", address(focusBond));
        console.log("Reward Treasury:", rewardTreasury);
        console.log("\n=== Configuration ===");
        console.log("Base Fee USDC:", focusBond.baseFeeUsdc());
        console.log("Base Fee FOCUS:", focusBond.baseFeeFocus());
        console.log("Min Complete Minutes:", focusBond.minCompleteMinutes());
        console.log("Heartbeat Grace Seconds:", focusBond.heartbeatGraceSecs());
        console.log("Watchdog Slash BPS:", focusBond.watchdogSlashBps());
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/FocusBond.sol";
import "../contracts/FocusCredit.sol";
import "../contracts/MockUSDC.sol";

/**
 * @title DeployCompliant
 * @notice Deployment script for compliant FocusBond system with non-transferable credits
 * @dev This deployment avoids ICO/token sale risks by using non-transferable credits
 */
contract DeployCompliantScript is Script {
    function run() external {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);
        
        vm.startBroadcast(deployerPrivateKey);

        console.log("=== Deploying Compliant FocusBond System ===");
        console.log("Deployer:", deployer);

        // 1. Deploy MockUSDC (for legacy support)
        MockUSDC usdc = new MockUSDC("Mock USDC", "USDC", deployer);
        console.log("MockUSDC deployed at:", address(usdc));

        // 2. Deploy FocusCredit (non-transferable credits)
        FocusCredit focusCredit = new FocusCredit();
        console.log("FocusCredit deployed at:", address(focusCredit));

        // 3. Deploy FocusBond with compliant parameters
        FocusBond focusBond = new FocusBond(
            address(usdc),           // USDC for legacy support
            address(focusCredit),    // Non-transferable credits
            deployer,                // Treasury (deployer for demo)
            10_000_000,             // Base USDC fee: 10 USDC (6 decimals)
            100_000_000_000_000_000_000  // Base credit fee: 100 credits (18 decimals)
        );
        console.log("FocusBond deployed at:", address(focusBond));

        // 4. Configure FocusCredit to work with FocusBond
        focusCredit.setFocusBond(address(focusBond));
        console.log("FocusCredit configured to work with FocusBond");

        // 5. Grant MINTER_ROLE to FocusBond contract
        bytes32 MINTER_ROLE = keccak256("MINTER_ROLE");
        focusCredit.grantRole(MINTER_ROLE, address(focusBond));
        console.log("Granted MINTER_ROLE to FocusBond contract");

        // 6. Setup test accounts with initial tokens
        console.log("\n=== Setting up test accounts ===");
        
        // Test account 1: 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A
        address testAccount1 = 0x891402c216Dbda3eD7BEB0f95Dd89b010523642A;
        
        // Send 1 ETH to test account
        (bool success, ) = payable(testAccount1).call{value: 1 ether}("");
        require(success, "ETH transfer failed");
        console.log("Sent 1 ETH to:", testAccount1);
        
        // Grant 1000 FOCUS credits
        focusCredit.grantCredits(testAccount1, 1000 * 10**18, "Initial test credits");
        console.log("Granted 1000 FOCUS to:", testAccount1);

        vm.stopBroadcast();

        console.log("=== Deployment Complete ===");
        console.log("COMPLIANCE NOTICE:");
        console.log("- FocusCredit tokens are NON-TRANSFERABLE");
        console.log("- No token sale or purchase mechanism");
        console.log("- Credits are earned through app usage only");
        console.log("- This system avoids ICO/securities regulations");
        
        console.log("\n=== Contract Addresses ===");
        console.log("MockUSDC:     ", address(usdc));
        console.log("FocusCredit:  ", address(focusCredit));
        console.log("FocusBond:    ", address(focusBond));
    }
}

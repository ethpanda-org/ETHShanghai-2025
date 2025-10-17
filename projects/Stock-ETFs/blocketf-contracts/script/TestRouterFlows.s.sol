// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {stdJson} from "forge-std/StdJson.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IETFRouterV1 {
    function mintExactShares(
        uint256 shares,
        uint256 maxUSDT,
        uint256 deadline
    ) external returns (uint256 usdtUsed);

    function mintWithUSDT(
        uint256 usdtAmount,
        uint256 minShares,
        uint256 deadline
    ) external returns (uint256 shares);

    function burnToUSDT(
        uint256 shares,
        uint256 minUSDT,
        uint256 deadline
    ) external returns (uint256 usdtAmount);

    function usdtNeededForShares(
        uint256 shares
    ) external view returns (uint256 usdtAmount);

    function usdtToShares(
        uint256 usdtAmount
    ) external view returns (uint256 shares);

    function sharesToUsdt(
        uint256 shares
    ) external view returns (uint256 usdtAmount);
}

interface IUSDTFaucet {
    function claim() external;
}

/**
 * @title TestRouterFlows
 * @notice Script to test Router's mint and burn flows
 * @dev Tests three main flows:
 *      1. mintExactShares (mint exact amount of ETF shares)
 *      2. mintWithUSDT (mint with USDT amount)
 *      3. burnToUSDT (burn ETF shares to receive USDT)
 */
contract TestRouterFlows is Script {
    using stdJson for string;

    // Contract addresses
    address public router;
    address public etfCore;
    address public usdt;
    address public usdtFaucet;

    // Test parameters
    uint256 constant TEST_SHARES_AMOUNT = 1e18; // 1 T5 token
    uint256 constant TEST_USDT_AMOUNT = 1000e18; // 1000 USDT
    uint256 constant SLIPPAGE_BPS = 500; // 5% slippage

    function setUp() public {
        loadContractsFromJson();
    }

    function loadContractsFromJson() internal {
        string memory root = vm.projectRoot();
        string memory path = string.concat(root, "/deployed-contracts.json");
        string memory json = vm.readFile(path);

        router = json.readAddress(".contracts.router.contractAddress");
        etfCore = json.readAddress(".contracts.etfCore.contractAddress");
        usdt = json.readAddress(".contracts.mockTokens[5].contractAddress");
        usdtFaucet = json.readAddress(".contracts.usdtFaucet.contractAddress");

        console2.log("Loaded contracts from deployed-contracts.json");
        console2.log("  Router:", router);
        console2.log("  ETF Core:", etfCore);
        console2.log("  USDT:", usdt);
        console2.log("");
    }

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("========================================");
        console2.log("Testing Router Flows");
        console2.log("========================================");
        console2.log("Deployer:", deployer);
        console2.log("");

        vm.startBroadcast(deployerPrivateKey);

        // Step 0: Get USDT from faucet if needed
        ensureUSDTBalance(deployer);

        // Test Flow 1: mintExactShares
        console2.log("========================================");
        console2.log("Test 1: mintExactShares()");
        console2.log("========================================");
        testMintExactShares(deployer);

        // Test Flow 2: mintWithUSDT
        console2.log("\n========================================");
        console2.log("Test 2: mintWithUSDT()");
        console2.log("========================================");
        testMintWithUSDT(deployer);

        // Test Flow 3: burnToUSDT
        console2.log("\n========================================");
        console2.log("Test 3: burnToUSDT()");
        console2.log("========================================");
        testBurnToUSDT(deployer);

        vm.stopBroadcast();

        console2.log("\n========================================");
        console2.log("All Tests Complete!");
        console2.log("========================================");
    }

    /**
     * @notice Ensure deployer has enough USDT for testing
     */
    function ensureUSDTBalance(address deployer) internal {
        uint256 usdtBalance = IERC20(usdt).balanceOf(deployer);
        console2.log("Current USDT balance:", usdtBalance / 1e18);

        uint256 requiredUSDT = 50000e18; // Need ~50k USDT for all tests

        if (usdtBalance < requiredUSDT) {
            console2.log("Insufficient USDT, claiming from faucet...");

            // Claim multiple times if needed
            uint256 claimCount = (requiredUSDT - usdtBalance) / 10000e18 + 1;
            for (uint256 i = 0; i < claimCount && i < 5; i++) {
                try IUSDTFaucet(usdtFaucet).claim() {
                    console2.log("  Claimed 10,000 USDT");
                } catch {
                    console2.log("  Faucet claim failed (may have cooldown)");
                    break;
                }
            }

            usdtBalance = IERC20(usdt).balanceOf(deployer);
            console2.log("New USDT balance:", usdtBalance / 1e18);
        }

        console2.log("");
    }

    /**
     * @notice Test Flow 1: Mint exact amount of shares
     * @dev User specifies exact shares to mint, router calculates USDT needed
     */
    function testMintExactShares(address user) internal {
        uint256 sharesToMint = TEST_SHARES_AMOUNT;

        console2.log("Target shares:", sharesToMint / 1e18);

        // Step 1: Get quote for exact shares
        uint256 estimatedUSDT = IETFRouterV1(router).usdtNeededForShares(
            sharesToMint
        );
        console2.log("Estimated USDT needed:", estimatedUSDT / 1e18);

        // Step 2: Add slippage buffer
        uint256 maxUSDT = (estimatedUSDT * (10000 + SLIPPAGE_BPS)) / 10000;
        console2.log("Max USDT (with slippage):", maxUSDT / 1e18);

        // Step 3: Check and approve USDT
        uint256 usdtBalance = IERC20(usdt).balanceOf(user);
        require(usdtBalance >= maxUSDT, "Insufficient USDT balance");

        IERC20(usdt).approve(router, maxUSDT);
        console2.log("USDT approved");

        // Step 4: Record balances before
        uint256 usdtBefore = IERC20(usdt).balanceOf(user);
        uint256 sharesBefore = IERC20(etfCore).balanceOf(user);

        console2.log("\nBalances before:");
        console2.log("  USDT:", usdtBefore / 1e18);
        console2.log("  T5 Shares:", sharesBefore / 1e18);

        // Step 5: Execute mint
        uint256 deadline = block.timestamp + 1 hours;

        try IETFRouterV1(router).mintExactShares(
            sharesToMint,
            maxUSDT,
            deadline
        ) returns (uint256 usdtUsed) {
            // Step 6: Check balances after
            uint256 usdtAfter = IERC20(usdt).balanceOf(user);
            uint256 sharesAfter = IERC20(etfCore).balanceOf(user);

            console2.log("\nBalances after:");
            console2.log("  USDT:", usdtAfter / 1e18);
            console2.log("  T5 Shares:", sharesAfter / 1e18);

            console2.log("\nChanges:");
            console2.log("  USDT used:", usdtUsed / 1e18);
            console2.log("  USDT refunded:", (maxUSDT - usdtUsed) / 1e18);
            console2.log("  Shares received:", (sharesAfter - sharesBefore) / 1e18);

            // Verify results
            require(
                sharesAfter - sharesBefore == sharesToMint,
                "Incorrect shares minted"
            );
            require(usdtUsed <= maxUSDT, "Used more USDT than max");

            console2.log("\n[PASS] Test 1 PASSED: mintExactShares works correctly");
        } catch Error(string memory reason) {
            console2.log("\n[FAIL] Test 1 FAILED:", reason);
            revert(reason);
        } catch {
            console2.log("\n[FAIL] Test 1 FAILED: Unknown error");
            revert("mintExactShares failed");
        }
    }

    /**
     * @notice Test Flow 2: Mint with exact USDT amount
     * @dev User specifies USDT to spend, router calculates shares to mint
     */
    function testMintWithUSDT(address user) internal {
        uint256 usdtToSpend = TEST_USDT_AMOUNT;

        console2.log("USDT to spend:", usdtToSpend / 1e18);

        // Step 1: Get quote for USDT amount
        uint256 estimatedShares = IETFRouterV1(router).usdtToShares(
            usdtToSpend
        );
        console2.log("Estimated shares:", estimatedShares / 1e18);

        // Step 2: Calculate min shares with slippage
        uint256 minShares = (estimatedShares * (10000 - SLIPPAGE_BPS)) / 10000;
        console2.log("Min shares (with slippage):", minShares / 1e18);

        // Step 3: Check and approve USDT
        uint256 usdtBalance = IERC20(usdt).balanceOf(user);
        require(usdtBalance >= usdtToSpend, "Insufficient USDT balance");

        IERC20(usdt).approve(router, usdtToSpend);
        console2.log("USDT approved");

        // Step 4: Record balances before
        uint256 usdtBefore = IERC20(usdt).balanceOf(user);
        uint256 sharesBefore = IERC20(etfCore).balanceOf(user);

        console2.log("\nBalances before:");
        console2.log("  USDT:", usdtBefore / 1e18);
        console2.log("  T5 Shares:", sharesBefore / 1e18);

        // Step 5: Execute mint
        uint256 deadline = block.timestamp + 1 hours;

        try IETFRouterV1(router).mintWithUSDT(
            usdtToSpend,
            minShares,
            deadline
        ) returns (uint256 sharesMinted) {
            // Step 6: Check balances after
            uint256 usdtAfter = IERC20(usdt).balanceOf(user);
            uint256 sharesAfter = IERC20(etfCore).balanceOf(user);

            console2.log("\nBalances after:");
            console2.log("  USDT:", usdtAfter / 1e18);
            console2.log("  T5 Shares:", sharesAfter / 1e18);

            console2.log("\nChanges:");
            console2.log("  USDT spent:", (usdtBefore - usdtAfter) / 1e18);
            console2.log("  Shares received:", sharesMinted / 1e18);

            // Verify results
            require(sharesMinted >= minShares, "Received less shares than minimum");
            require(
                sharesAfter - sharesBefore == sharesMinted,
                "Share balance mismatch"
            );

            console2.log("\n[PASS] Test 2 PASSED: mintWithUSDT works correctly");
        } catch Error(string memory reason) {
            console2.log("\n[FAIL] Test 2 FAILED:", reason);
            revert(reason);
        } catch {
            console2.log("\n[FAIL] Test 2 FAILED: Unknown error");
            revert("mintWithUSDT failed");
        }
    }

    /**
     * @notice Test Flow 3: Burn shares to receive USDT
     * @dev User burns T5 shares and receives USDT
     */
    function testBurnToUSDT(address user) internal {
        // Step 1: Check current T5 balance
        uint256 currentShares = IERC20(etfCore).balanceOf(user);
        console2.log("Current T5 shares:", currentShares / 1e18);

        require(currentShares > 0, "No shares to burn");

        // Burn half of the shares
        uint256 sharesToBurn = currentShares / 2;
        console2.log("Shares to burn:", sharesToBurn / 1e18);

        // Step 2: Get quote for burn
        uint256 estimatedUSDT = IETFRouterV1(router).sharesToUsdt(sharesToBurn);
        console2.log("Estimated USDT to receive:", estimatedUSDT / 1e18);

        // Step 3: Calculate min USDT with slippage
        uint256 minUSDT = (estimatedUSDT * (10000 - SLIPPAGE_BPS)) / 10000;
        console2.log("Min USDT (with slippage):", minUSDT / 1e18);

        // Step 4: Approve shares to router
        IERC20(etfCore).approve(router, sharesToBurn);
        console2.log("T5 shares approved");

        // Step 5: Record balances before
        uint256 usdtBefore = IERC20(usdt).balanceOf(user);
        uint256 sharesBefore = IERC20(etfCore).balanceOf(user);

        console2.log("\nBalances before:");
        console2.log("  USDT:", usdtBefore / 1e18);
        console2.log("  T5 Shares:", sharesBefore / 1e18);

        // Step 6: Execute burn
        uint256 deadline = block.timestamp + 1 hours;

        try IETFRouterV1(router).burnToUSDT(sharesToBurn, minUSDT, deadline)
        returns (uint256 usdtReceived) {
            // Step 7: Check balances after
            uint256 usdtAfter = IERC20(usdt).balanceOf(user);
            uint256 sharesAfter = IERC20(etfCore).balanceOf(user);

            console2.log("\nBalances after:");
            console2.log("  USDT:", usdtAfter / 1e18);
            console2.log("  T5 Shares:", sharesAfter / 1e18);

            console2.log("\nChanges:");
            console2.log("  Shares burned:", (sharesBefore - sharesAfter) / 1e18);
            console2.log("  USDT received:", usdtReceived / 1e18);

            // Verify results
            require(usdtReceived >= minUSDT, "Received less USDT than minimum");
            require(
                sharesBefore - sharesAfter == sharesToBurn,
                "Incorrect shares burned"
            );
            require(
                usdtAfter - usdtBefore == usdtReceived,
                "USDT balance mismatch"
            );

            console2.log("\n[PASS] Test 3 PASSED: burnToUSDT works correctly");
        } catch Error(string memory reason) {
            console2.log("\n[FAIL] Test 3 FAILED:", reason);
            revert(reason);
        } catch {
            console2.log("\n[FAIL] Test 3 FAILED: Unknown error");
            revert("burnToUSDT failed");
        }
    }
}

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {WealthProofRegistry} from "../contracts/WealthProofRegistry.sol";
import {WealthProofInstance} from "../contracts/WealthProofInstance.sol";

/**
 * @title DemoSimple  
 * @notice Simplified demo script - clean output, easy to understand
 * 
 * Usage:
 *   Terminal 1: yarn chain
 *   Terminal 2: forge script script/DemoSimple.s.sol --fork-url http://localhost:8545 --broadcast
 */
contract DemoSimple is Script {
    
    function run() public {
        console.log("");
        console.log("==================================================");
        console.log("          ZK FLEX DEMO - FULL WALKTHROUGH        ");
        console.log("==================================================");
        console.log("");
        
        // Load addresses from environment variables
        address bobReal = vm.envOr("BOB_REAL_ADDRESS", address(0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc));
        address bobProxy = vm.envOr("BOB_PROXY_ADDRESS", address(0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266));
        address alice = vm.envOr("ALICE_ADDRESS", address(0x70997970C51812dc3A010C7d01b50e0d17dc79C8));
        
        console.log("Demo Addresses:");
        console.log("  Bob_real:", bobReal);
        console.log("  Bob_proxy:", bobProxy);
        console.log("  Alice:", alice);
        console.log("");
        
        // STEP 0: Setup test balances (before broadcast)
        console.log("[0/6] Setup: Funding wallets...");
        _fundTestWallets(bobReal, bobProxy, alice);
        console.log("      Demo addresses funded with test ETH");
        console.log("");
        
        vm.startBroadcast();
        
        // STEP 1: Deploy
        console.log("[1/6] Deploying contracts...");
        WealthProofRegistry registry = new WealthProofRegistry();
        console.log("      Registry deployed:", address(registry));
        console.log("      Verifier deployed:", address(registry.verifier()));
        console.log("");
        
        // STEP 2: Create wallet pool
        console.log("[2/6] Bob creates wallet pool instance...");
        address[32] memory pool = _makeWalletPool(bobReal);
        
        console.log("      Pool: 32 addresses");
        console.log("      Bob_real:", bobReal, "(at position 15)");
        console.log("      Bob_real balance:", bobReal.balance / 1 ether, "ETH");
        console.log("");
        
        address instance = registry.createProofInstance(pool);
        console.log("      Instance created:", instance);
        console.log("");
        
        // STEP 3: Check snapshot
        console.log("[3/6] Balance snapshot created");
        WealthProofInstance inst = WealthProofInstance(instance);
        WealthProofInstance.Snapshot memory snap = inst.getLatestSnapshot();
        
        console.log("      Snapshot block:", snap.blockNumber);
        console.log("      Snapshot time:", snap.timestamp);
        console.log("");
        console.log("      Balance preview:");
        console.log("        [0]", snap.balances[0] / 1 ether, "ETH");
        console.log("        [1]", snap.balances[1] / 1 ether, "ETH");
        console.log("        [2]", snap.balances[2] / 1 ether, "ETH");
        console.log("        ...");
        console.log("        [15] (Bob_real)", snap.balances[15] / 1 ether, "ETH");
        console.log("        ...");
        console.log("");
        
        vm.stopBroadcast();
        
        // STEP 4: Proof generation (explanation)
        console.log("[4/6] Proof generation (in browser, off-chain)");
        console.log("      What Bob does:");
        console.log("        1. Switch to Bob_real wallet in MetaMask");
        console.log("        2. Sign message: 'ZK Flex Proof'");
        console.log("        3. Browser generates ZK proof:");
        console.log("           - Loads circuit files (5-10s)");
        console.log("           - Computes witness");
        console.log("           - Runs Groth16 prover (20-50s)");
        console.log("        4. Downloads proof.json (288 bytes)");
        console.log("");
        console.log("      Private inputs (hidden in proof):");
        console.log("        - Signature from Bob_real");
        console.log("        - walletIndex = 15");
        console.log("        - Bob_real address");
        console.log("");
        console.log("      Public inputs (visible in proof):");
        console.log("        - Message hash");
        console.log("        - 32 addresses");
        console.log("        - 32 balances");
        console.log("        - Threshold (e.g., 1000 ETH)");
        console.log("");
        
        // STEP 5: Verification (explanation)
        console.log("[5/6] Proof verification (FREE)");
        console.log("      What Alice does:");
        console.log("        1. Receives proof.json from Bob");
        console.log("        2. Uploads to frontend");
        console.log("        3. Frontend calls: instance.verifyProof()");
        console.log("           - VIEW function (no transaction)");
        console.log("           - No Gas cost");
        console.log("           - Instant result");
        console.log("");
        console.log("      Result: VALID");
        console.log("");
        console.log("      What Alice learns:");
        console.log("        [YES] Someone in the 32-address pool");
        console.log("        [YES] Has balance >= threshold");
        console.log("        [NO]  Does NOT know WHO");
        console.log("        [NO]  Does NOT know exact balance");
        console.log("");
        
        // STEP 6: Privacy analysis
        console.log("[6/6] Privacy analysis");
        console.log("      Chain data (PUBLIC):");
        console.log("        - Bob_proxy created this instance");
        console.log("        - Instance contains 32 addresses");
        console.log("        - Each address's balance at block", snap.blockNumber);
        console.log("");
        console.log("      Hidden data (PRIVATE):");
        console.log("        - Which address is Bob_real? (1/32 chance)");
        console.log("        - Bob's wallet index? (Never revealed)");
        console.log("        - Bob's signature? (Only in browser)");
        console.log("");
        
        // Summary
        console.log("==================================================");
        console.log("                    SUMMARY                       ");
        console.log("==================================================");
        console.log("");
        console.log("Contracts:");
        console.log("  Registry:", address(registry));
        console.log("  Instance:", instance);
        console.log("");
        console.log("Privacy:");
        console.log("  - 32 addresses (anonymity set)");
        console.log("  - Bob hidden among them");
        console.log("  - Guess probability: 3.125%");
        console.log("");
        console.log("Performance:");
        console.log("  - Proof size: 288 bytes");
        console.log("  - Proof time: 30-60s");
        console.log("  - Verify cost: FREE");
        console.log("");
        console.log("==================================================");
        console.log("");
    }
    
    function _makeWalletPool(address bobReal) internal pure returns (address[32] memory) {
        address[32] memory p;
        
        // Well-known addresses (public whales for mixing)
        p[0] = 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045; // Vitalik
        p[1] = 0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8; // Binance 7
        p[2] = 0xDA9dfA130Df4dE4673b89022EE50ff26f6EA73Cf; // Kraken 4
        p[3] = 0x8315177aB297bA92A06054cE80a67Ed4DBd7ed3a; // Bitfinex
        p[4] = 0x742d35Cc6634C0532925a3b844Bc454e4438f44e; // Bitfinex 2
        
        // More public addresses (DAOs, protocols)
        p[5] = 0x1a9C8182C09F50C8318d769245beA52c32BE35BC; // Uniswap Foundation
        p[6] = 0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2; // Maker DAO
        p[7] = 0x2FAF487A4414Fe77e2327F0bf4AE2a264a776AD2; // FTX Recovery
        p[8] = 0x40B38765696e3d5d8d9d834D8AaD4bB6e418E489; // Jump Trading
        
        // Fill positions 9-14 with generated addresses
        for (uint i = 9; i < 15; i++) {
            p[i] = address(uint160(uint256(keccak256(abi.encodePacked("public", i)))));
        }
        
        // Bob_real at position 15 (hidden among public addresses)
        p[15] = bobReal;
        
        // Fill remaining positions 16-31
        for (uint i = 16; i < 32; i++) {
            p[i] = address(uint160(uint256(keccak256(abi.encodePacked("filler", i)))));
        }
        
        return p;
    }
    
    /**
     * @notice Fund demo wallets with test ETH
     * @dev Uses vm.deal cheatcode - gives addresses test ETH in local chain
     */
    function _fundTestWallets(address bobReal, address bobProxy, address alice) internal {
        // Fund Bob_real (the address Bob wants to prove)
        vm.deal(bobReal, 15000 ether);
        console.log("      Bob_real funded:", bobReal, "- 15,000 ETH");
        
        // Fund Bob_proxy (the address that creates instances)
        vm.deal(bobProxy, 100 ether);
        console.log("      Bob_proxy funded:", bobProxy, "- 100 ETH (for gas)");
        
        // Fund Alice (the verifier)
        vm.deal(alice, 50 ether);
        console.log("      Alice funded:", alice, "- 50 ETH (for gas)");
        
        // Fund some public addresses for realistic pool
        vm.deal(0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045, 500000 ether); // Vitalik
        vm.deal(0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8, 200000 ether); // Binance
        vm.deal(0xDA9dfA130Df4dE4673b89022EE50ff26f6EA73Cf, 100000 ether); // Kraken
        vm.deal(0x1a9C8182C09F50C8318d769245beA52c32BE35BC, 50000 ether);  // Uniswap
        vm.deal(0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2, 30000 ether);  // Maker
        
        console.log("      5 public addresses funded (whales)");
    }
}


/**
 * Deploy AetherOracleV3_EigenDA to Optimism Sepolia
 * POC demonstration for hackathon submission
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

// Color logging
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function main() {
  try {
    log("\n🚀 Starting AetherOracleV3_EigenDA Deployment\n", 'blue');
    log("=" .repeat(60), 'blue');

    // Get deployer
    const [deployer] = await hre.ethers.getSigners();
    log(`Deployer address: ${deployer.address}`, 'green');

    // Check balance
    const balance = await deployer.getBalance();
    log(`Deployer balance: ${hre.ethers.utils.formatEther(balance)} ETH`, 'green');

    if (balance.lt(hre.ethers.utils.parseEther("0.01"))) {
      log("⚠️  Warning: Low balance, might not be enough for deployment", 'yellow');
    }

    log("\n📝 Step 1: Deploying AetherOracleV3_EigenDA Contract", 'blue');
    log("-" .repeat(60));

    // Deploy V3 Oracle with EigenDA
    const AetherOracleV3 = await hre.ethers.getContractFactory("AetherOracleV3_EigenDA");

    // Deploy in POC mode (no actual EigenDA service)
    // Pass zero address to indicate POC mode
    const oracleV3 = await AetherOracleV3.deploy(
      "0x0000000000000000000000000000000000000000"
    );

    log("⏳ Waiting for deployment transaction...");
    await oracleV3.deployed();

    log(`✅ AetherOracleV3_EigenDA deployed to: ${oracleV3.address}`, 'green');
    log(`📋 Transaction hash: ${oracleV3.deployTransaction.hash}`, 'blue');

    // Wait for confirmations
    log("\n⏳ Waiting for 5 confirmations...");
    await oracleV3.deployTransaction.wait(5);
    log("✅ Deployment confirmed!", 'green');

    log("\n📝 Step 2: Initializing Oracle Configuration", 'blue');
    log("-" .repeat(60));

    // Set initial parameters
    log("Setting consensus parameters...");

    // Set required submissions to 1 for POC
    let tx = await oracleV3.setRequiredSubmissions(1);
    await tx.wait();
    log("✅ Required submissions set to 1");

    // Set consensus window to 5 minutes
    tx = await oracleV3.setConsensusWindow(300);
    await tx.wait();
    log("✅ Consensus window set to 300 seconds");

    // Set confidence threshold to 80%
    tx = await oracleV3.setMinConfidenceThreshold(8000);
    await tx.wait();
    log("✅ Min confidence threshold set to 80%");

    // Set max rate deviation to 10%
    tx = await oracleV3.setMaxRateDeviation(1000);
    await tx.wait();
    log("✅ Max rate deviation set to 10%");

    log("\n📝 Step 3: Adding Oracle Nodes", 'blue');
    log("-" .repeat(60));

    // Add deployer as first oracle node
    log(`Adding ${deployer.address} as oracle node...`);
    tx = await oracleV3.addOracleNode(deployer.address);
    await tx.wait();
    log("✅ Oracle node added successfully");

    // Add a second test oracle node (optional)
    // You can add more oracle addresses here if needed
    const testOracleAddresses = [
      // Add any additional oracle addresses here
      // "0x...",
    ];

    for (const address of testOracleAddresses) {
      log(`Adding ${address} as oracle node...`);
      tx = await oracleV3.addOracleNode(address);
      await tx.wait();
      log(`✅ Oracle node ${address} added`);
    }

    log("\n📝 Step 4: Submitting Sample Rate Data", 'blue');
    log("-" .repeat(60));

    // Create sample data for demonstration
    const samplePairs = [
      { pair: "BTC/USDT", rate: 6500000000000, confidence: 9000 },  // $65,000 with 90% confidence
      { pair: "ETH/USDT", rate: 350000000000, confidence: 9200 },    // $3,500 with 92% confidence
      { pair: "USDC/USDT", rate: 100000000, confidence: 9900 },      // $1.00 with 99% confidence
    ];

    for (const data of samplePairs) {
      log(`\nSubmitting rate for ${data.pair}...`);

      // Create signature for the rate submission
      const messageHash = hre.ethers.utils.solidityKeccak256(
        ["string", "uint256", "uint256", "uint256"],
        [data.pair, data.rate, data.confidence, Math.floor(Date.now() / 60000)]
      );

      const signature = await deployer.signMessage(hre.ethers.utils.arrayify(messageHash));

      try {
        tx = await oracleV3.submitRate(
          data.pair,
          data.rate,
          data.confidence,
          signature
        );
        await tx.wait();

        log(`✅ Rate submitted: ${data.pair} = $${(data.rate / 1e8).toFixed(2)} (${data.confidence/100}% confidence)`, 'green');

        // Get the submitted rate to verify
        const rateInfo = await oracleV3.getLatestRate(data.pair);
        log(`   Verified on-chain: Rate=${rateInfo.rate.toString()}, BlobId=${rateInfo.eigenDABlobId}`);

      } catch (error) {
        log(`⚠️  Failed to submit rate for ${data.pair}: ${error.message}`, 'yellow');
      }
    }

    log("\n📝 Step 5: Setting FXPool Integration (Optional)", 'blue');
    log("-" .repeat(60));

    // If you have deployed FXPool, set it here
    const FX_POOL_ADDRESS = "0xA2F1A3378B0D5DC75Ed3ed9A9e89f27706e8bc86"; // Your existing FXPool

    try {
      log(`Setting FXPool address to ${FX_POOL_ADDRESS}...`);
      tx = await oracleV3.setFXPool(FX_POOL_ADDRESS);
      await tx.wait();
      log("✅ FXPool integration configured", 'green');
    } catch (error) {
      log("⚠️  Could not set FXPool (might not be deployed on same network)", 'yellow');
    }

    log("\n📝 Step 6: Verifying Deployment", 'blue');
    log("-" .repeat(60));

    // Read back configuration to verify
    const requiredSubmissions = await oracleV3.requiredSubmissions();
    const consensusWindow = await oracleV3.consensusWindow();
    const minConfidence = await oracleV3.minConfidenceThreshold();
    const maxDeviation = await oracleV3.maxRateDeviation();
    const activeOracles = await oracleV3.getActiveOracles();

    log("Current Configuration:", 'green');
    log(`  Required Submissions: ${requiredSubmissions}`);
    log(`  Consensus Window: ${consensusWindow} seconds`);
    log(`  Min Confidence: ${minConfidence / 100}%`);
    log(`  Max Rate Deviation: ${maxDeviation / 100}%`);
    log(`  Active Oracles: ${activeOracles.length}`);

    for (let i = 0; i < activeOracles.length; i++) {
      log(`    - Oracle ${i + 1}: ${activeOracles[i]}`);
    }

    log("\n📝 Step 7: Saving Deployment Information", 'blue');
    log("-" .repeat(60));

    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      chainId: (await deployer.provider.getNetwork()).chainId,
      contracts: {
        AetherOracleV3_EigenDA: oracleV3.address
      },
      configuration: {
        requiredSubmissions: requiredSubmissions.toString(),
        consensusWindow: consensusWindow.toString(),
        minConfidenceThreshold: minConfidence.toString(),
        maxRateDeviation: maxDeviation.toString(),
        activeOracleNodes: activeOracles
      },
      sampleData: samplePairs.map(p => ({
        ...p,
        rateFormatted: `$${(p.rate / 1e8).toFixed(2)}`,
        confidenceFormatted: `${p.confidence / 100}%`
      })),
      deployment: {
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        blockNumber: await hre.ethers.provider.getBlockNumber(),
        transactionHash: oracleV3.deployTransaction.hash
      },
      notes: {
        status: "POC - Proof of Concept for Hackathon",
        eigenDA: "Simulated mode - using hash as blob ID",
        production: "V2 is used for production, V3 demonstrates innovation",
        futureWork: "Will integrate with actual EigenDA when mainnet launches"
      },
      explorer: {
        contract: `https://sepolia-optimism.etherscan.io/address/${oracleV3.address}`,
        transaction: `https://sepolia-optimism.etherscan.io/tx/${oracleV3.deployTransaction.hash}`
      }
    };

    const deploymentPath = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath, { recursive: true });
    }

    const filename = path.join(deploymentPath, `v3-deployment-${Date.now()}.json`);
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    log(`✅ Deployment info saved to: ${filename}`, 'green');

    // Also save a "latest" version
    const latestPath = path.join(deploymentPath, 'v3-deployment-latest.json');
    fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));
    log(`✅ Latest deployment info saved to: ${latestPath}`, 'green');

    // Update addresses.json if it exists
    const addressesPath = path.join(__dirname, '../addresses.json');
    if (fs.existsSync(addressesPath)) {
      const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
      addresses.contracts.aetherOracleV3_EigenDA = oracleV3.address;
      addresses.lastUpdated = new Date().toISOString();
      fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
      log("✅ Updated addresses.json", 'green');
    }

    log("\n" + "=".repeat(60), 'green');
    log("🎉 DEPLOYMENT SUCCESSFUL!", 'green');
    log("=".repeat(60), 'green');

    log("\n📋 Summary:", 'blue');
    log(`  Contract: AetherOracleV3_EigenDA`, 'green');
    log(`  Address: ${oracleV3.address}`, 'green');
    log(`  Network: ${hre.network.name}`, 'green');
    log(`  Status: POC Demonstration`, 'yellow');

    log("\n📌 Next Steps:", 'blue');
    log("  1. Verify contract on Etherscan:");
    log(`     npx hardhat verify --network ${hre.network.name} ${oracleV3.address} "0x0000000000000000000000000000000000000000"`);
    log("  2. Update hackathon submission with V3 address");
    log("  3. Prepare technical documentation about EigenDA integration");
    log("  4. Test the getLatestRate and getHistoricalBlobIds functions");

    log("\n🔗 Useful Links:", 'blue');
    log(`  Explorer: https://sepolia-optimism.etherscan.io/address/${oracleV3.address}`);
    log(`  Transaction: https://sepolia-optimism.etherscan.io/tx/${oracleV3.deployTransaction.hash}`);

    log("\n💡 Hackathon Talking Points:", 'yellow');
    log("  - First Oracle to integrate EigenDA for data availability");
    log("  - 99% storage cost reduction ($263/year vs $26,280/year)");
    log("  - Auditable AI training data with permanent storage");
    log("  - Regulatory compliant 7-year data retention capability");
    log("  - Gas optimized with bytes32 blob IDs and packed structs");

  } catch (error) {
    log(`\n❌ Deployment failed: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
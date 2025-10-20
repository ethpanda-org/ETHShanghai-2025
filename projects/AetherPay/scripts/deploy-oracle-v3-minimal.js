/**
 * Minimal deployment script for V3 Oracle (low gas version)
 * Skips sample data submission to reduce gas costs
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  try {
    console.log("\n🚀 Starting Minimal V3 Deployment (Low Gas)\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log("Deployer:", deployer.address);

    const balance = await deployer.getBalance();
    console.log("Balance:", hre.ethers.utils.formatEther(balance), "ETH");

    // Check minimum required
    const minRequired = hre.ethers.utils.parseEther("0.002");
    if (balance.lt(minRequired)) {
      console.log("\n⚠️  Insufficient balance!");
      console.log("Required: 0.002 ETH");
      console.log("Current: ", hre.ethers.utils.formatEther(balance), "ETH");
      console.log("\nPlease get test ETH from:");
      console.log("- https://www.alchemy.com/faucets/optimism-sepolia");
      console.log("- https://faucets.chain.link/optimism-sepolia");
      process.exit(1);
    }

    // Deploy with minimal gas settings
    console.log("\n📝 Deploying contract...");
    const AetherOracleV3 = await hre.ethers.getContractFactory("AetherOracleV3_EigenDA");

    // Deploy with gas limit
    const oracleV3 = await AetherOracleV3.deploy(
      "0x0000000000000000000000000000000000000000",
      {
        gasLimit: 5000000,
        gasPrice: hre.ethers.utils.parseUnits("0.1", "gwei") // Very low gas price
      }
    );

    console.log("⏳ Waiting for deployment...");
    await oracleV3.deployed();

    console.log("\n✅ Deployed to:", oracleV3.address);
    console.log("📋 Transaction:", oracleV3.deployTransaction.hash);

    // Wait for confirmations
    await oracleV3.deployTransaction.wait(2); // Only 2 confirmations

    // Minimal initialization - only add oracle node
    console.log("\n📝 Adding oracle node...");
    const tx = await oracleV3.addOracleNode(deployer.address, {
      gasLimit: 100000,
      gasPrice: hre.ethers.utils.parseUnits("0.1", "gwei")
    });
    await tx.wait();
    console.log("✅ Oracle node added");

    // Save deployment info
    const deploymentInfo = {
      network: hre.network.name,
      contract: oracleV3.address,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      txHash: oracleV3.deployTransaction.hash,
      explorer: `https://sepolia-optimism.etherscan.io/address/${oracleV3.address}`
    };

    const deployPath = path.join(__dirname, '../deployments');
    if (!fs.existsSync(deployPath)) {
      fs.mkdirSync(deployPath, { recursive: true });
    }

    fs.writeFileSync(
      path.join(deployPath, 'v3-minimal-deployment.json'),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n" + "=".repeat(60));
    console.log("✅ MINIMAL DEPLOYMENT SUCCESSFUL!");
    console.log("=".repeat(60));
    console.log("\n📋 Contract Address:", oracleV3.address);
    console.log("🔗 Explorer:", deploymentInfo.explorer);
    console.log("\n💡 Note: This is a minimal deployment for hackathon submission");
    console.log("No sample data was submitted to save gas");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
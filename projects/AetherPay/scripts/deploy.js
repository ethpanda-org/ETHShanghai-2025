const { ethers } = require("hardhat");

async function main() {
    console.log("Deploying AetherOracle contract...");
    
    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    
    // Get account balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH");
    
    // Deploy the contract
    const AetherOracle = await ethers.getContractFactory("AetherOracle");
    const oracle = await AetherOracle.deploy();
    
    await oracle.deployed();
    
    console.log("AetherOracle deployed to:", oracle.address);
    
    // Add the deployer as an oracle node
    console.log("Adding deployer as oracle node...");
    const tx = await oracle.addOracleNode(deployer.address);
    await tx.wait();
    console.log("Oracle node added successfully");
    
    // Set initial configuration
    console.log("Setting initial configuration...");
    
    // Set confidence threshold to 80%
    const setThresholdTx = await oracle.setMinConfidenceThreshold(8000);
    await setThresholdTx.wait();
    console.log("Confidence threshold set to 80%");
    
    // Set max rate deviation to 5%
    const setDeviationTx = await oracle.setMaxRateDeviation(500);
    await setDeviationTx.wait();
    console.log("Max rate deviation set to 5%");
    
    // Set update interval to 5 minutes
    const setIntervalTx = await oracle.setMinUpdateInterval(300);
    await setIntervalTx.wait();
    console.log("Update interval set to 5 minutes");
    
    // Verify deployment
    console.log("\nVerifying deployment...");
    const activeOracles = await oracle.getActiveOracles();
    console.log("Active oracles:", activeOracles);
    
    const oracleInfo = await oracle.getOracleInfo(deployer.address);
    console.log("Oracle info:", {
        isActive: oracleInfo[0],
        reputation: oracleInfo[1].toString(),
        totalUpdates: oracleInfo[2].toString(),
        successfulUpdates: oracleInfo[3].toString(),
        lastUpdateTime: oracleInfo[4].toString()
    });
    
    // Save deployment info
    const deploymentInfo = {
        contractAddress: oracle.address,
        deployerAddress: deployer.address,
        network: "sepolia",
        deployedAt: new Date().toISOString(),
        gasUsed: "estimated",
        blockNumber: await ethers.provider.getBlockNumber()
    };
    
    console.log("\n=== Deployment Summary ===");
    console.log(JSON.stringify(deploymentInfo, null, 2));
    
    console.log("\n=== Next Steps ===");
    console.log("1. Update config/.env with CONTRACT_ADDRESS=" + oracle.address);
    console.log("2. Update oracle/server.js with the new contract address");
    console.log("3. Start the oracle service: npm run dev");
    console.log("4. Test with: curl http://localhost:3000/health");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment failed:", error);
        process.exit(1);
    });
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
    console.log("🚀 Deploying AetherOracleV2...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH\n");

    try {
        // Deploy AetherOracleV2
        console.log("📝 Deploying AetherOracleV2...");
        const AetherOracleV2 = await ethers.getContractFactory("AetherOracleV2");
        const oracleV2 = await AetherOracleV2.deploy();

        await oracleV2.deployed();
        console.log("✅ AetherOracleV2 deployed to:", oracleV2.address);

        // Add deployer as first Oracle node
        console.log("\n📝 Adding deployer as Oracle node...");
        const addTx = await oracleV2.addOracleNode(deployer.address);
        await addTx.wait();
        console.log("✅ Oracle node added");

        // Set required submissions to 1 for testing
        console.log("\n📝 Setting required submissions to 1...");
        const setTx = await oracleV2.setRequiredSubmissions(1);
        await setTx.wait();
        console.log("✅ Required submissions set to 1");

        // Verify configuration
        console.log("\n📋 Verifying configuration:");
        const activeOracles = await oracleV2.getActiveOracles();
        const requiredSubmissions = await oracleV2.requiredSubmissions();
        const consensusWindow = await oracleV2.consensusWindow();

        console.log("  Active Oracles:", activeOracles.length);
        activeOracles.forEach((oracle, i) => {
            console.log(`    ${i + 1}. ${oracle}`);
        });
        console.log("  Required Submissions:", requiredSubmissions.toString());
        console.log("  Consensus Window:", consensusWindow.toString(), "seconds");

        // Save deployment info
        const deployment = {
            network: "op-sepolia",
            timestamp: new Date().toISOString(),
            contracts: {
                aetherOracleV2: oracleV2.address
            },
            configuration: {
                requiredSubmissions: requiredSubmissions.toString(),
                consensusWindow: consensusWindow.toString(),
                initialOracle: deployer.address
            },
            deployer: deployer.address
        };

        fs.writeFileSync(
            './deployments/oracle-v2-deployment.json',
            JSON.stringify(deployment, null, 2)
        );

        console.log("\n✅ Deployment completed successfully!");
        console.log("\n📋 Summary:");
        console.log("- AetherOracleV2:", oracleV2.address);
        console.log("- Initial Oracle:", deployer.address);
        console.log("- Required Submissions: 1");

        console.log("\n🎯 Next steps:");
        console.log("1. Update config/.env with AETHER_ORACLE_V2=" + oracleV2.address);
        console.log("2. Update config/.env with CONTRACT_ADDRESS=" + oracleV2.address);
        console.log("3. Start Oracle server: npm start");
        console.log("4. Monitor rate updates on-chain");

        console.log("\n🔗 View on Explorer:");
        console.log("https://sepolia-optimistic.etherscan.io/address/" + oracleV2.address);

    } catch (error) {
        console.error("\n❌ Deployment failed:", error);
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
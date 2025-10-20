const { ethers } = require("hardhat");

async function main() {
    console.log("🔧 Registering Oracle Node to AetherOracleV2...\n");

    const [deployer] = await ethers.getSigners();
    console.log("Deployer address:", deployer.address);

    // AetherOracleV2 address
    const ORACLE_V2_ADDRESS = "0x44E5572DcF2CA78Ecd5561AA87904D2c2d2cE5Be";

    // Get contract instance
    const oracleV2 = await ethers.getContractAt("AetherOracleV2", ORACLE_V2_ADDRESS);

    try {
        // 1. Check current active oracles
        console.log("📋 Checking current Oracle nodes...");
        const activeOracles = await oracleV2.getActiveOracles();
        console.log("Active oracles:", activeOracles);

        // 2. Check if deployer is already registered
        const nodeInfo = await oracleV2.oracleNodes(deployer.address);
        console.log("\nDeployer node status:");
        console.log("  Address:", deployer.address);
        console.log("  Is Active:", nodeInfo.isActive);
        console.log("  Reputation:", nodeInfo.reputation.toString());

        // 3. Register node if not active
        if (!nodeInfo.isActive) {
            console.log("\n📝 Registering deployer as Oracle node...");
            const addTx = await oracleV2.addOracleNode(deployer.address);
            await addTx.wait();
            console.log("✅ Oracle node registered:", addTx.hash);
        } else {
            console.log("\n✅ Deployer is already registered as Oracle node");
        }

        // 4. Check current consensus configuration
        console.log("\n📋 Consensus Configuration:");
        const requiredSubmissions = await oracleV2.requiredSubmissions();
        const consensusWindow = await oracleV2.consensusWindow();
        const minConfidenceThreshold = await oracleV2.minConfidenceThreshold();

        console.log("  Required Submissions:", requiredSubmissions.toString());
        console.log("  Consensus Window:", consensusWindow.toString(), "seconds");
        console.log("  Min Confidence:", minConfidenceThreshold.toString(), "basis points");

        // 5. For testing, lower required submissions to 1 if needed
        if (requiredSubmissions.toNumber() > 1 && activeOracles.length < 3) {
            console.log("\n⚠️  Warning: Only", activeOracles.length, "oracle(s) but requires", requiredSubmissions.toString(), "submissions");
            console.log("📝 Lowering required submissions to 1 for testing...");

            const setTx = await oracleV2.setRequiredSubmissions(1);
            await setTx.wait();
            console.log("✅ Required submissions set to 1:", setTx.hash);
        }

        // 6. Final verification
        console.log("\n📋 Final Oracle Configuration:");
        const finalOracles = await oracleV2.getActiveOracles();
        const finalRequired = await oracleV2.requiredSubmissions();

        console.log("  Active Oracles:", finalOracles.length);
        finalOracles.forEach((oracle, i) => {
            console.log(`    ${i + 1}. ${oracle}`);
        });
        console.log("  Required Submissions:", finalRequired.toString());

        // 7. Test rate query
        console.log("\n🔍 Testing rate query...");
        try {
            const rate = await oracleV2.getLatestRate("BTC/USDT");
            console.log("  BTC/USDT rate:", rate.rate.toString());
            console.log("  Confidence:", rate.confidence.toString());
            console.log("  Timestamp:", new Date(rate.timestamp.toNumber() * 1000).toISOString());
            console.log("  Is Valid:", rate.isValid);
        } catch (error) {
            console.log("  No rate available yet (expected for fresh deployment)");
        }

        console.log("\n✅ Oracle node registration completed!");
        console.log("\n🎯 Next steps:");
        console.log("1. Start Oracle server: npm start");
        console.log("2. Monitor logs: tail -f oracle.log");
        console.log("3. Verify rate updates on-chain");

    } catch (error) {
        console.error("\n❌ Error:", error.message);
        if (error.error) {
            console.error("Details:", error.error);
        }
        process.exit(1);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
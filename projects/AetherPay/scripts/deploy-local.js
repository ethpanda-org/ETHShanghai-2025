const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("===========================================");
    console.log("🚀 Deploying Contracts to Local Network");
    console.log("===========================================\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Contract addresses storage
    const deployedContracts = {};

    try {
        // ============ 1. Deploy AetherOracleV2 ============
        console.log("1️⃣ Deploying AetherOracleV2...");
        const AetherOracleV2 = await ethers.getContractFactory("AetherOracleV2");
        const oracle = await AetherOracleV2.deploy();
        await oracle.deployed();
        deployedContracts.AETHER_ORACLE_V2_ADDRESS = oracle.address;
        console.log("✅ AetherOracleV2 deployed to:", oracle.address);

        // Configure Oracle
        console.log("   Configuring oracle...");
        const tx1 = await oracle.addOracleNode(deployer.address);
        await tx1.wait();
        console.log("   ✓ Oracle node added");

        // ============ 2. Deploy Mock Tokens (for testing) ============
        console.log("\n2️⃣ Deploying Mock Tokens...");

        // Deploy Mock USDC
        const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
        // If MockERC20 doesn't exist, we'll skip this step
        let USDC_ADDRESS = "0x0000000000000000000000000000000000000001";
        let USDT_ADDRESS = "0x0000000000000000000000000000000000000002";

        console.log("   Using mock token addresses for testing");
        deployedContracts.USDC_ADDRESS = USDC_ADDRESS;
        deployedContracts.USDT_ADDRESS = USDT_ADDRESS;

        // ============ 3. Deploy PublicGoodsFund ============
        console.log("\n3️⃣ Deploying PublicGoodsFund...");
        const PublicGoodsFund = await ethers.getContractFactory("PublicGoodsFund");
        const publicGoodsFund = await PublicGoodsFund.deploy();
        await publicGoodsFund.deployed();
        deployedContracts.PUBLIC_GOODS_FUND_ADDRESS = publicGoodsFund.address;
        console.log("✅ PublicGoodsFund deployed to:", publicGoodsFund.address);

        // ============ 4. Deploy FXPool ============
        console.log("\n4️⃣ Deploying FXPool...");
        const FXPool = await ethers.getContractFactory("FXPool");
        const fxPool = await FXPool.deploy(
            oracle.address,
            deployer.address, // Treasury
            publicGoodsFund.address // Donation address
        );
        await fxPool.deployed();
        deployedContracts.FX_POOL_ADDRESS = fxPool.address;
        console.log("✅ FXPool deployed to:", fxPool.address);

        // ============ 5. Deploy FXRouter ============
        console.log("\n5️⃣ Deploying FXRouter...");
        const FXRouter = await ethers.getContractFactory("FXRouter");
        const fxRouter = await FXRouter.deploy();
        await fxRouter.deployed();
        deployedContracts.FX_ROUTER_ADDRESS = fxRouter.address;
        console.log("✅ FXRouter deployed to:", fxRouter.address);

        // ============ 6. Deploy FXPoolFactory ============
        console.log("\n6️⃣ Deploying FXPoolFactory...");
        const FXPoolFactory = await ethers.getContractFactory("FXPoolFactory");
        const fxPoolFactory = await FXPoolFactory.deploy();
        await fxPoolFactory.deployed();
        deployedContracts.FX_FACTORY_ADDRESS = fxPoolFactory.address;
        console.log("✅ FXPoolFactory deployed to:", fxPoolFactory.address);

        // ============ 7. Deploy PaymentGatewayV2 ============
        console.log("\n7️⃣ Deploying PaymentGatewayV2...");
        const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
        const paymentGateway = await PaymentGatewayV2.deploy(
            fxRouter.address,
            deployer.address, // Treasury
            publicGoodsFund.address // Donation address
        );
        await paymentGateway.deployed();
        deployedContracts.PAYMENT_GATEWAY_V2_ADDRESS = paymentGateway.address;
        console.log("✅ PaymentGatewayV2 deployed to:", paymentGateway.address);

        // ============ 8. Save deployment addresses ============
        console.log("\n8️⃣ Saving deployment addresses...");

        // Save to deployment file
        const deploymentInfo = {
            network: "localhost",
            deployedAt: new Date().toISOString(),
            deployerAddress: deployer.address,
            contracts: deployedContracts,
            notes: "Local deployment for testing"
        };

        const deploymentsPath = path.join(__dirname, "../deployments");
        if (!fs.existsSync(deploymentsPath)) {
            fs.mkdirSync(deploymentsPath);
        }

        const filename = `deployment-local-${Date.now()}.json`;
        fs.writeFileSync(
            path.join(deploymentsPath, filename),
            JSON.stringify(deploymentInfo, null, 2)
        );
        console.log(`✅ Saved to deployments/${filename}`);

        // Update .env.local for testing
        const envLocalPath = path.join(__dirname, "../.env.local");
        const envContent = `# Local Deployment - ${new Date().toISOString()}
# Contract Addresses
AETHER_ORACLE_V2_ADDRESS=${oracle.address}
PUBLIC_GOODS_FUND_ADDRESS=${publicGoodsFund.address}
FX_POOL_ADDRESS=${fxPool.address}
FX_ROUTER_ADDRESS=${fxRouter.address}
FX_FACTORY_ADDRESS=${fxPoolFactory.address}
PAYMENT_GATEWAY_V2_ADDRESS=${paymentGateway.address}

# Mock Tokens
USDC_ADDRESS=${USDC_ADDRESS}
USDT_ADDRESS=${USDT_ADDRESS}

# Network
NETWORK=localhost
RPC_URL=http://127.0.0.1:8545
`;
        fs.writeFileSync(envLocalPath, envContent);
        console.log("✅ Created .env.local for testing");

        // ============ 9. Display summary ============
        console.log("\n===========================================");
        console.log("🎉 LOCAL DEPLOYMENT COMPLETE!");
        console.log("===========================================\n");

        console.log("📋 Contract Addresses:");
        Object.entries(deployedContracts).forEach(([name, address]) => {
            console.log(`   ${name}: ${address}`);
        });

        console.log("\n📝 Next Steps:");
        console.log("   1. These addresses are for local testing only");
        console.log("   2. To deploy to testnet, fix the RPC connection");
        console.log("   3. Check Optimism Sepolia status: https://status.optimism.io");
        console.log("   4. Alternative: Deploy to Base Sepolia instead");

    } catch (error) {
        console.error("\n❌ Deployment failed:", error.message);
        throw error;
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Deployment error:", error);
        process.exit(1);
    });
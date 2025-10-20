const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("===========================================");
    console.log("🚀 Deploying All AetherPay Contracts");
    console.log("===========================================\n");

    // Get deployer account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Get account balance
    const balance = await deployer.getBalance();
    console.log("Account balance:", ethers.utils.formatEther(balance), "ETH\n");

    // Contract addresses storage
    const deployedContracts = {};

    // ============ 1. Deploy AetherOracleV2 ============
    console.log("1️⃣ Deploying AetherOracleV2...");
    const AetherOracleV2 = await ethers.getContractFactory("AetherOracleV2");
    const oracle = await AetherOracleV2.deploy();
    await oracle.deployed();
    deployedContracts.AETHER_ORACLE_V2_ADDRESS = oracle.address;
    console.log("✅ AetherOracleV2 deployed to:", oracle.address);

    // Configure Oracle
    await oracle.addOracleNode(deployer.address);
    await oracle.setMinConfidenceThreshold(8000); // 80%
    await oracle.setMaxRateDeviation(500); // 5%
    console.log("   Oracle configured successfully\n");

    // ============ 2. Deploy PublicGoodsFund ============
    console.log("2️⃣ Deploying PublicGoodsFund...");
    const PublicGoodsFund = await ethers.getContractFactory("PublicGoodsFund");
    const publicGoodsFund = await PublicGoodsFund.deploy();
    await publicGoodsFund.deployed();
    deployedContracts.PUBLIC_GOODS_FUND_ADDRESS = publicGoodsFund.address;
    console.log("✅ PublicGoodsFund deployed to:", publicGoodsFund.address);

    // ============ 3. Deploy FXPool ============
    console.log("3️⃣ Deploying FXPool...");
    const FXPool = await ethers.getContractFactory("FXPool");
    const fxPool = await FXPool.deploy(
        oracle.address, // Use deployed oracle
        deployer.address, // Treasury
        publicGoodsFund.address // Donation address
    );
    await fxPool.deployed();
    deployedContracts.FX_POOL_ADDRESS = fxPool.address;
    console.log("✅ FXPool deployed to:", fxPool.address);

    // ============ 4. Deploy FXRouter ============
    console.log("4️⃣ Deploying FXRouter...");
    const FXRouter = await ethers.getContractFactory("FXRouter");
    const fxRouter = await FXRouter.deploy();
    await fxRouter.deployed();
    deployedContracts.FX_ROUTER_ADDRESS = fxRouter.address;
    console.log("✅ FXRouter deployed to:", fxRouter.address);

    // Register pool in router
    await fxRouter.registerPool("USDC/USDT", fxPool.address);
    console.log("   Pool registered in router\n");

    // ============ 5. Deploy FXPoolFactory ============
    console.log("5️⃣ Deploying FXPoolFactory...");
    const FXPoolFactory = await ethers.getContractFactory("FXPoolFactory");
    const fxPoolFactory = await FXPoolFactory.deploy();
    await fxPoolFactory.deployed();
    deployedContracts.FX_FACTORY_ADDRESS = fxPoolFactory.address;
    console.log("✅ FXPoolFactory deployed to:", fxPoolFactory.address);

    // ============ 6. Deploy PaymentGatewayV2 ============
    console.log("6️⃣ Deploying PaymentGatewayV2...");
    const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
    const paymentGateway = await PaymentGatewayV2.deploy(
        fxRouter.address,
        deployer.address, // Treasury
        publicGoodsFund.address // Donation address
    );
    await paymentGateway.deployed();
    deployedContracts.PAYMENT_GATEWAY_V2_ADDRESS = paymentGateway.address;
    console.log("✅ PaymentGatewayV2 deployed to:", paymentGateway.address);

    // ============ 7. Configure cross-contract permissions ============
    console.log("\n7️⃣ Configuring cross-contract permissions...");

    // Set FXPool in Oracle
    await oracle.setFXPool(fxPool.address);
    console.log("   Oracle -> FXPool connected");

    // Add supported tokens in FXPool
    const USDC = "0x1234567890123456789012345678901234567890"; // Mock address for testing
    const USDT = "0x2234567890123456789012345678901234567890"; // Mock address for testing

    // You would use real token addresses in production
    // await fxPool.addSupportedToken(USDC);
    // await fxPool.addSupportedToken(USDT);
    // console.log("   Supported tokens added");

    // Add supported tokens in PaymentGateway
    // await paymentGateway.addSupportedToken(USDC);
    // await paymentGateway.addSupportedToken(USDT);
    // console.log("   Payment gateway tokens configured");

    // ============ 8. Save deployment addresses ============
    console.log("\n8️⃣ Saving deployment addresses...");

    // Update .env file
    const envPath = path.join(__dirname, "../config/.env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Update contract addresses in .env
    envContent = envContent.replace(/AETHER_ORACLE_V2=.*/g, `AETHER_ORACLE_V2=${oracle.address}`);
    envContent = envContent.replace(/FX_POOL_ADDRESS=.*/g, `FX_POOL_ADDRESS=${fxPool.address}`);
    envContent = envContent.replace(/FX_ROUTER_ADDRESS=.*/g, `FX_ROUTER_ADDRESS=${fxRouter.address}`);
    envContent = envContent.replace(/FX_FACTORY_ADDRESS=.*/g, `FX_FACTORY_ADDRESS=${fxPoolFactory.address}`);
    envContent = envContent.replace(/PAYMENT_GATEWAY_ADDRESS=.*/g, `PAYMENT_GATEWAY_ADDRESS=${paymentGateway.address}`);

    // Add new addresses if not exist
    if (!envContent.includes("PUBLIC_GOODS_FUND_ADDRESS")) {
        envContent += `\nPUBLIC_GOODS_FUND_ADDRESS=${publicGoodsFund.address}`;
    } else {
        envContent = envContent.replace(/PUBLIC_GOODS_FUND_ADDRESS=.*/g, `PUBLIC_GOODS_FUND_ADDRESS=${publicGoodsFund.address}`);
    }

    if (!envContent.includes("PAYMENT_GATEWAY_V2_ADDRESS")) {
        envContent += `\nPAYMENT_GATEWAY_V2_ADDRESS=${paymentGateway.address}`;
    } else {
        envContent = envContent.replace(/PAYMENT_GATEWAY_V2_ADDRESS=.*/g, `PAYMENT_GATEWAY_V2_ADDRESS=${paymentGateway.address}`);
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated config/.env");

    // Save to deployment file
    const deploymentInfo = {
        network: "optimism-sepolia",
        deployedAt: new Date().toISOString(),
        deployerAddress: deployer.address,
        contracts: deployedContracts,
        blockNumber: await ethers.provider.getBlockNumber()
    };

    const deploymentsPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsPath)) {
        fs.mkdirSync(deploymentsPath);
    }

    fs.writeFileSync(
        path.join(deploymentsPath, `deployment-${Date.now()}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    // ============ 9. Update frontend config ============
    console.log("\n9️⃣ Updating frontend configuration...");

    const frontendConfigPath = path.join(__dirname, "../frontend/src/config/contracts.ts");
    const frontendConfig = `// Auto-generated contract addresses - ${new Date().toISOString()}
export const contractAddresses = {
  aetherOracleV2: "${oracle.address}",
  fxPool: "${fxPool.address}",
  fxRouter: "${fxRouter.address}",
  fxPoolFactory: "${fxPoolFactory.address}",
  paymentGatewayV2: "${paymentGateway.address}",
  publicGoodsFund: "${publicGoodsFund.address}",
} as const;

export const networkConfig = {
  chainId: 11155420, // Optimism Sepolia
  chainName: "Optimism Sepolia",
  rpcUrl: "https://sepolia.optimism.io",
  explorerUrl: "https://sepolia-optimism.etherscan.io",
  nativeCurrency: {
    name: "ETH",
    symbol: "ETH",
    decimals: 18
  }
} as const;
`;

    fs.writeFileSync(frontendConfigPath, frontendConfig);
    console.log("✅ Updated frontend/src/config/contracts.ts");

    // Update frontend .env.local
    const frontendEnvPath = path.join(__dirname, "../frontend/.env.local");
    const frontendEnv = `# Contract Addresses - Updated ${new Date().toISOString()}
NEXT_PUBLIC_AETHER_ORACLE_V2=${oracle.address}
NEXT_PUBLIC_FX_POOL=${fxPool.address}
NEXT_PUBLIC_FX_ROUTER=${fxRouter.address}
NEXT_PUBLIC_FX_FACTORY=${fxPoolFactory.address}
NEXT_PUBLIC_PAYMENT_GATEWAY_V2=${paymentGateway.address}
NEXT_PUBLIC_PUBLIC_GOODS_FUND=${publicGoodsFund.address}

# Network Configuration
NEXT_PUBLIC_CHAIN_ID=11155420
NEXT_PUBLIC_RPC_URL=https://sepolia.optimism.io
NEXT_PUBLIC_EXPLORER_URL=https://sepolia-optimism.etherscan.io

# API Endpoints
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
`;

    fs.writeFileSync(frontendEnvPath, frontendEnv);
    console.log("✅ Updated frontend/.env.local");

    // ============ 10. Display summary ============
    console.log("\n===========================================");
    console.log("🎉 DEPLOYMENT COMPLETE!");
    console.log("===========================================\n");

    console.log("📋 Contract Addresses:");
    console.log("   AetherOracleV2:", oracle.address);
    console.log("   PublicGoodsFund:", publicGoodsFund.address);
    console.log("   FXPool:", fxPool.address);
    console.log("   FXRouter:", fxRouter.address);
    console.log("   FXPoolFactory:", fxPoolFactory.address);
    console.log("   PaymentGatewayV2:", paymentGateway.address);

    console.log("\n📝 Next Steps:");
    console.log("   1. Verify contracts on Etherscan (optional)");
    console.log("   2. Add real stablecoin addresses");
    console.log("   3. Configure initial liquidity pools");
    console.log("   4. Start oracle service: cd oracle && npm run dev");
    console.log("   5. Start frontend: cd frontend && npm run dev");

    console.log("\n✨ All configuration files have been updated automatically!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
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

    // Contract addresses storage - INCLUDING ALREADY DEPLOYED
    const deployedContracts = {
        // Already deployed contracts from previous run
        AETHER_ORACLE_V2_ADDRESS: "0x1D323b80710c1d0c833B920CB7Ace09c49e237d7",
        PUBLIC_GOODS_FUND_ADDRESS: "0xCc9b8861CB2e42A043376433A73F2f019A7B2e1B",
        FX_POOL_ADDRESS: "0x924aCF266a8404B2E8e4890Abf05020E0D03F8Ae",
        FX_ROUTER_ADDRESS: "0x81C8F2AdD03187A17F8998541e27E2dD7566c504"
    };

    // Use already deployed contracts
    const oracleAddress = deployedContracts.AETHER_ORACLE_V2_ADDRESS;
    const publicGoodsFundAddress = deployedContracts.PUBLIC_GOODS_FUND_ADDRESS;
    const fxPoolAddress = deployedContracts.FX_POOL_ADDRESS;
    const fxRouterAddress = deployedContracts.FX_ROUTER_ADDRESS;

    console.log("📋 Using already deployed contracts:");
    console.log("   AetherOracleV2:", oracleAddress);
    console.log("   PublicGoodsFund:", publicGoodsFundAddress);
    console.log("   FXPool:", fxPoolAddress);
    console.log("   FXRouter:", fxRouterAddress);
    console.log("");

    // ============ 5. Deploy FXPoolFactory (WITH CORRECT PARAMETERS) ============
    console.log("5️⃣ Deploying FXPoolFactory...");
    const FXPoolFactory = await ethers.getContractFactory("FXPoolFactory");
    const fxPoolFactory = await FXPoolFactory.deploy(
        oracleAddress,           // _aetherOracle
        deployer.address,        // _protocolTreasury
        publicGoodsFundAddress   // _donationAddress
    );
    await fxPoolFactory.deployed();
    deployedContracts.FX_FACTORY_ADDRESS = fxPoolFactory.address;
    console.log("✅ FXPoolFactory deployed to:", fxPoolFactory.address);

    // ============ 6. Deploy PaymentGatewayV2 ============
    console.log("\n6️⃣ Deploying PaymentGatewayV2...");
    const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
    const paymentGateway = await PaymentGatewayV2.deploy(
        fxRouterAddress,
        deployer.address,        // Treasury
        publicGoodsFundAddress   // Donation address
    );
    await paymentGateway.deployed();
    deployedContracts.PAYMENT_GATEWAY_V2_ADDRESS = paymentGateway.address;
    console.log("✅ PaymentGatewayV2 deployed to:", paymentGateway.address);

    // ============ 7. Add Mock Supported Tokens ============
    console.log("\n7️⃣ Adding supported tokens...");

    // Mock USDC and USDT addresses for testing
    const USDC = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607"; // USDC on Optimism
    const USDT = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"; // USDT on Optimism

    // Add to PaymentGateway
    try {
        const tx1 = await paymentGateway.addSupportedToken(USDC);
        await tx1.wait();
        console.log("   ✓ USDC added to PaymentGateway");

        const tx2 = await paymentGateway.addSupportedToken(USDT);
        await tx2.wait();
        console.log("   ✓ USDT added to PaymentGateway");
    } catch (e) {
        console.log("   ⚠️ Could not add tokens (might not exist on testnet)");
    }

    // ============ 8. Save deployment addresses ============
    console.log("\n8️⃣ Saving deployment addresses...");

    // Update .env file
    const envPath = path.join(__dirname, "../config/.env");
    let envContent = fs.readFileSync(envPath, "utf8");

    // Update all contract addresses in .env
    envContent = envContent.replace(/AETHER_ORACLE_V2=.*/g, `AETHER_ORACLE_V2=${oracleAddress}`);
    envContent = envContent.replace(/FX_POOL_ADDRESS=.*/g, `FX_POOL_ADDRESS=${fxPoolAddress}`);
    envContent = envContent.replace(/FX_ROUTER_ADDRESS=.*/g, `FX_ROUTER_ADDRESS=${fxRouterAddress}`);
    envContent = envContent.replace(/FX_FACTORY_ADDRESS=.*/g, `FX_FACTORY_ADDRESS=${fxPoolFactory.address}`);
    envContent = envContent.replace(/PAYMENT_GATEWAY_ADDRESS=.*/g, `PAYMENT_GATEWAY_ADDRESS=${paymentGateway.address}`);

    // Add new addresses
    if (!envContent.includes("PUBLIC_GOODS_FUND_ADDRESS")) {
        envContent += `\nPUBLIC_GOODS_FUND_ADDRESS=${publicGoodsFundAddress}`;
    } else {
        envContent = envContent.replace(/PUBLIC_GOODS_FUND_ADDRESS=.*/g, `PUBLIC_GOODS_FUND_ADDRESS=${publicGoodsFundAddress}`);
    }

    if (!envContent.includes("PAYMENT_GATEWAY_V2_ADDRESS")) {
        envContent += `\nPAYMENT_GATEWAY_V2_ADDRESS=${paymentGateway.address}`;
    } else {
        envContent = envContent.replace(/PAYMENT_GATEWAY_V2_ADDRESS=.*/g, `PAYMENT_GATEWAY_V2_ADDRESS=${paymentGateway.address}`);
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ Updated config/.env");

    // Save deployment info
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

    const deploymentFile = path.join(deploymentsPath, `deployment-${Date.now()}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("✅ Saved deployment info");

    // ============ 9. Update frontend config ============
    console.log("\n9️⃣ Updating frontend configuration...");

    const frontendConfigPath = path.join(__dirname, "../frontend/src/config/contracts.ts");
    const frontendConfig = `// Auto-generated contract addresses - ${new Date().toISOString()}
export const contractAddresses = {
  aetherOracleV2: "${oracleAddress}",
  fxPool: "${fxPoolAddress}",
  fxRouter: "${fxRouterAddress}",
  fxPoolFactory: "${fxPoolFactory.address}",
  paymentGatewayV2: "${paymentGateway.address}",
  publicGoodsFund: "${publicGoodsFundAddress}",
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
NEXT_PUBLIC_AETHER_ORACLE_V2=${oracleAddress}
NEXT_PUBLIC_FX_POOL=${fxPoolAddress}
NEXT_PUBLIC_FX_ROUTER=${fxRouterAddress}
NEXT_PUBLIC_FX_FACTORY=${fxPoolFactory.address}
NEXT_PUBLIC_PAYMENT_GATEWAY_V2=${paymentGateway.address}
NEXT_PUBLIC_PUBLIC_GOODS_FUND=${publicGoodsFundAddress}

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

    console.log("📋 All Contract Addresses:");
    console.log("   AetherOracleV2:", oracleAddress);
    console.log("   PublicGoodsFund:", publicGoodsFundAddress);
    console.log("   FXPool:", fxPoolAddress);
    console.log("   FXRouter:", fxRouterAddress);
    console.log("   FXPoolFactory:", fxPoolFactory.address);
    console.log("   PaymentGatewayV2:", paymentGateway.address);

    console.log("\n🔗 View on Explorer:");
    console.log(`   https://sepolia-optimism.etherscan.io/address/${paymentGateway.address}`);

    console.log("\n📝 Next Steps:");
    console.log("   1. Verify contracts on Etherscan (optional)");
    console.log("   2. Test the contracts with scripts/test-deployment.js");
    console.log("   3. Start the frontend: cd frontend && npm run dev");
    console.log("   4. Check the deployment at http://localhost:3000");

    console.log("\n✨ All configuration files have been updated!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
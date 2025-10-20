/**
 * Deploy FXPool V2 with PublicGoodsFund Integration
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// Load addresses from centralized addresses.json
let CONTRACTS = {};
try {
  const addrPath = path.join(__dirname, '../addresses.json');
  const ADDR = JSON.parse(fs.readFileSync(addrPath, 'utf8'));
  const c = ADDR.contracts || ADDR;
  const t = ADDR.tokens || {};
  CONTRACTS = {
    AETHER_ORACLE_V2: c.aetherOracleV2 || c.AetherOracleV2,
    PUBLIC_GOODS_FUND: c.publicGoodsFund || c.PublicGoodsFund || c.PublicGoodsFundV2,
    MOCK_USDC: t.USDC || t.MockUSDC,
    MOCK_USDT: t.USDT || t.MockUSDT,
  };
  console.log('🗺️ Loaded addresses from addresses.json');
} catch (e) {
  console.warn('⚠️ Failed to load addresses.json, falling back to hardcoded addresses');
  CONTRACTS = {
    AETHER_ORACLE_V2: '0x6a0c9aA2B04BA45Dd348a86Ae3ebE81EE89df106',
    PUBLIC_GOODS_FUND: '0x0C50DB765fa4b25D960D2CCa7556135909A742C1',
    MOCK_USDC: '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3',
    MOCK_USDT: '0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C',
  };
}

async function main() {
  console.log("\n🚀 Deploying FXPool V2 with PublicGoodsFund Integration\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.getBalance();
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  try {
    // ============================================
    // Step 1: Deploy FXPool
    // ============================================
    console.log("📌 Step 1: Deploying FXPool Contract");
    console.log("-".repeat(60));

    const FXPool = await hre.ethers.getContractFactory("FXPool");

    console.log("Deploying with parameters:");
    console.log(`- Oracle: ${CONTRACTS.AETHER_ORACLE_V2}`);
    console.log(`- Treasury: ${deployer.address}`);
    console.log(`- Donation: ${CONTRACTS.PUBLIC_GOODS_FUND}`);

    const fxPool = await FXPool.deploy(
      CONTRACTS.AETHER_ORACLE_V2,
      deployer.address,  // Protocol treasury
      CONTRACTS.PUBLIC_GOODS_FUND  // Donation address
    );

    console.log(`Transaction hash: ${fxPool.deployTransaction.hash}`);
    console.log("Waiting for confirmation...");

    await fxPool.deployed();

    console.log(`✅ FXPool deployed to: ${fxPool.address}`);
    console.log();

    // ============================================
    // Step 2: Set PublicGoodsFund Address
    // ============================================
    console.log("📌 Step 2: Configuring PublicGoodsFund Integration");
    console.log("-".repeat(60));

    console.log(`Setting PublicGoodsFund: ${CONTRACTS.PUBLIC_GOODS_FUND}`);
    const setTx = await fxPool.setPublicGoodsFund(CONTRACTS.PUBLIC_GOODS_FUND);
    await setTx.wait();
    console.log("✅ PublicGoodsFund configured");
    console.log();

    // ============================================
    // Step 3: Add Supported Tokens
    // ============================================
    console.log("📌 Step 3: Adding Supported Tokens");
    console.log("-".repeat(60));

    const tokens = [
      { name: 'USDC', address: CONTRACTS.MOCK_USDC },
      { name: 'USDT', address: CONTRACTS.MOCK_USDT }
    ];

    for (const token of tokens) {
      console.log(`Adding ${token.name}: ${token.address}`);
      const addTx = await fxPool.addSupportedToken(token.address);
      await addTx.wait();
      console.log(`✅ ${token.name} added`);
    }
    console.log();

    // ============================================
    // Step 3.5: Initialize USDC/USDT Pool ✅ 新增
    // ============================================
    console.log("📌 Step 3.5: Initializing USDC/USDT Pool");
    console.log("-".repeat(60));

    const baseFee = 30; // 0.3% base fee
    console.log(`Creating pool "USDC/USDT" with ${baseFee} basis points fee`);
    const createPoolTx = await fxPool.createPool("USDC/USDT", baseFee);
    await createPoolTx.wait();
    console.log("✅ Pool initialized");
    console.log();

    // ============================================
    // Step 4: Deploy FXRouter
    // ============================================
    console.log("📌 Step 4: Deploying FXRouter");
    console.log("-".repeat(60));

    const FXRouter = await hre.ethers.getContractFactory("FXRouter");
    const router = await FXRouter.deploy();
    await router.deployed();

    console.log(`✅ FXRouter deployed to: ${router.address}`);
    console.log();

    // Register pool in router
    console.log("Registering USDC/USDT pool in router...");
    const registerTx = await router.registerPool("USDC/USDT", fxPool.address);
    await registerTx.wait();
    console.log("✅ Pool registered in router");
    console.log();

    // ============================================
    // Step 5: Verify Configuration
    // ============================================
    console.log("📌 Step 5: Verifying Configuration");
    console.log("-".repeat(60));

    const pgfAddress = await fxPool.publicGoodsFundAddress();
    const oracleAddress = await fxPool.aetherOracle();
    const isUSDCSupported = await fxPool.supportedTokens(CONTRACTS.MOCK_USDC);
    const isUSDTSupported = await fxPool.supportedTokens(CONTRACTS.MOCK_USDT);

    console.log(`PublicGoodsFund: ${pgfAddress}`);
    console.log(`Oracle: ${oracleAddress}`);
    console.log(`USDC Supported: ${isUSDCSupported}`);
    console.log(`USDT Supported: ${isUSDTSupported}`);

    if (pgfAddress.toLowerCase() !== CONTRACTS.PUBLIC_GOODS_FUND.toLowerCase()) {
      throw new Error("PublicGoodsFund address mismatch!");
    }

    console.log("✅ All configurations verified");
    console.log();

    // ============================================
    // Step 6: Save Deployment Info
    // ============================================
    console.log("📌 Step 6: Saving Deployment Information");
    console.log("-".repeat(60));

    const deployment = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        FXPool: fxPool.address,
        FXRouter: router.address,
        AetherOracleV2: CONTRACTS.AETHER_ORACLE_V2,
        PublicGoodsFund: CONTRACTS.PUBLIC_GOODS_FUND,
      },
      tokens: {
        USDC: CONTRACTS.MOCK_USDC,
        USDT: CONTRACTS.MOCK_USDT,
      },
      pools: {
        'USDC/USDT': {
          fee: 30,
          active: true
        }
      },
      configuration: {
        publicGoodsFundConfigured: true,
        tokensAdded: true,
        poolsInitialized: true,
        routerDeployed: true
      }
    };

    const deploymentPath = path.join(__dirname, '../deployments/fxpool-v2-deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

    console.log(`✅ Deployment info saved to: ${deploymentPath}`);
    console.log();

    // ============================================
    // Summary
    // ============================================
    console.log("=".repeat(60));
    console.log("🎉 FXPool V2 Deployment Complete!");
    console.log("=".repeat(60));
    console.log("\n📋 Deployed Contracts:");
    console.log(`- FXPool: ${fxPool.address}`);
    console.log(`- FXRouter: ${router.address}`);
    console.log(`- PublicGoodsFund: ${CONTRACTS.PUBLIC_GOODS_FUND}`);

    console.log("\n🔗 Explorer Links:");
    console.log(`- FXPool: https://sepolia-optimistic.etherscan.io/address/${fxPool.address}`);
    console.log(`- FXRouter: https://sepolia-optimistic.etherscan.io/address/${router.address}`);

    console.log("\n✅ Configuration Status:");
    console.log("- PublicGoodsFund Integration: ✅ Enabled");
    console.log("- Supported Tokens: ✅ USDC, USDT");
    console.log("- Trading Pairs: ✅ USDC/USDT");
    console.log("- Router: ✅ Deployed & Configured");

    console.log("\n🎯 Next Steps:");
    console.log("1. Update frontend/lib/contracts.ts with new addresses");
    console.log("2. Test swap functionality");
    console.log("3. Monitor spread donations to PublicGoodsFund");
    console.log();

    // ============================================
    // Generate Frontend Update Instructions
    // ============================================
    console.log("📝 Frontend Update (Copy to frontend/lib/contracts.ts):");
    console.log("-".repeat(60));
    console.log(`  FX_POOL: '${fxPool.address}',`);
    console.log(`  FX_ROUTER: '${router.address}',`);
    console.log("=".repeat(60) + "\n");

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

/**
 * Complete FXPool V2 Deployment - Deploy Router Only
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

const CONTRACTS = {
  AETHER_ORACLE_V2: '0x6a0c9aA2B04BA45Dd348a86Ae3ebE81EE89df106',
  PUBLIC_GOODS_FUND: '0x0C50DB765fa4b25D960D2CCa7556135909A742C1',
  FX_POOL: '0x54BcFC4BdfDEb4376fa844dFFd1A784570F82C56', // ✅ Already deployed
  MOCK_USDC: '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3',
  MOCK_USDT: '0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C',
};

async function main() {
  console.log("\n🔧 Completing FXPool V2 Deployment\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}\n`);

  try {
    // Deploy FXRouter
    console.log("📌 Deploying FXRouter...");
    const FXRouter = await hre.ethers.getContractFactory("FXRouter");
    const router = await FXRouter.deploy();
    await router.deployed();
    console.log(`✅ FXRouter deployed to: ${router.address}\n`);

    // Register pool
    console.log("📌 Registering pool in router...");
    const registerTx = await router.registerPool("USDC/USDT", CONTRACTS.FX_POOL);
    await registerTx.wait();
    console.log("✅ Pool registered\n");

    // Save deployment info
    const deployment = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      contracts: {
        FXPool: CONTRACTS.FX_POOL,
        FXRouter: router.address,
        AetherOracleV2: CONTRACTS.AETHER_ORACLE_V2,
        PublicGoodsFund: CONTRACTS.PUBLIC_GOODS_FUND,
      },
      tokens: {
        USDC: CONTRACTS.MOCK_USDC,
        USDT: CONTRACTS.MOCK_USDT,
      },
      configuration: {
        publicGoodsFundConfigured: true,
        tokensAdded: true,
        routerDeployed: true
      }
    };

    const deploymentPath = path.join(__dirname, '../deployments/fxpool-v2-deployment.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`✅ Saved to: ${deploymentPath}\n`);

    console.log("=" + "=".repeat(59));
    console.log("🎉 Deployment Complete!");
    console.log("=" + "=".repeat(59));
    console.log(`\n📋 Addresses:`);
    console.log(`- FXPool: ${CONTRACTS.FX_POOL}`);
    console.log(`- FXRouter: ${router.address}`);
    console.log(`\n📝 Update frontend/lib/contracts.ts:`);
    console.log(`  FX_POOL: '${CONTRACTS.FX_POOL}',`);
    console.log(`  FX_ROUTER: '${router.address}',\n`);

  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

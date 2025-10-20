/**
 * Fix PaymentGatewayV2 with Correct FXRouter Address
 *
 * Root Cause: PaymentGatewayV2 is using wrong FXRouter address
 * - Current (wrong): 0x81C8F2AdD03187A17F8998541e27E2dD7566c504
 * - Correct: 0x94e3dFEF2c19e2cFf0D2CC6F5801C7ceC3927663
 *
 * This script will redeploy PaymentGatewayV2 with the correct FXRouter
 */

const hre = require("hardhat");
const fs = require('fs');
const path = require('path');

// CORRECT Contract addresses from fxpool-v2-deployment.json
const CONTRACTS = {
  // Core Infrastructure
  FX_ROUTER: '0x94e3dFEF2c19e2cFf0D2CC6F5801C7ceC3927663',  // ✅ CORRECT FXRouter
  FX_POOL: '0x6035B7FCbbc63CADCCd01f617375F4C6ca4C43A3',
  PUBLIC_GOODS_FUND: '0x61E95B1551168D3f9F2C9EE6427705fCDC26b950',
  AETHER_ORACLE_V2: '0x6a0c9aA2B04BA45Dd348a86Ae3ebE81EE89df106',

  // Tokens
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  MOCK_USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',
};

async function main() {
  console.log("\n🔧 Fixing PaymentGatewayV2 with Correct FXRouter\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  try {
    // ============================================
    // Step 1: Deploy PaymentGatewayV2 with CORRECT FXRouter
    // ============================================
    console.log("📌 Step 1: Deploying PaymentGatewayV2 with Correct FXRouter");
    console.log("-".repeat(60));

    console.log("Contract Parameters:");
    console.log(`- FXRouter (CORRECT): ${CONTRACTS.FX_ROUTER}`);
    console.log(`- Treasury: ${deployer.address}`);
    console.log(`- Donation: ${deployer.address}`);
    console.log(`- PublicGoodsFund: ${CONTRACTS.PUBLIC_GOODS_FUND}`);
    console.log(`- AetherOracle: ${CONTRACTS.AETHER_ORACLE_V2}`);
    console.log();

    const PaymentGateway = await hre.ethers.getContractFactory("PaymentGatewayV2");
    const gateway = await PaymentGateway.deploy(
      CONTRACTS.FX_ROUTER,        // ✅ Using CORRECT FXRouter
      deployer.address,            // Treasury address
      deployer.address,            // Donation address
      CONTRACTS.PUBLIC_GOODS_FUND, // PublicGoodsFund address
      CONTRACTS.AETHER_ORACLE_V2   // AetherOracle address
    );

    console.log(`Transaction hash: ${gateway.deployTransaction.hash}`);
    console.log("⏳ Waiting for confirmation...");
    await gateway.deployed();

    console.log(`✅ PaymentGatewayV2 deployed to: ${gateway.address}`);
    console.log();

    // ============================================
    // Step 2: Configure Supported Tokens
    // ============================================
    console.log("📌 Step 2: Configuring Supported Tokens");
    console.log("-".repeat(60));

    const tokens = [
      { name: 'USDC', address: CONTRACTS.MOCK_USDC },
      { name: 'USDT', address: CONTRACTS.MOCK_USDT }
    ];

    for (const token of tokens) {
      console.log(`Adding ${token.name}: ${token.address}`);
      const tx = await gateway.addSupportedToken(token.address);
      await tx.wait();
      console.log(`✅ ${token.name} added`);
    }
    console.log();

    // ============================================
    // Step 3: Set Token Symbols for Oracle Pairs
    // ============================================
    console.log("📌 Step 3: Setting Token Symbols for Oracle");
    console.log("-".repeat(60));

    console.log("Setting token symbols for trading pairs...");
    const symbolTx = await gateway.setTokenSymbols(
      [CONTRACTS.MOCK_USDC, CONTRACTS.MOCK_USDT],
      ["USDC", "USDT"]
    );
    await symbolTx.wait();
    console.log("✅ Token symbols configured");
    console.log();

    // ============================================
    // Step 4: Verify FXRouter Configuration
    // ============================================
    console.log("📌 Step 4: Verifying FXRouter Configuration");
    console.log("-".repeat(60));

    const configuredRouter = await gateway.fxRouter();
    console.log(`Configured FXRouter: ${configuredRouter}`);

    if (configuredRouter.toLowerCase() !== CONTRACTS.FX_ROUTER.toLowerCase()) {
      throw new Error("❌ FXRouter address mismatch!");
    }
    console.log("✅ FXRouter correctly configured");
    console.log();

    // ============================================
    // Step 5: Verify Pool Registration in FXRouter
    // ============================================
    console.log("📌 Step 5: Verifying Pool Registration");
    console.log("-".repeat(60));

    const FXRouter = await hre.ethers.getContractFactory("FXRouter");
    const router = FXRouter.attach(CONTRACTS.FX_ROUTER);

    // Check if USDC/USDT pool is registered
    const poolAddress = await router.poolRegistry("USDC/USDT");
    console.log(`USDC/USDT Pool in Router: ${poolAddress}`);

    if (poolAddress === '0x0000000000000000000000000000000000000000') {
      console.log("⚠️ Pool not registered, registering now...");
      const registerTx = await router.registerPool("USDC/USDT", CONTRACTS.FX_POOL);
      await registerTx.wait();
      console.log("✅ Pool registered");
    } else {
      console.log("✅ Pool already registered");
    }
    console.log();

    // ============================================
    // Step 6: Update Frontend Contracts
    // ============================================
    console.log("📌 Step 6: Updating Frontend Configuration");
    console.log("-".repeat(60));

    const contractsPath = path.join(__dirname, '../frontend/lib/contracts.ts');
    const contractsContent = `// Contract addresses for Optimism Sepolia testnet
// Updated: ${new Date().toISOString()} - Fixed FXRouter address issue

export const CONTRACTS = {
  // Core Contracts - FIXED: Using correct FXRouter
  PAYMENT_GATEWAY_V2: '${gateway.address}',
  PUBLIC_GOODS_FUND: '${CONTRACTS.PUBLIC_GOODS_FUND}',
  FX_ROUTER: '${CONTRACTS.FX_ROUTER}',  // ✅ CORRECT FXRouter with pools registered

  // Mock Tokens - Test tokens on Optimism Sepolia
  MOCK_USDC: '${CONTRACTS.MOCK_USDC}',
  MOCK_USDT: '${CONTRACTS.MOCK_USDT}',

  // Legacy addresses (for compatibility)
  PAYMENT_GATEWAY: '0x7aC993ee1E0b00C319b90822C701dF61896141BA', // Old version
} as const;
`;

    // Append the rest of the ABI definitions
    const currentContent = fs.readFileSync(contractsPath, 'utf8');
    const abiStartIndex = currentContent.indexOf('export const PAYMENT_GATEWAY_ABI');
    if (abiStartIndex !== -1) {
      const abiContent = currentContent.substring(abiStartIndex);
      fs.writeFileSync(contractsPath, contractsContent + '\n' + abiContent);
      console.log("✅ Frontend contracts updated");
    } else {
      console.log("⚠️ Could not find ABI definitions, please update manually");
    }
    console.log();

    // ============================================
    // Step 7: Save Deployment Info
    // ============================================
    console.log("📌 Step 7: Saving Deployment Information");
    console.log("-".repeat(60));

    const deployment = {
      network: hre.network.name,
      timestamp: new Date().toISOString(),
      deployer: deployer.address,
      issue: "Fixed FXRouter address mismatch for cross-currency payments",
      contracts: {
        PaymentGatewayV2: gateway.address,
        FXRouter: CONTRACTS.FX_ROUTER,
        FXPool: CONTRACTS.FX_POOL,
        PublicGoodsFund: CONTRACTS.PUBLIC_GOODS_FUND,
        AetherOracleV2: CONTRACTS.AETHER_ORACLE_V2,
      },
      tokens: {
        USDC: CONTRACTS.MOCK_USDC,
        USDT: CONTRACTS.MOCK_USDT,
      },
      fixes: [
        "PaymentGatewayV2 now uses correct FXRouter (0x94e3dFEF...)",
        "FXRouter has USDC/USDT pool registered",
        "Cross-currency payments should now work"
      ]
    };

    const deploymentPath = path.join(__dirname, '../deployments/payment-gateway-fix.json');
    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log(`✅ Deployment info saved to: ${deploymentPath}`);
    console.log();

    // ============================================
    // Summary
    // ============================================
    console.log("=".repeat(60));
    console.log("🎉 PaymentGatewayV2 Fixed Successfully!");
    console.log("=".repeat(60));

    console.log("\n✅ FIXED Issues:");
    console.log("1. PaymentGatewayV2 now uses CORRECT FXRouter");
    console.log("2. FXRouter has USDC/USDT pool registered");
    console.log("3. Cross-currency payments (USDC→USDT, USDT→USDC) will work");

    console.log("\n📋 Updated Contracts:");
    console.log(`- PaymentGatewayV2: ${gateway.address}`);
    console.log(`- FXRouter (correct): ${CONTRACTS.FX_ROUTER}`);
    console.log(`- FXPool: ${CONTRACTS.FX_POOL}`);

    console.log("\n🔗 Explorer Links:");
    console.log(`- PaymentGatewayV2: https://sepolia-optimism.etherscan.io/address/${gateway.address}`);
    console.log(`- FXRouter: https://sepolia-optimism.etherscan.io/address/${CONTRACTS.FX_ROUTER}`);

    console.log("\n🎯 Next Steps:");
    console.log("1. Frontend contracts have been updated automatically");
    console.log("2. Restart the frontend development server");
    console.log("3. Test cross-currency payments:");
    console.log("   - Create order with USDC payment, USDT settlement");
    console.log("   - Create order with USDT payment, USDC settlement");
    console.log("4. Verify payments complete successfully");
    console.log();

  } catch (error) {
    console.error("\n❌ Fix failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
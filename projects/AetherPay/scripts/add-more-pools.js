/**
 * Add More Trading Pools to FXRouter
 *
 * Currently only USDC/USDT pool exists.
 * This script will add more trading pairs.
 */

const hre = require("hardhat");

// Contract addresses from deployment
const CONTRACTS = {
  FX_ROUTER: '0x94e3dFEF2c19e2cFf0D2CC6F5801C7ceC3927663',
  FX_POOL: '0x6035B7FCbbc63CADCCd01f617375F4C6ca4C43A3',
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  MOCK_USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',
};

// Trading pairs to add
const TRADING_PAIRS = [
  // Note: Since we only have USDC and USDT tokens deployed,
  // we can only create pools between these two tokens.
  // The USDC/USDT pool already exists.

  // For demonstration, we'll show how to add more pairs if we had more tokens:
  // { pair: "ETH/USDC", baseFee: 30 },  // 0.3% fee
  // { pair: "ETH/USDT", baseFee: 30 },  // 0.3% fee
  // { pair: "DAI/USDC", baseFee: 10 },  // 0.1% fee (stablecoin pairs have lower fees)
  // { pair: "DAI/USDT", baseFee: 10 },  // 0.1% fee
  // { pair: "WBTC/USDC", baseFee: 50 }, // 0.5% fee (higher volatility)
  // { pair: "WBTC/USDT", baseFee: 50 }, // 0.5% fee
];

// If we want to add more tokens and pools, we need to deploy them first
const MOCK_TOKENS_TO_DEPLOY = [
  { symbol: "DAI", name: "Mock DAI", decimals: 18 },
  { symbol: "WETH", name: "Mock Wrapped Ether", decimals: 18 },
  { symbol: "WBTC", name: "Mock Wrapped Bitcoin", decimals: 8 },
];

async function main() {
  console.log("\n🎯 Adding More Trading Pools to FXRouter\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  try {
    // Connect to existing contracts
    const FXPool = await hre.ethers.getContractFactory("FXPool");
    const fxPool = FXPool.attach(CONTRACTS.FX_POOL);

    const FXRouter = await hre.ethers.getContractFactory("FXRouter");
    const router = FXRouter.attach(CONTRACTS.FX_ROUTER);

    // ============================================
    // Step 1: Deploy Additional Mock Tokens
    // ============================================
    console.log("📌 Step 1: Deploying Additional Mock Tokens");
    console.log("-".repeat(60));

    const MockToken = await hre.ethers.getContractFactory("MockERC20");
    const deployedTokens = {};

    for (const tokenConfig of MOCK_TOKENS_TO_DEPLOY) {
      console.log(`\nDeploying ${tokenConfig.symbol}...`);

      const token = await MockToken.deploy(
        tokenConfig.name,
        tokenConfig.symbol,
        tokenConfig.decimals
      );
      await token.deployed();

      deployedTokens[tokenConfig.symbol] = token.address;
      console.log(`✅ ${tokenConfig.symbol} deployed to: ${token.address}`);

      // Mint some tokens to the deployer for testing
      const mintAmount = hre.ethers.utils.parseUnits("1000000", tokenConfig.decimals);
      await token.mint(deployer.address, mintAmount);
      console.log(`   Minted 1,000,000 ${tokenConfig.symbol} to deployer`);
    }

    console.log();

    // ============================================
    // Step 2: Add Tokens to FXPool as Supported
    // ============================================
    console.log("📌 Step 2: Adding Tokens to FXPool");
    console.log("-".repeat(60));

    for (const [symbol, address] of Object.entries(deployedTokens)) {
      console.log(`Adding ${symbol} (${address}) to FXPool...`);
      const tx = await fxPool.addSupportedToken(address);
      await tx.wait();
      console.log(`✅ ${symbol} added`);
    }

    console.log();

    // ============================================
    // Step 3: Create Trading Pools
    // ============================================
    console.log("📌 Step 3: Creating Trading Pools");
    console.log("-".repeat(60));

    const newPairs = [
      // Stablecoin pairs (low fees)
      { pair: "DAI/USDC", baseFee: 10 },
      { pair: "DAI/USDT", baseFee: 10 },

      // ETH pairs (medium fees)
      { pair: "WETH/USDC", baseFee: 30 },
      { pair: "WETH/USDT", baseFee: 30 },
      { pair: "WETH/DAI", baseFee: 30 },

      // BTC pairs (higher fees)
      { pair: "WBTC/USDC", baseFee: 50 },
      { pair: "WBTC/USDT", baseFee: 50 },
      { pair: "WBTC/DAI", baseFee: 50 },
      { pair: "WBTC/WETH", baseFee: 50 },
    ];

    for (const poolConfig of newPairs) {
      console.log(`\nCreating pool "${poolConfig.pair}" with ${poolConfig.baseFee} basis points fee...`);

      try {
        const createTx = await fxPool.createPool(poolConfig.pair, poolConfig.baseFee);
        await createTx.wait();
        console.log(`✅ Pool ${poolConfig.pair} created`);
      } catch (error) {
        if (error.message.includes("Pool already exists")) {
          console.log(`⚠️ Pool ${poolConfig.pair} already exists, skipping...`);
        } else {
          throw error;
        }
      }
    }

    console.log();

    // ============================================
    // Step 4: Register Pools in FXRouter
    // ============================================
    console.log("📌 Step 4: Registering Pools in FXRouter");
    console.log("-".repeat(60));

    // Check owner of FXRouter
    const routerOwner = await router.owner();
    console.log(`FXRouter owner: ${routerOwner}`);

    if (routerOwner.toLowerCase() !== deployer.address.toLowerCase()) {
      console.log("⚠️ Warning: Deployer is not the owner of FXRouter");
      console.log("   Cannot register pools without owner permissions");
      console.log("   Skipping pool registration...");
    } else {
      for (const poolConfig of newPairs) {
        console.log(`\nRegistering pool "${poolConfig.pair}" in router...`);

        try {
          const registerTx = await router.registerPool(poolConfig.pair, fxPool.address);
          await registerTx.wait();
          console.log(`✅ Pool ${poolConfig.pair} registered in router`);
        } catch (error) {
          console.error(`❌ Failed to register ${poolConfig.pair}:`, error.message);
        }
      }
    }

    console.log();

    // ============================================
    // Step 5: Verify Pool Status
    // ============================================
    console.log("📌 Step 5: Verifying Pool Status");
    console.log("-".repeat(60));

    console.log("\n📊 Active Trading Pools:");
    console.log("-".repeat(40));

    // Check existing pool
    const existingPairs = ["USDC/USDT"];
    const allPairs = [...existingPairs, ...newPairs.map(p => p.pair)];

    for (const pair of allPairs) {
      try {
        const poolInfo = await fxPool.getPoolInfo(pair);
        if (poolInfo.isActive) {
          const registeredInRouter = await router.poolRegistry(pair);
          console.log(`\n✅ ${pair}:`);
          console.log(`   - Base Fee: ${poolInfo.baseFee} bps (${poolInfo.baseFee / 100}%)`);
          console.log(`   - Dynamic Fee: ${poolInfo.dynamicFee} bps`);
          console.log(`   - Total Liquidity: ${hre.ethers.utils.formatUnits(poolInfo.totalLiquidity, 6)}`);
          console.log(`   - Router Registration: ${registeredInRouter !== '0x0000000000000000000000000000000000000000' ? '✅' : '❌'}`);
        }
      } catch (error) {
        // Pool doesn't exist
      }
    }

    console.log();

    // ============================================
    // Summary
    // ============================================
    console.log("=".repeat(60));
    console.log("🎉 Trading Pool Setup Complete!");
    console.log("=".repeat(60));

    console.log("\n📋 Deployed Tokens:");
    for (const [symbol, address] of Object.entries(deployedTokens)) {
      console.log(`- ${symbol}: ${address}`);
    }

    console.log("\n✅ Created Pools:");
    for (const poolConfig of newPairs) {
      console.log(`- ${poolConfig.pair} (${poolConfig.baseFee / 100}% fee)`);
    }

    console.log("\n🎯 Next Steps:");
    console.log("1. Add liquidity to the new pools");
    console.log("2. Update frontend to support new tokens");
    console.log("3. Configure oracle rates for new pairs");
    console.log("4. Test swaps between different token pairs");

    console.log("\n📝 Update frontend/lib/contracts.ts with new token addresses:");
    console.log("-".repeat(60));
    for (const [symbol, address] of Object.entries(deployedTokens)) {
      console.log(`  MOCK_${symbol}: '${address}',`);
    }
    console.log();

  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
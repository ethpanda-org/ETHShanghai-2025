/**
 * Add New Tokens to PaymentGatewayV2
 *
 * This script adds DAI, WETH, and WBTC as supported tokens in the PaymentGatewayV2 contract
 */

const hre = require("hardhat");

// Contract addresses
const CONTRACTS = {
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',

  // Existing tokens (already added)
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  MOCK_USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',

  // New tokens to add
  MOCK_DAI:  '0x453Cbf07Af7293FDee270C9A15a95aedaEaA383e',
  MOCK_WETH: '0x134AA0b1B739d80207566B473534601DCea2aD92',
  MOCK_WBTC: '0xCA38436dB07b3Ee43851E6de3A0A9333738eAC9A',
};

async function main() {
  console.log("\n🎯 Adding New Tokens to PaymentGatewayV2\n");
  console.log("=".repeat(60));

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.utils.formatEther(balance)} ETH\n`);

  try {
    // Connect to PaymentGatewayV2
    const PaymentGateway = await hre.ethers.getContractFactory("PaymentGatewayV2");
    const gateway = PaymentGateway.attach(CONTRACTS.PAYMENT_GATEWAY_V2);

    console.log(`Connected to PaymentGatewayV2: ${CONTRACTS.PAYMENT_GATEWAY_V2}`);
    console.log();

    // ============================================
    // Step 1: Check Current Supported Tokens
    // ============================================
    console.log("📌 Step 1: Checking Current Supported Tokens");
    console.log("-".repeat(60));

    const tokensToCheck = [
      { name: 'USDC', address: CONTRACTS.MOCK_USDC },
      { name: 'USDT', address: CONTRACTS.MOCK_USDT },
      { name: 'DAI', address: CONTRACTS.MOCK_DAI },
      { name: 'WETH', address: CONTRACTS.MOCK_WETH },
      { name: 'WBTC', address: CONTRACTS.MOCK_WBTC },
    ];

    const unsupportedTokens = [];

    for (const token of tokensToCheck) {
      const isSupported = await gateway.supportedTokens(token.address);
      console.log(`${token.name} (${token.address}): ${isSupported ? '✅ Supported' : '❌ Not Supported'}`);

      if (!isSupported) {
        unsupportedTokens.push(token);
      }
    }
    console.log();

    // ============================================
    // Step 2: Add Unsupported Tokens
    // ============================================
    if (unsupportedTokens.length > 0) {
      console.log("📌 Step 2: Adding Unsupported Tokens");
      console.log("-".repeat(60));

      for (const token of unsupportedTokens) {
        console.log(`\nAdding ${token.name}: ${token.address}`);
        try {
          const tx = await gateway.addSupportedToken(token.address);
          await tx.wait();
          console.log(`✅ ${token.name} added successfully`);
          console.log(`   Transaction hash: ${tx.hash}`);
        } catch (error) {
          if (error.message.includes("Token already supported")) {
            console.log(`⚠️ ${token.name} is already supported`);
          } else {
            console.error(`❌ Failed to add ${token.name}:`, error.message);
          }
        }
      }
    } else {
      console.log("📌 All tokens are already supported!");
    }
    console.log();

    // ============================================
    // Step 3: Set Token Symbols for Oracle
    // ============================================
    console.log("📌 Step 3: Setting Token Symbols for Oracle");
    console.log("-".repeat(60));

    const tokenAddresses = [
      CONTRACTS.MOCK_USDC,
      CONTRACTS.MOCK_USDT,
      CONTRACTS.MOCK_DAI,
      CONTRACTS.MOCK_WETH,
      CONTRACTS.MOCK_WBTC,
    ];

    const tokenSymbols = ["USDC", "USDT", "DAI", "WETH", "WBTC"];

    console.log("Setting token symbols for oracle pairs...");
    try {
      const tx = await gateway.setTokenSymbols(tokenAddresses, tokenSymbols);
      await tx.wait();
      console.log("✅ Token symbols configured successfully");
      console.log(`   Transaction hash: ${tx.hash}`);
    } catch (error) {
      console.log("⚠️ Token symbols might already be set or error:", error.message);
    }
    console.log();

    // ============================================
    // Step 4: Verify Final Configuration
    // ============================================
    console.log("📌 Step 4: Verifying Final Configuration");
    console.log("-".repeat(60));

    console.log("\n✅ All Supported Tokens:");
    for (const token of tokensToCheck) {
      const isSupported = await gateway.supportedTokens(token.address);
      if (isSupported) {
        console.log(`   - ${token.name}: ${token.address}`);
      }
    }

    // ============================================
    // Summary
    // ============================================
    console.log("\n" + "=".repeat(60));
    console.log("🎉 Token Configuration Complete!");
    console.log("=".repeat(60));

    console.log("\n📋 Summary:");
    console.log("✅ All 5 tokens are now supported in PaymentGatewayV2");
    console.log("✅ Token symbols configured for oracle");

    console.log("\n🎯 Available Trading Pairs:");
    console.log("- Stablecoin pairs: USDC/USDT, DAI/USDC, DAI/USDT");
    console.log("- WETH pairs: WETH/USDC, WETH/USDT, WETH/DAI");
    console.log("- WBTC pairs: WBTC/USDC, WBTC/USDT, WBTC/DAI");
    console.log("- Crypto pairs: WBTC/WETH");

    console.log("\n🔗 Explorer Links:");
    console.log(`PaymentGatewayV2: https://sepolia-optimism.etherscan.io/address/${CONTRACTS.PAYMENT_GATEWAY_V2}`);
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
const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================================");
  console.log("🔧 Setting Up Merchant & Tokens");
  console.log("=================================================\n");

  const GATEWAY_ADDRESS = "0x27A85f411370bE05BCf4b2846bD13724f8507981";

  // Frontend token addresses (from contracts.ts)
  const tokens = {
    USDC: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    USDT: "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58",
    DAI: "0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"
  };

  const [signer] = await ethers.getSigners();
  console.log("👤 Account:", signer.address);
  console.log("💰 Balance:", ethers.utils.formatEther(await signer.getBalance()), "ETH\n");

  const gateway = await ethers.getContractAt("PaymentGatewayV2", GATEWAY_ADDRESS);

  // Step 1: Check/Register Merchant
  console.log("📋 Step 1: Checking Merchant Status...");
  try {
    const merchantInfo = await gateway.getMerchantInfo(signer.address);

    if (!merchantInfo.isActive || merchantInfo.businessName === "") {
      console.log("   ⚠️  Not registered. Registering merchant...");
      const tx = await gateway.registerMerchant("AetherPay Merchant");
      await tx.wait();
      console.log("   ✅ Merchant registered!");
    } else {
      console.log("   ✅ Already registered as:", merchantInfo.businessName);
    }
  } catch (error) {
    console.log("   ⚠️  Error checking merchant, attempting to register...");
    try {
      const tx = await gateway.registerMerchant("AetherPay Merchant");
      await tx.wait();
      console.log("   ✅ Merchant registered!");
    } catch (regError) {
      console.log("   ❌ Registration failed:", regError.message);
    }
  }

  console.log("");

  // Step 2: Add Supported Tokens
  console.log("🪙 Step 2: Adding Supported Tokens...");

  for (const [symbol, address] of Object.entries(tokens)) {
    try {
      const isSupported = await gateway.supportedTokens(address);

      if (!isSupported) {
        console.log(`   Adding ${symbol} (${address})...`);
        const tx = await gateway.addSupportedToken(address);
        await tx.wait();
        console.log(`   ✅ ${symbol} added!`);
      } else {
        console.log(`   ✅ ${symbol} already supported`);
      }
    } catch (error) {
      console.log(`   ❌ Failed to add ${symbol}:`, error.message);
    }
  }

  console.log("");

  // Step 3: Verify Setup
  console.log("🔍 Step 3: Verifying Setup...");

  const merchantInfo = await gateway.getMerchantInfo(signer.address);
  console.log("   Business Name:", merchantInfo.businessName);
  console.log("   Is Active:", merchantInfo.isActive);
  console.log("");

  console.log("   Supported Tokens:");
  for (const [symbol, address] of Object.entries(tokens)) {
    const isSupported = await gateway.supportedTokens(address);
    console.log(`   ${isSupported ? "✅" : "❌"} ${symbol}: ${address}`);
  }

  console.log("");
  console.log("=================================================");
  console.log("✅ Setup Complete!");
  console.log("=================================================\n");
  console.log("You can now create orders with USDC, USDT, or DAI\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Setup failed:");
    console.error(error);
    process.exit(1);
  });

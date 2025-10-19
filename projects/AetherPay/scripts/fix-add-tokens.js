const hre = require("hardhat");

async function main() {
  console.log("🔧 Quick Fix: Adding tokens to PaymentGatewayV2...\n");

  // ✅ 您的合约地址
  const GATEWAY_ADDRESS = "0x004aF374185d500b37Cd7481E1Ec17F0410F1e0e";
  
  // ✅ 您使用的Token地址（直接使用正确的checksum格式）
  // 原始地址转为小写，然后通过getAddress自动添加正确的checksum
  const PAYMENT_TOKEN = hre.ethers.utils.getAddress("0x07c1e2588295b73bd0b98f2806abf13e748b6cc3");
  const SETTLEMENT_TOKEN = hre.ethers.utils.getAddress("0xdda8cea63eda45777dbd2735a6b4c4c2dd5f942c");

  // Get signer
  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);
  const balance = await hre.ethers.utils.formatEther(await deployer.getBalance());
  console.log("💰 Balance:", balance, "ETH\n");

  // Get contract instance
  const gateway = await hre.ethers.getContractAt("PaymentGatewayV2", GATEWAY_ADDRESS);
  console.log("📋 PaymentGateway:", GATEWAY_ADDRESS);

  // Check owner
  const owner = await gateway.owner();
  console.log("👑 Contract owner:", owner);
  console.log("🔑 Your address:", deployer.address);
  
  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    console.error("\n❌ ERROR: You are not the contract owner!");
    console.error("   Owner:", owner);
    console.error("   You:", deployer.address);
    console.error("\n💡 Solution: Switch to the owner wallet in MetaMask");
    process.exit(1);
  }
  console.log("✅ Owner verified\n");

  // Check current support status
  console.log("🔍 Checking current token support...");
  const paymentSupported = await gateway.supportedTokens(PAYMENT_TOKEN);
  const settlementSupported = await gateway.supportedTokens(SETTLEMENT_TOKEN);

  console.log(`   Payment Token (${PAYMENT_TOKEN}):`);
  console.log(`      ${paymentSupported ? "✅ Already supported" : "❌ NOT supported"}`);
  console.log(`   Settlement Token (${SETTLEMENT_TOKEN}):`);
  console.log(`      ${settlementSupported ? "✅ Already supported" : "❌ NOT supported"}\n`);

  let txCount = 0;

  // Add Payment Token if needed
  if (!paymentSupported) {
    console.log("⏳ Adding Payment Token...");
    const tx1 = await gateway.addSupportedToken(PAYMENT_TOKEN, {
      gasLimit: 100000
    });
    console.log("   📤 Tx hash:", tx1.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await tx1.wait();
    console.log("   ✅ Payment Token added!\n");
    txCount++;
  } else {
    console.log("⏭️  Payment Token already supported\n");
  }

  // Add Settlement Token if needed
  if (!settlementSupported) {
    console.log("⏳ Adding Settlement Token...");
    const tx2 = await gateway.addSupportedToken(SETTLEMENT_TOKEN, {
      gasLimit: 100000
    });
    console.log("   📤 Tx hash:", tx2.hash);
    console.log("   ⏳ Waiting for confirmation...");
    await tx2.wait();
    console.log("   ✅ Settlement Token added!\n");
    txCount++;
  } else {
    console.log("⏭️  Settlement Token already supported\n");
  }

  // Final verification
  console.log("🔍 Final verification...");
  const finalPaymentSupported = await gateway.supportedTokens(PAYMENT_TOKEN);
  const finalSettlementSupported = await gateway.supportedTokens(SETTLEMENT_TOKEN);

  console.log(`   Payment Token: ${finalPaymentSupported ? "✅ Supported" : "❌ NOT Supported"}`);
  console.log(`   Settlement Token: ${finalSettlementSupported ? "✅ Supported" : "❌ NOT Supported"}`);

  if (finalPaymentSupported && finalSettlementSupported) {
    console.log("\n🎉 SUCCESS! All tokens are now supported!");
    console.log(`\n📊 Transactions sent: ${txCount}`);
    console.log("\n✅ You can now create orders with these tokens!");
    console.log("\n🔗 Verify on explorer:");
    console.log(`   https://sepolia-optimistic.etherscan.io/address/${GATEWAY_ADDRESS}#readContract`);
  } else {
    console.log("\n⚠️  WARNING: Some tokens may not have been added");
    console.log("   Please check the transaction logs above");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error.message);
    process.exit(1);
  });


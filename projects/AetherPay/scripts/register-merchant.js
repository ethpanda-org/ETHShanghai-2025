const hre = require("hardhat");

async function main() {
  console.log("🚀 Registering Merchant on PaymentGatewayV2\n");
  console.log("=".repeat(80));

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("💰 Balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

  const GATEWAY_ADDRESS = "0x6dc6fA9482989851cB2aa499d5dee4dF40dC8C83";
  
  const gateway = await hre.ethers.getContractAt("PaymentGatewayV2", GATEWAY_ADDRESS);

  console.log("📋 Contract:", GATEWAY_ADDRESS);
  console.log();

  // 检查当前状态
  console.log("🔍 Checking current merchant status...");
  try {
    const merchantInfo = await gateway.getMerchantInfo(deployer.address);
    if (merchantInfo[5]) {
      console.log("✅ Already registered!");
      console.log("   Business name:", merchantInfo[0]);
      console.log("   Total orders:", merchantInfo[1].toString());
      console.log("\n   No need to register again.");
      return;
    } else {
      console.log("   Not registered yet (expected)\n");
    }
  } catch (error) {
    console.log("   Not registered yet (expected)\n");
  }

  // 注册商家
  console.log("⏳ Registering merchant...");
  const businessName = "AetherPay Merchant";
  
  try {
    const tx = await gateway.registerMerchant(businessName, {
      gasLimit: 500000
    });
    console.log("   Transaction hash:", tx.hash);
    
    console.log("   Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("   ✅ Confirmed in block:", receipt.blockNumber);
    console.log("   Gas used:", receipt.gasUsed.toString());
    
    // 验证注册
    console.log("\n🔍 Verifying registration...");
    const merchantInfo = await gateway.getMerchantInfo(deployer.address);
    console.log("   Business Name:", merchantInfo[0]);
    console.log("   Total Orders:", merchantInfo[1].toString());
    console.log("   Is Active:", merchantInfo[5]);
    
    if (merchantInfo[5]) {
      console.log("\n" + "=".repeat(80));
      console.log("🎉 MERCHANT REGISTRATION SUCCESSFUL!");
      console.log("=".repeat(80));
      console.log("✅ You can now create orders!");
      console.log("\n🎯 Next steps:");
      console.log("   1. Restart frontend: cd frontend && rm -rf .next && npm run dev");
      console.log("   2. Clear browser cache (Ctrl+Shift+Delete)");
      console.log("   3. Reset MetaMask account (Settings → Advanced → Reset account)");
      console.log("   4. Try creating an order!");
      console.log("=".repeat(80));
    } else {
      console.log("\n❌ Registration failed - merchant still not active");
    }
  } catch (error) {
    console.error("\n❌ Registration failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    if (error.error && error.error.message) {
      console.error("   Details:", error.error.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


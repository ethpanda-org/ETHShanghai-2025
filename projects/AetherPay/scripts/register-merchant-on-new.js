const hre = require("hardhat");

async function main() {
  console.log("🚀 Registering merchant on NEW PaymentGatewayV2...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📝 Using account:", deployer.address);
  
  const balance = await deployer.getBalance();
  console.log("💰 Balance:", hre.ethers.utils.formatEther(balance), "ETH\n");

  const NEW_CONTRACT = "0x004aF374185d500b37Cd7481E1Ec17F0410F1e0e";
  
  const PaymentGatewayV2 = await hre.ethers.getContractFactory("PaymentGatewayV2");
  const gateway = PaymentGatewayV2.attach(NEW_CONTRACT);

  console.log("📋 Contract:", NEW_CONTRACT);

  // Check current status
  console.log("\n🔍 Checking current merchant status...");
  try {
    const merchantInfo = await gateway.getMerchantInfo(deployer.address);
    if (merchantInfo[5]) {
      console.log("✅ Already registered! Business name:", merchantInfo[0]);
      console.log("   No need to register again.");
      return;
    }
  } catch (error) {
    console.log("   Not registered yet (expected)");
  }

  // Register
  console.log("\n⏳ Registering merchant...");
  const businessName = "AetherPay Merchant";
  
  try {
    const tx = await gateway.registerMerchant(businessName, {
      gasLimit: 500000
    });
    console.log("   Transaction hash:", tx.hash);
    
    console.log("   Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log("   ✅ Confirmed in block:", receipt.blockNumber);
    
    // Verify
    console.log("\n🔍 Verifying registration...");
    const merchantInfo = await gateway.getMerchantInfo(deployer.address);
    console.log("   Business Name:", merchantInfo[0]);
    console.log("   Is Active:", merchantInfo[5]);
    
    if (merchantInfo[5]) {
      console.log("\n🎉 Merchant successfully registered on NEW contract!");
    } else {
      console.log("\n❌ Registration failed - merchant still not active");
    }
  } catch (error) {
    console.error("\n❌ Registration failed:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


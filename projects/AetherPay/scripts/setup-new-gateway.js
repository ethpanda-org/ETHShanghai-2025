const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔧 Setting up New PaymentGatewayV2");
  console.log("======================================================================\n");

  const [signer] = await ethers.getSigners();
  console.log("📝 Using account:", signer.address);
  console.log("💰 Balance:", ethers.utils.formatEther(await signer.getBalance()), "ETH\n");

  // New contract address
  const PAYMENT_GATEWAY_V2 = "0x65E71cA6C9bD72eceAd2de0Ed06BF135BBfc31b3";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  console.log("📋 Contract Addresses:");
  console.log("   Gateway:", PAYMENT_GATEWAY_V2);
  console.log("   USDC:", MOCK_USDC);
  console.log("   USDT:", MOCK_USDT);
  console.log("");

  // Get contracts
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);
  const usdc = await ethers.getContractAt("MockERC20", MOCK_USDC);
  const usdt = await ethers.getContractAt("MockERC20", MOCK_USDT);

  console.log("🔍 Checking merchant status...");
  try {
    const merchantInfo = await gateway.getMerchantInfo(signer.address);
    console.log("   Business Name:", merchantInfo[0]);
    console.log("   Total Orders:", merchantInfo[1].toString());
    console.log("   Is Active:", merchantInfo[5]);

    if (merchantInfo[5]) {
      console.log("\n✅ Already registered as merchant!\n");
    } else {
      console.log("\n⚠️  Merchant exists but is not active. Registering again...\n");
      const tx = await gateway.registerMerchant("Test Merchant");
      await tx.wait();
      console.log("✅ Merchant registered!\n");
    }
  } catch (error) {
    if (error.message.includes("Merchant not registered")) {
      console.log("   Not registered yet. Registering...\n");
      const tx = await gateway.registerMerchant("Test Merchant");
      await tx.wait();
      console.log("✅ Merchant registered!\n");
    } else {
      throw error;
    }
  }

  console.log("💰 Checking token balances...");
  const usdcBalance = await usdc.balanceOf(signer.address);
  const usdtBalance = await usdt.balanceOf(signer.address);
  console.log("   USDC:", ethers.utils.formatUnits(usdcBalance, 6));
  console.log("   USDT:", ethers.utils.formatUnits(usdtBalance, 6));
  console.log("");

  if (usdcBalance.eq(0)) {
    console.log("⚠️  No USDC balance. Minting 1000 USDC...");
    const mintTx = await usdc.mint(signer.address, ethers.utils.parseUnits("1000", 6));
    await mintTx.wait();
    console.log("✅ Minted 1000 USDC\n");
  }

  if (usdtBalance.eq(0)) {
    console.log("⚠️  No USDT balance. Minting 1000 USDT...");
    const mintTx = await usdt.mint(signer.address, ethers.utils.parseUnits("1000", 6));
    await mintTx.wait();
    console.log("✅ Minted 1000 USDT\n");
  }

  console.log("✅ Setup complete!");
  console.log("\n📝 Next Steps:");
  console.log("   1. Start frontend: cd frontend && npm run dev");
  console.log("   2. Visit: http://localhost:3000/dashboard");
  console.log("   3. Create an order");
  console.log("   4. Test payment (you have 24 hours to pay!)");
  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🔧 CREATE SIMPLE ORDER: Same Token Payment");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("💼 Deployer:", deployer.address);

  // Contract addresses
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const FRONTEND_USER = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";

  // Get the gateway contract
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("📊 Creating Simple Order (USDC → USDC)");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Create a simple order with same token for payment and settlement (no swap needed)
  const orderId = `SIMPLE_${Date.now()}`;
  const amount = ethers.utils.parseUnits("5", 6); // 5 USDC

  console.log("📝 Order Details:");
  console.log("  Order ID:", orderId);
  console.log("  Amount:", ethers.utils.formatUnits(amount, 6), "USDC");
  console.log("  Payment Token: USDC");
  console.log("  Settlement Token: USDC (same - no swap needed)");
  console.log("  Designated Payer:", FRONTEND_USER);
  console.log("  Partial Payment: Not allowed");

  try {
    // createOrder with correct 7 parameters
    console.log("\n🚀 Creating order...");
    const tx = await gateway.createOrder(
      orderId,                    // orderIdString
      amount,                      // orderAmount
      MOCK_USDC,                   // paymentToken
      MOCK_USDC,                   // settlementToken (same as payment token)
      "",                         // metadataURI (empty for now)
      false,                      // allowPartialPayment
      FRONTEND_USER                // designatedPayer (specific user required)
    );

    console.log("📤 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Order created successfully!");
    console.log("   Block:", receipt.blockNumber);
    console.log("   Gas Used:", receipt.gasUsed.toString());

    // Verify the order was created
    console.log("\n🔍 Verifying order...");
    const orderDetails = await gateway.getOrderDetailsByString(orderId);
    console.log("✅ Order confirmed on-chain!");
    console.log("   Status:", ["PENDING", "PAID", "COMPLETED", "EXPIRED"][orderDetails[8]]);
    console.log("   Payment Token:", orderDetails[4]);
    console.log("   Settlement Token:", orderDetails[5]);

    console.log("\n======================================================================");
    console.log("✅ SUCCESS!");
    console.log("======================================================================\n");
    console.log("🔗 You can now test payment at:");
    console.log(`   http://localhost:3000/pay/${orderId}`);
    console.log("\n💡 This order uses the same token for payment and settlement,");
    console.log("   so it won't require a cross-currency swap.");
    console.log("======================================================================\n");

  } catch (error) {
    console.error("\n❌ Error creating order:", error.message);

    // More detailed error info
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
    if (error.data) {
      console.error("   Data:", error.data);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
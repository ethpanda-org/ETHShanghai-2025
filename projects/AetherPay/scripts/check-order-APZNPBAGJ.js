const { ethers } = require("hardhat");

async function main() {
  const PAYMENT_GATEWAY_V2 = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
  const orderId = "APZNPBAGJ";

  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("\n🔍 Querying order:", orderId);
  console.log("📍 Contract:", PAYMENT_GATEWAY_V2);
  console.log("\n");

  try {
    const orderDetails = await gateway.getOrderDetailsByString(orderId);

    console.log("📦 Order Details:");
    console.log("================");
    console.log("Order ID (bytes32):", orderDetails[0]);
    console.log("Merchant:", orderDetails[1]);
    console.log("Designated Payer:", orderDetails[2]);
    console.log("Order Amount:", ethers.utils.formatUnits(orderDetails[3], 6), "tokens");
    console.log("Payment Token:", orderDetails[4]);
    console.log("Settlement Token:", orderDetails[5]);
    console.log("Status:", orderDetails[8].toString(), ["Pending", "Paid", "Completed", "Expired"][orderDetails[8]] || "Unknown");
    console.log("Created At:", new Date(orderDetails[9].toNumber() * 1000).toLocaleString());
    console.log("");

    const isPublicOrder = orderDetails[2] === ethers.constants.AddressZero;
    console.log("🔓 Is Public Order (anyone can pay)?", isPublicOrder);

    if (!isPublicOrder) {
      console.log("🔒 This is a DESIGNATED order - only this address can pay:", orderDetails[2]);
    }

    const [signer] = await ethers.getSigners();
    const currentAddress = await signer.getAddress();
    console.log("\n👤 Your current wallet address:", currentAddress);

    if (!isPublicOrder) {
      const isCorrectPayer = orderDetails[2].toLowerCase() === currentAddress.toLowerCase();
      console.log("");
      if (isCorrectPayer) {
        console.log("✅ YOU ARE THE DESIGNATED PAYER - You can pay this order!");
      } else {
        console.log("❌ YOU ARE NOT THE DESIGNATED PAYER - You CANNOT pay this order!");
        console.log("   Required:", orderDetails[2]);
        console.log("   Your wallet:", currentAddress);
        console.log("");
        console.log("🔧 SOLUTION: You need to either:");
        console.log("   1. Switch to wallet:", orderDetails[2]);
        console.log("   2. Or ask the merchant to create a new PUBLIC order (leave buyer address empty)");
      }
    } else {
      console.log("✅ This is a PUBLIC order - anyone with the link can pay!");
    }

  } catch (error) {
    console.error("\n❌ Error querying order:", error.message);
    if (error.message.includes("Order not found")) {
      console.log("\n💡 This order may not exist on-chain yet, or the order ID is incorrect.");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

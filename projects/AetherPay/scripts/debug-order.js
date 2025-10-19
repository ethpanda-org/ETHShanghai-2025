const { ethers } = require("hardhat");

async function main() {
  // 从日志中看到的订单ID
  const orderIdString = "APEPO6AMY"; // 请替换为你实际的订单ID

  const PAYMENT_GATEWAY_V2 = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("🔍 Querying order:", orderIdString);
  console.log("📍 Contract:", PAYMENT_GATEWAY_V2);
  console.log("");

  try {
    // 查询订单详情
    const orderDetails = await gateway.getOrderDetailsByString(orderIdString);

    console.log("📦 Order Details:");
    console.log("================");
    console.log("Order ID (bytes32):", orderDetails[0]);
    console.log("Merchant:", orderDetails[1]);
    console.log("Designated Payer:", orderDetails[2]);
    console.log("Order Amount:", ethers.utils.formatUnits(orderDetails[3], 6), "tokens");
    console.log("Payment Token:", orderDetails[4]);
    console.log("Settlement Token:", orderDetails[5]);
    console.log("Paid Amount:", ethers.utils.formatUnits(orderDetails[6], 6), "tokens");
    console.log("Received Amount:", ethers.utils.formatUnits(orderDetails[7], 6), "tokens");
    console.log("Status:", orderDetails[8].toString());
    console.log("Created At:", new Date(orderDetails[9].toNumber() * 1000).toLocaleString());
    console.log("Expiry Time:", new Date(orderDetails[10].toNumber() * 1000).toLocaleString());
    console.log("Metadata URI:", orderDetails[11]);
    console.log("");

    // 检查 payer 是否是 address(0)
    const isPublicOrder = orderDetails[2] === ethers.constants.AddressZero;
    console.log("🔓 Is Public Order (anyone can pay)?", isPublicOrder);

    if (!isPublicOrder) {
      console.log("🔒 This is a DESIGNATED order - only this address can pay:", orderDetails[2]);
    }

    // 获取当前连接的账户
    const [signer] = await ethers.getSigners();
    const currentAddress = await signer.getAddress();
    console.log("👤 Your current wallet address:", currentAddress);

    if (!isPublicOrder) {
      const isCorrectPayer = orderDetails[2].toLowerCase() === currentAddress.toLowerCase();
      console.log("");
      if (isCorrectPayer) {
        console.log("✅ YOU ARE THE DESIGNATED PAYER - You can pay this order!");
      } else {
        console.log("❌ YOU ARE NOT THE DESIGNATED PAYER - You CANNOT pay this order!");
        console.log("   Required:", orderDetails[2]);
        console.log("   Your wallet:", currentAddress);
      }
    }

  } catch (error) {
    console.error("❌ Error querying order:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

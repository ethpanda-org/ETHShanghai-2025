const hre = require("hardhat");

/**
 * 检查订单的指定买家（designated payer）
 * 用于诊断 "Only designated payer can pay this order" 错误
 */
async function main() {
  console.log("\n=================================================");
  console.log("🔍 Checking Order Payer Information");
  console.log("=================================================\n");

  const PAYMENT_GATEWAY_V2 = "0x4995168D409767330D9693034d5cFfc7daFFb89B";
  
  // 从命令行参数获取订单ID，或使用默认值
  const orderIdString = process.argv[2] || "APL5DJAS7";
  
  console.log("📋 Order ID:", orderIdString);
  console.log("📋 Contract:", PAYMENT_GATEWAY_V2);
  console.log("");

  // 获取合约实例
  const PaymentGatewayV2 = await hre.ethers.getContractFactory("PaymentGatewayV2");
  const gateway = PaymentGatewayV2.attach(PAYMENT_GATEWAY_V2);

  try {
    // 获取订单详情
    const orderDetails = await gateway.getOrderDetailsByString(orderIdString);
    
    console.log("=== Order Details ===\n");
    console.log("Order ID (bytes32):", orderDetails[0]);
    console.log("Merchant:", orderDetails[1]);
    console.log("Designated Payer:", orderDetails[2]);
    console.log("Order Amount:", hre.ethers.formatUnits(orderDetails[3], 6), "USDC");
    console.log("Payment Token:", orderDetails[4]);
    console.log("Settlement Token:", orderDetails[5]);
    console.log("Paid Amount:", hre.ethers.formatUnits(orderDetails[6], 6), "USDC");
    console.log("Received Amount:", hre.ethers.formatUnits(orderDetails[7], 6), "USDT");
    console.log("Status:", orderDetails[8]);
    console.log("Created At:", new Date(Number(orderDetails[9]) * 1000).toLocaleString());
    console.log("Expiry Time:", new Date(Number(orderDetails[10]) * 1000).toLocaleString());
    console.log("Metadata URI:", orderDetails[11]);
    
    console.log("\n=== Analysis ===\n");
    
    const designatedPayer = orderDetails[2];
    const isPublicOrder = designatedPayer === "0x0000000000000000000000000000000000000000";
    
    if (isPublicOrder) {
      console.log("✅ This is a PUBLIC order");
      console.log("   Anyone can pay this order!");
      console.log("   The first person to pay will become the payer.");
    } else {
      console.log("⚠️  This is a PRIVATE order");
      console.log("   Only the designated payer can pay this order!");
      console.log("   Designated Payer:", designatedPayer);
      console.log("");
      console.log("💡 To pay this order, you must:");
      console.log("   1. Connect to MetaMask with the designated payer address");
      console.log("   2. Or ask the merchant to create a new PUBLIC order (designatedPayer = address(0))");
    }
    
    // 获取当前连接的账户
    const [currentAccount] = await hre.ethers.getSigners();
    console.log("\n=== Current Account ===\n");
    console.log("Your Address:", currentAccount.address);
    
    if (!isPublicOrder) {
      if (currentAccount.address.toLowerCase() === designatedPayer.toLowerCase()) {
        console.log("✅ You ARE the designated payer! You can pay this order.");
      } else {
        console.log("❌ You are NOT the designated payer! You CANNOT pay this order.");
        console.log("   Please switch to:", designatedPayer);
      }
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    
    if (error.message.includes("Order not found")) {
      console.log("\n💡 Possible reasons:");
      console.log("   1. The order ID is incorrect");
      console.log("   2. The order was created on a different network");
      console.log("   3. The order was created on a different contract");
    }
  }
  
  console.log("\n=================================================");
  console.log("✅ Check completed!");
  console.log("=================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


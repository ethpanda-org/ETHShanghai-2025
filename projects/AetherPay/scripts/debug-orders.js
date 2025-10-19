const { ethers } = require("hardhat");

async function main() {
  console.log("\n=================================================");
  console.log("🔍 Debugging Orders on PaymentGatewayV2");
  console.log("=================================================\n");

  const PAYMENT_GATEWAY_V2 = "0x4995168D409767330D9693034d5cFfc7daFFb89B";

  // 获取合约实例
  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
  const gateway = PaymentGatewayV2.attach(PAYMENT_GATEWAY_V2);

  console.log("📋 Contract Address:", PAYMENT_GATEWAY_V2);
  console.log("");

  // 1. 获取 OrderCreated 事件
  console.log("📡 Fetching OrderCreated events...\n");
  
  const filter = gateway.filters.OrderCreated();
  const events = await gateway.queryFilter(filter, 0, 'latest');

  console.log(`✅ Found ${events.length} OrderCreated events\n`);

  if (events.length === 0) {
    console.log("❌ No orders found!");
    console.log("\n💡 Possible reasons:");
    console.log("   1. No orders have been created yet");
    console.log("   2. Wrong contract address");
    console.log("   3. Network issue");
    return;
  }

  // 2. 显示每个订单的详情
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    console.log(`\n📦 Order ${i + 1}/${events.length}`);
    console.log("─".repeat(50));
    
    const { orderId, orderIdString, merchant, designatedPayer, orderAmount, paymentToken, settlementToken, metadataURI } = event.args;
    
    console.log("Order ID (bytes32):", orderId);
    console.log("Order ID (string):", orderIdString);
    console.log("Merchant:", merchant);
    console.log("Designated Payer:", designatedPayer);
    console.log("Amount:", ethers.utils.formatUnits(orderAmount, 6), "tokens");
    console.log("Payment Token:", paymentToken);
    console.log("Settlement Token:", settlementToken);
    console.log("Metadata URI:", metadataURI);
    console.log("Block Number:", event.blockNumber);
    console.log("Transaction Hash:", event.transactionHash);

    // 获取订单详情
    try {
      const orderInfo = await gateway.getOrder(orderId);
      console.log("\n📊 Order Details:");
      console.log("   Merchant:", orderInfo.merchant);
      console.log("   Payer:", orderInfo.payer);
      console.log("   Order Amount:", ethers.utils.formatUnits(orderInfo.orderAmount, 6));
      console.log("   Paid Amount:", ethers.utils.formatUnits(orderInfo.paidAmount, 6));
      console.log("   Payment Token:", orderInfo.paymentToken);
      console.log("   Status:", getStatusName(orderInfo.status));
      console.log("   Created At:", new Date(orderInfo.createdAt * 1000).toLocaleString());
      console.log("   Expiry Time:", new Date(orderInfo.expiryTime * 1000).toLocaleString());
      
      const now = Math.floor(Date.now() / 1000);
      const timeLeft = orderInfo.expiryTime - now;
      if (timeLeft > 0) {
        console.log("   Time Left:", Math.floor(timeLeft / 3600), "hours", Math.floor((timeLeft % 3600) / 60), "minutes");
      } else {
        console.log("   ⚠️  Order EXPIRED!");
      }

      // 检查是否是公开订单
      if (orderInfo.payer === ethers.constants.AddressZero) {
        console.log("   🌐 Public Order (anyone can pay)");
      } else {
        console.log("   🎯 Designated Order (only", orderInfo.payer, "can pay)");
      }

    } catch (error) {
      console.error("   ❌ Error fetching order details:", error.message);
    }
  }

  console.log("\n=================================================");
  console.log("🎉 Debug Complete!");
  console.log("=================================================\n");
}

function getStatusName(status) {
  const statuses = ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED'];
  return statuses[status] || 'UNKNOWN';
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


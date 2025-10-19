const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🛠️  BATCH ORDER CREATOR - 批量创建测试订单");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("💼 操作账户:", deployer.address);

  // Contract addresses
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";
  const FRONTEND_USER = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";

  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("📦 批量创建测试订单...");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const orders = [
    { amount: "5", type: "USDC_SMALL", payment: MOCK_USDC, settlement: MOCK_USDC },
    { amount: "50", type: "USDC_MEDIUM", payment: MOCK_USDC, settlement: MOCK_USDC },
    { amount: "100", type: "USDC_LARGE", payment: MOCK_USDC, settlement: MOCK_USDC },
    { amount: "10", type: "USDT_TEST", payment: MOCK_USDT, settlement: MOCK_USDT },
    { amount: "1", type: "PUBLIC", payment: MOCK_USDC, settlement: MOCK_USDC, payer: "0x0000000000000000000000000000000000000000" }
  ];

  const createdOrders = [];

  for (const order of orders) {
    try {
      const orderId = `${order.type}_${Date.now()}`;
      console.log(`  🔄 创建 ${order.type} (${order.amount} ${order.payment === MOCK_USDC ? "USDC" : "USDT"})...`);

      const tx = await gateway.createOrder(
        orderId,
        ethers.utils.parseUnits(order.amount, 6),
        order.payment,
        order.settlement,
        "",
        false,
        order.payer || FRONTEND_USER
      );

      console.log(`     📤 交易哈希: ${tx.hash}`);
      await tx.wait();

      createdOrders.push({ orderId, amount: order.amount, token: order.payment === MOCK_USDC ? "USDC" : "USDT" });
      console.log(`     ✅ 成功! 订单ID: ${orderId}\n`);

      // 短暂延迟避免 nonce 问题
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.log(`     ❌ 失败: ${error.message}\n`);
    }
  }

  console.log("======================================================================");
  console.log(`✅ 批量创建完成! 成功创建 ${createdOrders.length}/${orders.length} 个订单`);
  console.log("======================================================================\n");

  if (createdOrders.length > 0) {
    console.log("📋 创建的订单:");
    console.log("─────────────────────────────────────────────────────────────────────\n");

    for (const order of createdOrders) {
      console.log(`订单ID: ${order.orderId}`);
      console.log(`金额: ${order.amount} ${order.token}`);
      console.log(`支付链接: http://localhost:3000/pay/${order.orderId}`);
      console.log("");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 错误:", error);
    process.exit(1);
  });

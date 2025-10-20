const hre = require("hardhat");
const { ethers } = require("hardhat");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

async function main() {
  console.log("\n======================================================================");
  console.log("🛠️  EASY ORDER CREATOR - 轻松创建可支付订单");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("💼 操作账户:", deployer.address);

  // Contract addresses
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";
  const FRONTEND_USER = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";

  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  console.log("📋 选择订单类型:");
  console.log("─────────────────────────────────────────────────────────────────────\n");
  console.log("  1. USDC 支付 → USDC 结算 (最稳定 ✅)");
  console.log("  2. USDT 支付 → USDT 结算 (稳定 ✅)");
  console.log("  3. USDC 支付 → USDT 结算 (跨币种 ⚠️)");
  console.log("  4. USDT 支付 → USDC 结算 (跨币种 ⚠️)");
  console.log("  5. 公开订单 (任何人都可支付 🌐)");
  console.log("  6. 批量创建测试订单 (创建5个)");
  console.log("");

  const choice = await question("请输入选项 (1-6): ");

  let paymentToken, settlementToken, orderType, designatedPayer;

  switch(choice) {
    case "1":
      paymentToken = MOCK_USDC;
      settlementToken = MOCK_USDC;
      orderType = "USDC_TO_USDC";
      designatedPayer = FRONTEND_USER;
      break;
    case "2":
      paymentToken = MOCK_USDT;
      settlementToken = MOCK_USDT;
      orderType = "USDT_TO_USDT";
      designatedPayer = FRONTEND_USER;
      break;
    case "3":
      paymentToken = MOCK_USDC;
      settlementToken = MOCK_USDT;
      orderType = "USDC_TO_USDT";
      designatedPayer = FRONTEND_USER;
      break;
    case "4":
      paymentToken = MOCK_USDT;
      settlementToken = MOCK_USDC;
      orderType = "USDT_TO_USDC";
      designatedPayer = FRONTEND_USER;
      break;
    case "5":
      paymentToken = MOCK_USDC;
      settlementToken = MOCK_USDC;
      orderType = "PUBLIC_ORDER";
      designatedPayer = "0x0000000000000000000000000000000000000000";
      break;
    case "6":
      await createBatchOrders(gateway, MOCK_USDC, MOCK_USDT, FRONTEND_USER);
      rl.close();
      return;
    default:
      console.log("❌ 无效选项");
      rl.close();
      return;
  }

  const amountStr = await question("\n请输入金额 (默认: 10): ");
  const amount = amountStr ? parseFloat(amountStr) : 10;

  const customId = await question("\n自定义订单ID前缀 (可选，按回车跳过): ");
  const orderId = customId ?
    `${customId}_${Date.now()}` :
    `${orderType}_${Date.now()}`;

  console.log("\n📝 创建订单中...");
  console.log("─────────────────────────────────────────────────────────────────────");

  try {
    const tx = await gateway.createOrder(
      orderId,
      ethers.utils.parseUnits(amount.toString(), 6),
      paymentToken,
      settlementToken,
      "", // no metadata
      false, // no partial payment
      designatedPayer
    );

    console.log("📤 交易已发送:", tx.hash);
    const receipt = await tx.wait();

    console.log("\n======================================================================");
    console.log("✅ 订单创建成功!");
    console.log("======================================================================\n");

    console.log("📋 订单信息:");
    console.log("  订单ID:", orderId);
    console.log("  金额:", amount, paymentToken === MOCK_USDC ? "USDC" : "USDT");
    console.log("  类型:", orderType);
    console.log("  指定支付者:", designatedPayer === "0x0000000000000000000000000000000000000000" ? "任何人" : "前端用户");
    console.log("  区块:", receipt.blockNumber);

    console.log("\n🔗 支付链接:");
    console.log(`  http://localhost:3000/pay/${orderId}`);

    console.log("\n💡 提示:");
    if (paymentToken === settlementToken) {
      console.log("  ✅ 这是同币种订单，支付成功率高");
    } else {
      console.log("  ⚠️  这是跨币种订单，需要 FXRouter 有流动性");
    }

  } catch (error) {
    console.log("\n❌ 创建订单失败:", error.message);
  }

  rl.close();
}

async function createBatchOrders(gateway, MOCK_USDC, MOCK_USDT, FRONTEND_USER) {
  console.log("\n📦 批量创建测试订单...");
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
      const tx = await gateway.createOrder(
        orderId,
        ethers.utils.parseUnits(order.amount, 6),
        order.payment,
        order.settlement,
        "",
        false,
        order.payer || FRONTEND_USER
      );
      await tx.wait();

      createdOrders.push(orderId);
      console.log(`  ✅ ${order.type} (${order.amount} ${order.payment === MOCK_USDC ? "USDC" : "USDT"}): ${orderId}`);

      // 短暂延迟避免 nonce 问题
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.log(`  ❌ ${order.type} 失败: ${error.message}`);
    }
  }

  console.log("\n📋 创建完成! 支付链接:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  for (const orderId of createdOrders) {
    console.log(`http://localhost:3000/pay/${orderId}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
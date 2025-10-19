const { ethers } = require("hardhat");

/**
 * 🤖 Keeper脚本：自动标记过期订单
 *
 * 功能：
 * 1. 扫描所有商家的PENDING订单
 * 2. 检查创建时间超过24小时的订单
 * 3. 自动标记为CANCELLED（作为EXPIRED处理）
 *
 * 运行方式：
 * - 手动运行：npx hardhat run scripts/expire-old-orders.js --network optimism-sepolia
 * - 定时任务：使用cron每小时运行一次
 */

const PAYMENT_GATEWAY_ADDRESS = "0x26Fea37ec7D0Fe6858C9209044F715b549bAD343"; // 当前使用的旧合约
const EXPIRY_HOURS = 24; // 24小时过期

async function main() {
  console.log("\n🤖 Starting Expired Orders Keeper...\n");

  const [keeper] = await ethers.getSigners();
  console.log("Keeper address:", keeper.address);

  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
  const gateway = PaymentGatewayV2.attach(PAYMENT_GATEWAY_ADDRESS);

  // 获取所有注册商家（这里需要遍历事件或维护商家列表）
  // 简化版：我们从OrderCreated事件中提取商家地址
  const filter = gateway.filters.OrderCreated();
  const events = await gateway.queryFilter(filter, -10000); // 最近10000个区块

  // 提取唯一商家地址
  const merchantsSet = new Set();
  events.forEach(event => {
    merchantsSet.add(event.args.merchant);
  });

  const merchants = Array.from(merchantsSet);
  console.log(`Found ${merchants.length} unique merchants\n`);

  let totalExpired = 0;

  // 遍历每个商家的PENDING订单
  for (const merchant of merchants) {
    console.log(`Checking merchant: ${merchant}`);

    try {
      // 获取PENDING状态的订单
      const pendingOrderIds = await gateway.getMerchantOrdersByStatus(merchant, 0); // 0 = PENDING

      if (pendingOrderIds.length === 0) {
        console.log("  No pending orders\n");
        continue;
      }

      console.log(`  Found ${pendingOrderIds.length} pending orders`);

      // 检查每个订单是否过期
      for (const orderId of pendingOrderIds) {
        const order = await gateway.getOrder(orderId);
        const createdAt = order.createdAt.toNumber();
        const now = Math.floor(Date.now() / 1000);
        const ageHours = (now - createdAt) / 3600;

        if (ageHours > EXPIRY_HOURS) {
          console.log(`  ⌛ Order ${orderId.slice(0, 10)}... is expired (${ageHours.toFixed(1)}h old)`);

          try {
            // 尝试取消订单（需要owner权限或商家权限）
            const tx = await gateway.cancelOrder(orderId);
            await tx.wait();

            console.log(`  ✅ Marked as cancelled: ${tx.hash}\n`);
            totalExpired++;
          } catch (error) {
            console.log(`  ❌ Failed to cancel: ${error.message}\n`);
          }
        }
      }
    } catch (error) {
      console.log(`  ❌ Error checking merchant: ${error.message}\n`);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Keeper finished: ${totalExpired} orders marked as expired`);
  console.log("=".repeat(50) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Keeper error:", error);
    process.exit(1);
  });

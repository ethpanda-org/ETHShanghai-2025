const hre = require("hardhat");
const { ethers } = require("hardhat");

async function main() {
  console.log("\n======================================================================");
  console.log("🧪 TESTING ALL ORDER TYPES");
  console.log("======================================================================\n");

  const [deployer] = await ethers.getSigners();
  console.log("💼 Deployer:", deployer.address);

  // Contract addresses
  const PAYMENT_GATEWAY_V2 = "0xdd0F17F87F60A39ab6004160cc2b503b24a518F8";
  const FX_ROUTER = "0xC2ab12Baf3735864528F890B809Ffe2f1cf2f8d1";
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";
  const FRONTEND_USER = "0x99f8C4e03181022125CAB1A9929Ab44027AD276a";

  // Get contracts
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);

  const ERC20_ABI = [
    "function balanceOf(address account) view returns (uint256)",
    "function symbol() view returns (string)"
  ];

  const usdc = new ethers.Contract(MOCK_USDC, ERC20_ABI, deployer);
  const usdt = new ethers.Contract(MOCK_USDT, ERC20_ABI, deployer);

  console.log("📊 Current System Status");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // Check FXRouter liquidity
  const routerUSDCBalance = await usdc.balanceOf(FX_ROUTER);
  const routerUSDTBalance = await usdt.balanceOf(FX_ROUTER);

  console.log("🏦 FXRouter Liquidity:");
  console.log("  USDC:", ethers.utils.formatUnits(routerUSDCBalance, 6));
  console.log("  USDT:", ethers.utils.formatUnits(routerUSDTBalance, 6));

  // Check frontend user balance
  const userUSDCBalance = await usdc.balanceOf(FRONTEND_USER);
  const userUSDTBalance = await usdt.balanceOf(FRONTEND_USER);

  console.log("\n👤 Frontend User Balances:");
  console.log("  USDC:", ethers.utils.formatUnits(userUSDCBalance, 6));
  console.log("  USDT:", ethers.utils.formatUnits(userUSDTBalance, 6));

  console.log("\n📊 Creating Test Orders");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const orders = [];

  // Test Case 1: USDC → USDC (同币种)
  console.log("1️⃣ Creating USDC → USDC order (Same Currency)...");
  try {
    const orderId1 = `USDC_USDC_${Date.now()}`;
    const tx1 = await gateway.createOrder(
      orderId1,
      ethers.utils.parseUnits("10", 6), // 10 USDC
      MOCK_USDC, // payment token
      MOCK_USDC, // settlement token (same)
      "", // no metadata
      false, // no partial payment
      FRONTEND_USER // designated payer
    );
    await tx1.wait();
    orders.push({ id: orderId1, type: "USDC → USDC", status: "✅ Created" });
    console.log("   ✅ Success! Order ID:", orderId1);
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }

  // Test Case 2: USDT → USDT (同币种)
  console.log("\n2️⃣ Creating USDT → USDT order (Same Currency)...");
  try {
    const orderId2 = `USDT_USDT_${Date.now()}`;
    const tx2 = await gateway.createOrder(
      orderId2,
      ethers.utils.parseUnits("10", 6), // 10 USDT
      MOCK_USDT, // payment token
      MOCK_USDT, // settlement token (same)
      "", // no metadata
      false, // no partial payment
      FRONTEND_USER // designated payer
    );
    await tx2.wait();
    orders.push({ id: orderId2, type: "USDT → USDT", status: "✅ Created" });
    console.log("   ✅ Success! Order ID:", orderId2);
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }

  // Test Case 3: USDC → USDT (跨币种)
  console.log("\n3️⃣ Creating USDC → USDT order (Cross Currency)...");
  try {
    const orderId3 = `USDC_USDT_${Date.now()}`;
    const tx3 = await gateway.createOrder(
      orderId3,
      ethers.utils.parseUnits("15", 6), // 15 USDC
      MOCK_USDC, // payment token
      MOCK_USDT, // settlement token (different)
      "", // no metadata
      false, // no partial payment
      FRONTEND_USER // designated payer
    );
    await tx3.wait();
    orders.push({ id: orderId3, type: "USDC → USDT", status: "✅ Created" });
    console.log("   ✅ Success! Order ID:", orderId3);
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }

  // Test Case 4: USDT → USDC (跨币种反向)
  console.log("\n4️⃣ Creating USDT → USDC order (Cross Currency Reverse)...");
  try {
    const orderId4 = `USDT_USDC_${Date.now()}`;
    const tx4 = await gateway.createOrder(
      orderId4,
      ethers.utils.parseUnits("20", 6), // 20 USDT
      MOCK_USDT, // payment token
      MOCK_USDC, // settlement token (different)
      "", // no metadata
      false, // no partial payment
      FRONTEND_USER // designated payer
    );
    await tx4.wait();
    orders.push({ id: orderId4, type: "USDT → USDC", status: "✅ Created" });
    console.log("   ✅ Success! Order ID:", orderId4);
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }

  // Test Case 5: 任何人都可以支付的订单
  console.log("\n5️⃣ Creating order that ANYONE can pay (no designated payer)...");
  try {
    const orderId5 = `PUBLIC_${Date.now()}`;
    const tx5 = await gateway.createOrder(
      orderId5,
      ethers.utils.parseUnits("5", 6), // 5 USDC
      MOCK_USDC, // payment token
      MOCK_USDC, // settlement token (same)
      "", // no metadata
      false, // no partial payment
      "0x0000000000000000000000000000000000000000" // NO designated payer (anyone can pay)
    );
    await tx5.wait();
    orders.push({ id: orderId5, type: "USDC → USDC (Public)", status: "✅ Created" });
    console.log("   ✅ Success! Order ID:", orderId5);
  } catch (error) {
    console.log("   ❌ Failed:", error.message);
  }

  console.log("\n======================================================================");
  console.log("📋 TEST RESULTS SUMMARY");
  console.log("======================================================================\n");

  console.log("Created Orders:");
  for (const order of orders) {
    console.log(`  ${order.status} ${order.type}: ${order.id}`);
  }

  console.log("\n🔍 Payment Capability Analysis:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  console.log("✅ WILL SUCCEED (能成功的订单类型):");
  console.log("  1. USDC → USDC (同币种，无需交换)");
  console.log("  2. USDT → USDT (同币种，无需交换)");
  console.log("  3. Public orders (任何人都能支付的订单)");

  console.log("\n⚠️  MAY SUCCEED (可能成功的订单类型):");
  console.log("  1. USDC → USDT (需要 FXRouter 有流动性)");
  console.log("  2. USDT → USDC (需要 FXRouter 有流动性)");
  console.log("     当前流动性: USDC=" + ethers.utils.formatUnits(routerUSDCBalance, 6) +
              ", USDT=" + ethers.utils.formatUnits(routerUSDTBalance, 6));

  console.log("\n❌ WILL FAIL (会失败的情况):");
  console.log("  1. 余额不足 (用户 USDC < 订单金额)");
  console.log("  2. 未授权 (需要先 Approve)");
  console.log("  3. 指定买家不匹配 (连接的钱包地址不对)");
  console.log("  4. FXRouter 流动性耗尽 (跨币种交换)");

  console.log("\n💡 RECOMMENDATIONS (建议):");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  console.log("1. 🎯 最稳定的配置:");
  console.log("   - 使用同币种订单 (USDC → USDC 或 USDT → USDT)");
  console.log("   - 确保用户有足够的代币余额");
  console.log("   - 确保已授权 (MAX allowance)");

  console.log("\n2. 🔧 跨币种支付需要:");
  console.log("   - FXRouter 有充足流动性");
  console.log("   - 正确的汇率设置");
  console.log("   - swap 功能正常工作");

  console.log("\n3. 📝 创建订单时注意:");
  console.log("   - designatedPayer: 使用前端用户地址或 0x0 (公开)");
  console.log("   - 避免过期时间太短");
  console.log("   - 金额不要超过用户余额");

  console.log("\n🔗 Test Payment URLs:");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  for (const order of orders) {
    console.log(`${order.type}:`);
    console.log(`  http://localhost:3000/pay/${order.id}`);
  }

  console.log("\n======================================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
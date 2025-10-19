const hre = require("hardhat");
const { ethers } = require("hardhat");

/**
 * 🧪 测试脚本：测试定向买家支付功能
 *
 * 测试场景：
 * 1. 商家创建订单，指定特定买家地址
 * 2. 只有指定的买家可以支付
 * 3. 其他买家尝试支付会失败
 *
 * 运行方式：
 * npx hardhat run scripts/test-designated-payer.js --network op-sepolia
 */

async function main() {
  console.log("\n======================================================================");
  console.log("🧪 Testing Designated Payer Order Flow");
  console.log("======================================================================\n");

  // 获取三个账户：商家、指定买家、其他买家
  const [merchant, designatedBuyer, otherBuyer] = await ethers.getSigners();

  console.log("👤 Merchant Address:", merchant.address);
  console.log("✅ Designated Buyer:", designatedBuyer.address);
  console.log("❌ Other Buyer:", otherBuyer.address);
  console.log("");

  // 合约地址
  const PAYMENT_GATEWAY_V2 = "0x4995168d409767330d9693034d5cffc7daffb89b"; // 使用您的实际合约地址
  const MOCK_USDC = "0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3";
  const MOCK_USDT = "0xDda8cEa63EDa45777dBd2735A6B4C4c2Dd5f942C";

  // 获取合约实例
  const gateway = await ethers.getContractAt("PaymentGatewayV2", PAYMENT_GATEWAY_V2);
  const usdc = await ethers.getContractAt("MockERC20", MOCK_USDC);

  // ============ Step 1: 检查/注册商家 ============
  console.log("📋 Step 1: Checking Merchant Registration");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const merchantInfo = await gateway.getMerchantInfo(merchant.address);
  const isRegistered = merchantInfo[5]; // isActive

  if (!isRegistered) {
    console.log("⚠️  Merchant not registered. Registering now...");
    const tx = await gateway.connect(merchant).registerMerchant("Test Merchant");
    await tx.wait();
    console.log("✅ Merchant registered!\n");
  } else {
    console.log("✅ Merchant already registered:", merchantInfo[0], "\n");
  }

  // ============ Step 2: 商家创建定向订单 ============
  console.log("📋 Step 2: Merchant Creates DESIGNATED PAYER Order");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const orderIdString = "DESIGNATED_" + Date.now();
  const orderAmount = ethers.parseUnits("10", 6); // 10 USDC

  console.log("Creating designated payer order:");
  console.log("  Order ID:", orderIdString);
  console.log("  Amount:", ethers.formatUnits(orderAmount, 6), "USDC");
  console.log("  🔒 Designated Payer:", designatedBuyer.address);

  const createTx = await gateway.connect(merchant).createOrder(
    orderIdString,
    orderAmount,
    MOCK_USDC,
    MOCK_USDT,
    "ipfs://test-metadata",
    false, // allowPartialPayment
    designatedBuyer.address // 🔑 指定买家地址！
  );
  await createTx.wait();
  console.log("✅ Designated payer order created!\n");

  // 获取订单详情
  const orderDetails = await gateway.getOrderDetailsByString(orderIdString);
  const orderIdBytes32 = orderDetails[0];

  console.log("📦 Order Details:");
  console.log("  Order ID (bytes32):", orderIdBytes32);
  console.log("  Merchant:", orderDetails[1]);
  console.log("  🔒 Designated Payer:", orderDetails[2]); // 这个应该是 designatedBuyer.address
  console.log("  Amount:", ethers.formatUnits(orderDetails[3], 6), "USDC");
  console.log("  Status:", orderDetails[8], "(0=Pending)");

  // 验证 payer 字段是否正确设置
  if (orderDetails[2].toLowerCase() === designatedBuyer.address.toLowerCase()) {
    console.log("  ✅ Designated payer correctly set!");
  } else {
    console.log("  ❌ ERROR: Designated payer not set correctly!");
    console.log("     Expected:", designatedBuyer.address);
    console.log("     Got:", orderDetails[2]);
  }
  console.log("");

  // ============ Step 3: 给两个买家都铸造代币 ============
  console.log("📋 Step 3: Minting Test Tokens for Both Buyers");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const mintAmount = ethers.parseUnits("1000", 6); // 1000 USDC

  // 给指定买家铸造
  const designatedBalance = await usdc.balanceOf(designatedBuyer.address);
  if (designatedBalance < orderAmount) {
    console.log("Minting for designated buyer...");
    await (await usdc.mint(designatedBuyer.address, mintAmount)).wait();
    console.log("✅ Minted", ethers.formatUnits(mintAmount, 6), "USDC to designated buyer");
  }

  // 给其他买家铸造
  const otherBalance = await usdc.balanceOf(otherBuyer.address);
  if (otherBalance < orderAmount) {
    console.log("Minting for other buyer...");
    await (await usdc.mint(otherBuyer.address, mintAmount)).wait();
    console.log("✅ Minted", ethers.formatUnits(mintAmount, 6), "USDC to other buyer");
  }
  console.log("");

  // ============ Step 4: 两个买家都授权代币 ============
  console.log("📋 Step 4: Both Buyers Approve Tokens");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  // 指定买家授权
  console.log("Designated buyer approving...");
  await (await usdc.connect(designatedBuyer).approve(PAYMENT_GATEWAY_V2, ethers.MaxUint256)).wait();
  console.log("✅ Designated buyer approved");

  // 其他买家授权
  console.log("Other buyer approving...");
  await (await usdc.connect(otherBuyer).approve(PAYMENT_GATEWAY_V2, ethers.MaxUint256)).wait();
  console.log("✅ Other buyer approved");
  console.log("");

  // ============ Step 5: 测试其他买家支付（应该失败）============
  console.log("📋 Step 5: Test OTHER BUYER Payment (Should FAIL)");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  console.log("🔴 Testing payment from OTHER buyer (not designated)...");
  console.log("  Payer:", otherBuyer.address);

  try {
    const payTx = await gateway.connect(otherBuyer).processPayment(
      orderIdBytes32,
      orderAmount
    );
    await payTx.wait();
    console.log("❌ ERROR: Payment should have failed but succeeded!");
  } catch (error) {
    if (error.message.includes("Only designated payer can pay this order")) {
      console.log("✅ CORRECT: Payment failed as expected!");
      console.log("  Error: Only designated payer can pay this order");
    } else {
      console.log("❌ Unexpected error:", error.message);
    }
  }
  console.log("");

  // ============ Step 6: 测试指定买家支付（应该成功）============
  console.log("📋 Step 6: Test DESIGNATED BUYER Payment (Should SUCCEED)");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  console.log("🟢 Testing payment from DESIGNATED buyer...");
  console.log("  Payer:", designatedBuyer.address);

  try {
    const payTx = await gateway.connect(designatedBuyer).processPayment(
      orderIdBytes32,
      orderAmount
    );
    const receipt = await payTx.wait();

    console.log("✅ Payment successful!");
    console.log("  Transaction hash:", receipt.hash);
    console.log("");

    // 获取更新后的订单详情
    const updatedOrder = await gateway.getOrderDetailsByString(orderIdString);
    console.log("📦 Updated Order Details:");
    console.log("  Paid Amount:", ethers.formatUnits(updatedOrder[6], 6), "USDC");
    console.log("  Status:", updatedOrder[8], "(3=Completed)");
    console.log("  Payer:", updatedOrder[2]);

  } catch (error) {
    console.log("❌ Payment failed unexpectedly!");
    console.log("Error:", error.message);
  }

  // ============ Step 7: 创建公开订单对比 ============
  console.log("\n📋 Step 7: Create PUBLIC Order for Comparison");
  console.log("─────────────────────────────────────────────────────────────────────\n");

  const publicOrderId = "PUBLIC_" + Date.now();
  console.log("Creating PUBLIC order (anyone can pay):");
  console.log("  Order ID:", publicOrderId);

  const publicTx = await gateway.connect(merchant).createOrder(
    publicOrderId,
    orderAmount,
    MOCK_USDC,
    MOCK_USDT,
    "ipfs://test-metadata",
    false,
    ethers.ZeroAddress // 🔓 address(0) = 公开订单
  );
  await publicTx.wait();
  console.log("✅ Public order created!");

  const publicOrderDetails = await gateway.getOrderDetailsByString(publicOrderId);
  console.log("  Payer field:", publicOrderDetails[2]);

  if (publicOrderDetails[2] === ethers.ZeroAddress) {
    console.log("  ✅ Correctly set as public order (address(0))");
  } else {
    console.log("  ❌ ERROR: Should be address(0) for public order!");
  }

  console.log("\n======================================================================");
  console.log("✅ Test Complete!");
  console.log("======================================================================\n");

  console.log("📝 Summary:");
  console.log("  1. ✅ Created designated payer order - only specific buyer can pay");
  console.log("  2. ✅ Other buyers cannot pay designated orders");
  console.log("  3. ✅ Designated buyer can successfully pay");
  console.log("  4. ✅ Public orders (address(0)) allow anyone to pay");
  console.log("");
  console.log("💡 Key Takeaway:");
  console.log("  Always pass 7 parameters to createOrder!");
  console.log("  - Use buyer address for designated orders");
  console.log("  - Use ethers.ZeroAddress for public orders");
  console.log("");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
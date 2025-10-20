// 授权 PaymentGatewayV2 到 PublicGoodsFund
const hre = require("hardhat");

async function main() {
  console.log("🔓 授权 PaymentGatewayV2 到 PublicGoodsFund...\n");

  const [deployer] = await ethers.getSigners();
  console.log("操作账户:", deployer.address);

  // 合约地址
  const PAYMENT_GATEWAY_V2 = "0xAb30d4810D7240D56Ac5d1c18FC1524b5140C5e4";
  const PUBLIC_GOODS_FUND = "0x1f0a6886983D8C3B8A862433AD093F410DA31E52";

  // 连接到 PublicGoodsFund
  const publicGoodsFund = await ethers.getContractAt(
    "contracts/PublicGoodsFund.sol:PublicGoodsFund",
    PUBLIC_GOODS_FUND
  );

  console.log("📝 添加 PaymentGatewayV2 为授权网关...");

  try {
    const tx = await publicGoodsFund.addAuthorizedGateway(PAYMENT_GATEWAY_V2);
    await tx.wait();
    console.log("  ✅ 授权成功!");
  } catch (error) {
    if (error.message.includes("Already authorized")) {
      console.log("  ℹ️ 已经授权过了");
    } else {
      console.error("  ❌ 授权失败:", error.message);
      throw error;
    }
  }

  // 验证授权状态
  console.log("\n🔍 验证授权状态...");

  // 检查授权列表
  const gateways = await publicGoodsFund.getAuthorizedGateways();
  console.log("  授权的网关列表:", gateways);

  const isAuthorized = gateways.includes(PAYMENT_GATEWAY_V2);
  if (isAuthorized) {
    console.log("  ✅ PaymentGatewayV2 已成功授权!");
  } else {
    console.log("  ❌ 授权验证失败");
  }

  // 创建测试订单来验证
  console.log("\n🧪 创建测试订单验证捐款功能...");

  const paymentGateway = await ethers.getContractAt(
    "PaymentGatewayV2",
    PAYMENT_GATEWAY_V2
  );

  const MockUSDC = await ethers.getContractAt(
    "MockERC20",
    "0xb7225051e57db0296C1F56fbD536Acd06c889724"
  );

  // 检查初始状态
  const initialDonations = await publicGoodsFund.totalLifetimeDonations();
  const initialContributors = await publicGoodsFund.getTotalContributors();

  console.log("  初始捐款总额:", ethers.utils.formatUnits(initialDonations, 6), "USDC");
  console.log("  初始贡献者数:", initialContributors.toString());

  // 创建同币种订单
  const orderId = "AUTH_TEST_" + Date.now();
  const orderAmount = ethers.utils.parseUnits("10", 6);

  // 创建订单
  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    MockUSDC.address,
    MockUSDC.address, // 同币种
    "ipfs://test",
    false,
    ethers.constants.AddressZero
  );
  await createTx.wait();
  console.log("  ✅ 订单创建成功:", orderId);

  // 获取订单 bytes32
  const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);

  // 授权并支付
  await MockUSDC.mint(deployer.address, orderAmount);
  await MockUSDC.approve(PAYMENT_GATEWAY_V2, orderAmount);

  console.log("  💳 执行支付...");
  const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
  const receipt = await payTx.wait();
  console.log("  ✅ 支付成功!");

  // 分析事件
  for (const event of receipt.events || []) {
    if (event.event === "DonationProcessed") {
      console.log("  🎁 捐款事件:");
      console.log("    接收方:", event.args.recipient);
      console.log("    金额:", ethers.utils.formatUnits(event.args.amount, 6), "USDC");
    }
  }

  // 检查最终状态
  const finalDonations = await publicGoodsFund.totalLifetimeDonations();
  const finalContributors = await publicGoodsFund.getTotalContributors();

  console.log("\n📊 最终状态:");
  console.log("  总捐款额:", ethers.utils.formatUnits(finalDonations, 6), "USDC");
  console.log("  贡献者数:", finalContributors.toString());

  if (finalDonations.gt(initialDonations)) {
    const increased = finalDonations.sub(initialDonations);
    console.log("\n✅ 捐款功能正常工作!");
    console.log("  本次增加:", ethers.utils.formatUnits(increased, 6), "USDC");
  } else {
    console.log("\n⚠️ 警告: 捐款金额没有增加");
    console.log("  可能原因:");
    console.log("  1. PublicGoodsFund 合约需要更新");
    console.log("  2. PaymentGatewayV2 的 _processDonation 函数需要调整");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
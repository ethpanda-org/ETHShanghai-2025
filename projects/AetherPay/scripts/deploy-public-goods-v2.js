// 部署 PublicGoodsFundV2 并更新 PaymentGatewayV2
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 部署 PublicGoodsFundV2 修复版本...\n");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("账户余额:", ethers.utils.formatEther(balance), "ETH\n");

  // ============ 步骤 1: 部署新的 PublicGoodsFundV2 ============
  console.log("📦 步骤 1: 部署 PublicGoodsFundV2...");

  const PublicGoodsFundV2 = await ethers.getContractFactory("PublicGoodsFundV2");
  const publicGoodsFundV2 = await PublicGoodsFundV2.deploy();
  await publicGoodsFundV2.deployed();

  const PUBLIC_GOODS_FUND_V2 = publicGoodsFundV2.address;
  console.log("  ✅ PublicGoodsFundV2 部署到:", PUBLIC_GOODS_FUND_V2);

  // ============ 步骤 2: 配置 PublicGoodsFundV2 ============
  console.log("\n📦 步骤 2: 配置 PublicGoodsFundV2...");

  // 添加支持的代币
  const MOCK_USDC = "0xb7225051e57db0296C1F56fbD536Acd06c889724";
  const MOCK_USDT = "0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2";

  await publicGoodsFundV2.addSupportedToken(MOCK_USDC);
  await publicGoodsFundV2.addSupportedToken(MOCK_USDT);
  console.log("  ✓ 支持的代币已添加");

  // 授权 PaymentGatewayV2（使用正确的地址）
  const PAYMENT_GATEWAY_V2 = "0x16e25554Ac0076b33910659Cddff3F1D20735900";
  await publicGoodsFundV2.addAuthorizedGateway(PAYMENT_GATEWAY_V2);
  console.log("  ✓ PaymentGatewayV2 已授权");

  // ============ 步骤 3: 更新 PaymentGatewayV2 ============
  console.log("\n📦 步骤 3: 更新 PaymentGatewayV2 的 PublicGoodsFund 地址...");

  const paymentGateway = await ethers.getContractAt(
    "PaymentGatewayV2",
    PAYMENT_GATEWAY_V2
  );

  // 更新 PublicGoodsFund 地址（使用正确的函数名）
  const updateTx = await paymentGateway.setPublicGoodsFund(PUBLIC_GOODS_FUND_V2);
  await updateTx.wait();
  console.log("  ✅ PublicGoodsFund 地址已更新");

  // 验证更新
  const currentFund = await paymentGateway.publicGoodsFund();
  console.log("  验证: PaymentGatewayV2.publicGoodsFund =", currentFund);

  // ============ 步骤 4: 创建测试订单 ============
  console.log("\n🧪 步骤 4: 测试捐款功能...");

  // 检查初始状态
  const initialDonations = await publicGoodsFundV2.totalLifetimeDonations();
  const initialContributors = await publicGoodsFundV2.getTotalContributors();

  console.log("  初始状态:");
  console.log("    总捐款额:", ethers.utils.formatUnits(initialDonations, 6), "USDC");
  console.log("    贡献者数:", initialContributors.toString());

  // 创建同币种测试订单
  const orderId = "V2_TEST_" + Date.now();
  const orderAmount = ethers.utils.parseUnits("20", 6); // 20 USDC

  console.log("\n  📝 创建测试订单...");
  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    MOCK_USDC,
    MOCK_USDC, // 同币种
    "ipfs://test",
    false,
    ethers.constants.AddressZero
  );
  await createTx.wait();
  console.log("    ✓ 订单创建成功:", orderId);

  // 获取订单 bytes32
  const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);

  // Mint 并授权 USDC
  const MockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC);
  await MockUSDC.mint(deployer.address, orderAmount);
  await MockUSDC.approve(PAYMENT_GATEWAY_V2, orderAmount);
  console.log("    ✓ USDC 授权完成");

  // 执行支付
  console.log("\n  💳 执行支付...");
  const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
  const receipt = await payTx.wait();
  console.log("    ✓ 支付成功!");

  // 检查事件
  let donationAmount = 0;
  for (const event of receipt.events || []) {
    if (event.event === "DonationProcessed") {
      console.log("  🎁 捐款事件:");
      console.log("    接收方:", event.args.recipient);
      console.log("    金额:", ethers.utils.formatUnits(event.args.amount, 6), "USDC");
      donationAmount = event.args.amount;
    }
  }

  // 等待一下让链上状态更新
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 检查最终状态
  const finalDonations = await publicGoodsFundV2.totalLifetimeDonations();
  const finalContributors = await publicGoodsFundV2.getTotalContributors();

  console.log("\n📊 最终状态:");
  console.log("  总捐款额:", ethers.utils.formatUnits(finalDonations, 6), "USDC");
  console.log("  贡献者数:", finalContributors.toString());

  if (finalDonations.gt(initialDonations)) {
    const increased = finalDonations.sub(initialDonations);
    console.log("\n✅ 捐款功能正常工作!");
    console.log("  本次增加:", ethers.utils.formatUnits(increased, 6), "USDC");
    console.log("  预期捐款:", ethers.utils.formatUnits(donationAmount, 6), "USDC");

    // 检查贡献者信息
    const contributorInfo = await publicGoodsFundV2.getContributorInfo(deployer.address);
    console.log("\n👤 贡献者信息:");
    console.log("  地址:", deployer.address);
    console.log("  总贡献:", ethers.utils.formatUnits(contributorInfo.totalContributed, 6), "USDC");
    console.log("  等级:", contributorInfo.level);
  } else {
    console.log("\n⚠️ 警告: 捐款金额没有增加");
    console.log("  可能需要检查 PaymentGatewayV2 的 _processDonation 函数");
  }

  // ============ 步骤 5: 更新配置文件 ============
  console.log("\n💾 更新配置文件...");

  const deploymentPath = path.join(__dirname, "../deployment-gateway-v2-public-goods.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  deployment.contracts.PublicGoodsFundV2 = PUBLIC_GOODS_FUND_V2;
  deployment.contracts.PublicGoodsFundV1 = deployment.contracts.PublicGoodsFund; // 保留旧地址
  deployment.contracts.PublicGoodsFund = PUBLIC_GOODS_FUND_V2; // 更新为新地址
  deployment.lastUpdated = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("  ✅ 配置文件已更新");

  // ============ 步骤 6: 更新前端配置 ============
  console.log("\n📝 更新前端配置...");

  const frontendConfigPath = path.join(__dirname, "../frontend/lib/contracts.ts");
  let frontendConfig = fs.readFileSync(frontendConfigPath, "utf8");

  // 更新 PublicGoodsFund 地址
  frontendConfig = frontendConfig.replace(
    /PUBLIC_GOODS_FUND:\s*['"][^'"]+['"]/,
    `PUBLIC_GOODS_FUND: '${PUBLIC_GOODS_FUND_V2}'`
  );

  fs.writeFileSync(frontendConfigPath, frontendConfig);
  console.log("  ✅ 前端配置已更新");

  // ============ 完成 ============
  console.log("\n✅ PublicGoodsFundV2 部署并集成完成！\n");
  console.log("📋 合约地址:");
  console.log("=====================================");
  console.log("PublicGoodsFundV2 (新):", PUBLIC_GOODS_FUND_V2);
  console.log("PaymentGatewayV2:", PAYMENT_GATEWAY_V2);
  console.log("=====================================");
  console.log("\n✨ 捐款功能状态:");
  console.log("  总捐款:", ethers.utils.formatUnits(finalDonations, 6), "USDC");
  console.log("  贡献者:", finalContributors.toString(), "人");
  console.log("\n下一步:");
  console.log("1. 重启前端查看更新的数据");
  console.log("2. 创建新订单测试捐款功能");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
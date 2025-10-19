// 修复 Public Goods Fund 集成的部署脚本
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 修复 PublicGoodsFund 捐款功能...\n");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  // 读取现有部署配置
  const deploymentPath = path.join(__dirname, "../deployment-gateway-v2-public-goods.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  const PaymentGatewayV2Address = deployment.contracts.PaymentGatewayV2;
  const PublicGoodsFundAddress = deployment.contracts.PublicGoodsFund;

  console.log("📝 当前合约地址:");
  console.log("  PaymentGatewayV2:", PaymentGatewayV2Address);
  console.log("  PublicGoodsFund:", PublicGoodsFundAddress);

  // 步骤 1: 部署修复版的 PublicGoodsFund（如果需要）
  const needNewPublicGoodsFund = true; // 设为 true 以部署新版本

  let newPublicGoodsFundAddress = PublicGoodsFundAddress;

  if (needNewPublicGoodsFund) {
    console.log("\n📦 部署新的 PublicGoodsFund 合约...");

    // 部署修复版 PublicGoodsFund
    const PublicGoodsFund = await ethers.getContractFactory("PublicGoodsFund");
    const publicGoodsFund = await PublicGoodsFund.deploy();
    await publicGoodsFund.deployed();

    newPublicGoodsFundAddress = publicGoodsFund.address;
    console.log("✅ 新 PublicGoodsFund 部署到:", newPublicGoodsFundAddress);

    // 配置 PublicGoodsFund
    console.log("\n🔧 配置 PublicGoodsFund...");

    // 1. 添加 PaymentGatewayV2 为授权网关
    await publicGoodsFund.addAuthorizedGateway(PaymentGatewayV2Address);
    console.log("  ✓ PaymentGatewayV2 已授权");

    // 2. 添加支持的代币
    const MOCK_USDC = deployment.contracts.MockUSDC;
    const MOCK_USDT = deployment.contracts.MockUSDT;

    await publicGoodsFund.addSupportedToken(MOCK_USDC);
    await publicGoodsFund.addSupportedToken(MOCK_USDT);
    console.log("  ✓ 支持的代币已添加");
  }

  // 步骤 2: 更新 PaymentGatewayV2 的 PublicGoodsFund 地址
  console.log("\n🔄 更新 PaymentGatewayV2 配置...");

  const PaymentGatewayV2 = await ethers.getContractAt(
    "PaymentGatewayV2",
    PaymentGatewayV2Address
  );

  // 设置新的 PublicGoodsFund 地址
  const currentPublicGoodsFund = await PaymentGatewayV2.publicGoodsFund();
  console.log("  当前 PublicGoodsFund:", currentPublicGoodsFund);

  if (currentPublicGoodsFund.toLowerCase() !== newPublicGoodsFundAddress.toLowerCase()) {
    await PaymentGatewayV2.setPublicGoodsFund(newPublicGoodsFundAddress);
    console.log("  ✅ PublicGoodsFund 地址已更新到:", newPublicGoodsFundAddress);
  } else {
    console.log("  ℹ️ PublicGoodsFund 地址已是最新");
  }

  // 确保价差捐赠功能开启
  const isSpreadDonationEnabled = await PaymentGatewayV2.enableSpreadDonation();
  if (!isSpreadDonationEnabled) {
    await PaymentGatewayV2.setEnableSpreadDonation(true);
    console.log("  ✅ 价差捐赠功能已开启");
  } else {
    console.log("  ℹ️ 价差捐赠功能已开启");
  }

  // 步骤 3: 验证集成
  console.log("\n🔍 验证集成状态...");

  // 读取 PublicGoodsFund 的状态
  const PublicGoodsFundContract = await ethers.getContractAt(
    "PublicGoodsFund",
    newPublicGoodsFundAddress
  );

  const totalLifetimeDonations = await PublicGoodsFundContract.totalLifetimeDonations();
  const totalContributors = await PublicGoodsFundContract.getTotalContributors();

  console.log("  📊 PublicGoodsFund 状态:");
  console.log("     总捐款额:", ethers.utils.formatUnits(totalLifetimeDonations, 6), "USDC");
  console.log("     贡献者数量:", totalContributors.toString());

  // 步骤 4: 创建测试订单并支付（验证捐款流程）
  const testDonation = false; // 设为 true 进行测试

  if (testDonation) {
    console.log("\n🧪 测试捐款流程...");

    // 注册商家（如果还没注册）
    try {
      await PaymentGatewayV2.registerMerchant("Test Merchant");
      console.log("  ✓ 商家已注册");
    } catch (e) {
      console.log("  ℹ️ 商家已存在");
    }

    // 创建测试订单
    const orderId = "TEST_" + Date.now();
    const MOCK_USDC = deployment.contracts.MockUSDC;
    const orderAmount = ethers.utils.parseUnits("100", 6); // 100 USDC

    const tx = await PaymentGatewayV2.createOrder(
      orderId,
      orderAmount,
      MOCK_USDC,
      MOCK_USDC,
      "ipfs://test",
      false,
      ethers.constants.AddressZero
    );
    await tx.wait();
    console.log("  ✓ 测试订单已创建:", orderId);

    // 获取订单的 bytes32 ID
    const orderBytes32 = await PaymentGatewayV2.stringToBytes32OrderId(orderId);

    // 授权并支付
    const MockUSDC = await ethers.getContractAt("ERC20", MOCK_USDC);
    await MockUSDC.approve(PaymentGatewayV2Address, orderAmount);
    console.log("  ✓ USDC 授权完成");

    await PaymentGatewayV2.processPayment(orderBytes32, orderAmount);
    console.log("  ✓ 支付完成");

    // 再次检查 PublicGoodsFund 状态
    const newTotalDonations = await PublicGoodsFundContract.totalLifetimeDonations();
    const newContributors = await PublicGoodsFundContract.getTotalContributors();

    console.log("\n  📊 更新后的 PublicGoodsFund 状态:");
    console.log("     总捐款额:", ethers.utils.formatUnits(newTotalDonations, 6), "USDC");
    console.log("     贡献者数量:", newContributors.toString());

    const donationIncrease = newTotalDonations.sub(totalLifetimeDonations);
    console.log("     本次捐款:", ethers.utils.formatUnits(donationIncrease, 6), "USDC");
  }

  // 步骤 5: 更新部署配置文件
  if (needNewPublicGoodsFund) {
    deployment.contracts.PublicGoodsFund = newPublicGoodsFundAddress;
    deployment.timestamp = new Date().toISOString();
    deployment.features.publicGoodsFundFixed = true;

    fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
    console.log("\n💾 部署配置已更新");
  }

  console.log("\n✅ 修复完成!");
  console.log("\n📝 总结:");
  console.log("1. PublicGoodsFund 地址:", newPublicGoodsFundAddress);
  console.log("2. PaymentGatewayV2 已连接到 PublicGoodsFund");
  console.log("3. 所有同币种和跨币种交易的捐款都将被追踪");
  console.log("\n⚠️ 注意: 需要重新部署 PaymentGatewayV2 合约以使用修复后的 _processDonation 函数");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
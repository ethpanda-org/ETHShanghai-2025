// 完整重新部署脚本 - 修复 PublicGoodsFund 集成
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 完整重新部署 PaymentGatewayV2 + PublicGoodsFund...\n");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("账户余额:", ethers.utils.formatEther(balance), "ETH\n");

  // ============ 步骤 1: 部署 Mock Tokens（如果需要）============
  console.log("📦 步骤 1: 检查 Mock Tokens...");

  // 读取现有部署（如果存在）
  const deploymentPath = path.join(__dirname, "../deployment-gateway-v2-public-goods.json");
  let deployment = {};

  try {
    deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
    console.log("  找到现有部署配置");
  } catch {
    console.log("  创建新的部署配置");
    deployment = { contracts: {}, features: {} };
  }

  let MOCK_USDC, MOCK_USDT;

  // 使用现有的 Mock Tokens 或部署新的
  if (deployment.contracts?.MockUSDC && deployment.contracts?.MockUSDT) {
    MOCK_USDC = deployment.contracts.MockUSDC;
    MOCK_USDT = deployment.contracts.MockUSDT;
    console.log("  使用现有 Mock Tokens:");
    console.log("    USDC:", MOCK_USDC);
    console.log("    USDT:", MOCK_USDT);
  } else {
    console.log("  部署新的 Mock Tokens...");

    const MockToken = await ethers.getContractFactory("MockERC20");

    const mockUSDC = await MockToken.deploy("Mock USDC", "USDC", 6);
    await mockUSDC.deployed();
    MOCK_USDC = mockUSDC.address;
    console.log("    ✅ Mock USDC:", MOCK_USDC);

    const mockUSDT = await MockToken.deploy("Mock USDT", "USDT", 6);
    await mockUSDT.deployed();
    MOCK_USDT = mockUSDT.address;
    console.log("    ✅ Mock USDT:", MOCK_USDT);

    // 给部署者铸造一些测试代币
    const mintAmount = ethers.utils.parseUnits("10000", 6);
    await mockUSDC.mint(deployer.address, mintAmount);
    await mockUSDT.mint(deployer.address, mintAmount);
    console.log("    ✅ 已铸造测试代币");
  }

  // ============ 步骤 2: 部署 FXRouter（如果需要）============
  console.log("\n📦 步骤 2: 部署 FXRouter...");

  let FX_ROUTER;
  if (deployment.contracts?.FXRouter) {
    FX_ROUTER = deployment.contracts.FXRouter;
    console.log("  使用现有 FXRouter:", FX_ROUTER);
  } else {
    const FXRouter = await ethers.getContractFactory("FXRouter");
    const fxRouter = await FXRouter.deploy();
    await fxRouter.deployed();
    FX_ROUTER = fxRouter.address;
    console.log("  ✅ FXRouter 部署到:", FX_ROUTER);
  }

  // ============ 步骤 3: 部署修复版 PublicGoodsFund ============
  console.log("\n📦 步骤 3: 部署修复版 PublicGoodsFund...");

  // 注意：使用完全限定名称来避免冲突
  const PublicGoodsFund = await ethers.getContractFactory("contracts/PublicGoodsFund.sol:PublicGoodsFund");
  const publicGoodsFund = await PublicGoodsFund.deploy();
  await publicGoodsFund.deployed();

  const PUBLIC_GOODS_FUND = publicGoodsFund.address;
  console.log("  ✅ PublicGoodsFund 部署到:", PUBLIC_GOODS_FUND);

  // 配置 PublicGoodsFund
  console.log("\n  🔧 配置 PublicGoodsFund...");

  // 添加支持的代币
  await publicGoodsFund.addSupportedToken(MOCK_USDC);
  await publicGoodsFund.addSupportedToken(MOCK_USDT);
  console.log("    ✓ 支持的代币已添加");

  // ============ 步骤 4: 部署 PaymentGatewayV2 ============
  console.log("\n📦 步骤 4: 部署 PaymentGatewayV2...");

  const treasuryAddress = deployer.address; // 使用部署者地址作为财务地址
  const donationAddress = deployer.address; // 备用捐赠地址

  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
  const paymentGateway = await PaymentGatewayV2.deploy(
    FX_ROUTER,
    treasuryAddress,
    donationAddress,
    PUBLIC_GOODS_FUND,  // 直接连接 PublicGoodsFund
    ethers.constants.AddressZero  // 暂时不设置 Oracle
  );
  await paymentGateway.deployed();

  const PAYMENT_GATEWAY_V2 = paymentGateway.address;
  console.log("  ✅ PaymentGatewayV2 部署到:", PAYMENT_GATEWAY_V2);

  // ============ 步骤 5: 配置 PaymentGatewayV2 ============
  console.log("\n📦 步骤 5: 配置 PaymentGatewayV2...");

  // 添加支持的代币
  await paymentGateway.addSupportedToken(MOCK_USDC);
  await paymentGateway.addSupportedToken(MOCK_USDT);
  console.log("  ✓ 支持的代币已添加");

  // 设置代币符号（用于交易对）
  await paymentGateway.setTokenSymbol(MOCK_USDC, "USDC");
  await paymentGateway.setTokenSymbol(MOCK_USDT, "USDT");
  console.log("  ✓ 代币符号已设置");

  // 开启价差捐赠
  await paymentGateway.setEnableSpreadDonation(true);
  console.log("  ✓ 价差捐赠已开启");

  // ============ 步骤 6: 更新 PublicGoodsFund 授权 ============
  console.log("\n📦 步骤 6: 授权 PaymentGatewayV2...");

  // 注意：原始的 PublicGoodsFund 没有 addAuthorizedGateway 函数
  // 所以我们需要确保 PaymentGatewayV2 有足够的代币来调用 contributeSpread

  console.log("  ⚠️ 注意: PublicGoodsFund 需要手动授权或修改合约");

  // ============ 步骤 7: 创建并执行测试订单 ============
  console.log("\n🧪 步骤 7: 测试完整流程...");

  // 注册商家
  try {
    await paymentGateway.registerMerchant("Test Merchant");
    console.log("  ✓ 商家已注册");
  } catch (e) {
    console.log("  ℹ️ 商家已注册");
  }

  // 创建测试订单
  const orderId = "TEST_" + Date.now();
  const orderAmount = ethers.utils.parseUnits("100", 6); // 100 USDC

  console.log("\n  📝 创建测试订单...");
  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    MOCK_USDC,
    MOCK_USDT,  // 注意：USDC -> USDT
    "ipfs://QmTest",
    false,
    ethers.constants.AddressZero
  );
  await createTx.wait();
  console.log("    ✓ 订单创建成功:", orderId);

  // 获取订单 bytes32 ID
  const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);
  console.log("    ✓ 订单 ID (bytes32):", orderBytes32);

  // Mint 并授权 USDC
  const MockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC);
  await MockUSDC.mint(deployer.address, orderAmount);
  await MockUSDC.approve(PAYMENT_GATEWAY_V2, orderAmount);
  console.log("    ✓ USDC 授权完成");

  // 执行支付
  console.log("\n  💳 执行支付...");
  const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
  const payReceipt = await payTx.wait();
  console.log("    ✓ 支付成功, Gas used:", payReceipt.gasUsed.toString());

  // 检查 PublicGoodsFund 状态
  console.log("\n  📊 检查 PublicGoodsFund 状态...");
  const totalDonations = await publicGoodsFund.totalLifetimeDonations();
  const totalContributors = await publicGoodsFund.getTotalContributors();

  console.log("    总捐款额:", ethers.utils.formatUnits(totalDonations, 6), "USDC");
  console.log("    贡献者数量:", totalContributors.toString());

  if (totalDonations.gt(0)) {
    console.log("    ✅ 捐款功能正常工作！");
  } else {
    console.log("    ⚠️ 捐款未记录 - 需要进一步调试");
  }

  // ============ 步骤 8: 保存部署配置 ============
  console.log("\n💾 保存部署配置...");

  const newDeployment = {
    network: "optimism-sepolia",
    chainId: 11155420,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PaymentGatewayV2: PAYMENT_GATEWAY_V2,
      PublicGoodsFund: PUBLIC_GOODS_FUND,
      FXRouter: FX_ROUTER,
      MockUSDC: MOCK_USDC,
      MockUSDT: MOCK_USDT,
      DonationAddress: donationAddress,
      TreasuryAddress: treasuryAddress
    },
    features: {
      spreadDonationEnabled: true,
      publicGoodsFundIntegrated: true,
      platformFeeRate: "30", // 0.3%
      donationPercentage: "500", // 5% of platform fees
    },
    testOrder: {
      orderId: orderId,
      orderBytes32: orderBytes32,
      amount: "100 USDC",
      status: "completed"
    }
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(newDeployment, null, 2));
  console.log("  ✅ 配置已保存到:", deploymentPath);

  // ============ 步骤 9: 更新前端配置 ============
  console.log("\n📝 更新前端配置...");

  const frontendConfigPath = path.join(__dirname, "../frontend/lib/contracts.ts");
  const frontendConfig = fs.readFileSync(frontendConfigPath, "utf8");

  // 更新合约地址
  const updatedConfig = frontendConfig
    .replace(/PAYMENT_GATEWAY_V2:\s*['"][^'"]+['"]/, `PAYMENT_GATEWAY_V2: '${PAYMENT_GATEWAY_V2}'`)
    .replace(/PUBLIC_GOODS_FUND:\s*['"][^'"]+['"]/, `PUBLIC_GOODS_FUND: '${PUBLIC_GOODS_FUND}'`)
    .replace(/FX_ROUTER:\s*['"][^'"]+['"]/, `FX_ROUTER: '${FX_ROUTER}'`)
    .replace(/MOCK_USDC:\s*['"][^'"]+['"]/, `MOCK_USDC: '${MOCK_USDC}'`)
    .replace(/MOCK_USDT:\s*['"][^'"]+['"]/, `MOCK_USDT: '${MOCK_USDT}'`);

  fs.writeFileSync(frontendConfigPath, updatedConfig);
  console.log("  ✅ 前端配置已更新");

  // ============ 完成 ============
  console.log("\n✅ 重新部署完成！\n");
  console.log("📋 部署总结:");
  console.log("=====================================");
  console.log("PaymentGatewayV2:", PAYMENT_GATEWAY_V2);
  console.log("PublicGoodsFund:", PUBLIC_GOODS_FUND);
  console.log("FXRouter:", FX_ROUTER);
  console.log("Mock USDC:", MOCK_USDC);
  console.log("Mock USDT:", MOCK_USDT);
  console.log("=====================================");
  console.log("\n下一步:");
  console.log("1. 重启前端: npm run dev");
  console.log("2. 创建新订单测试捐款功能");
  console.log("3. 检查 Public Goods Impact 数据是否更新");

  if (totalDonations.eq(0)) {
    console.log("\n⚠️ 警告: 捐款数据仍为 0");
    console.log("可能需要:");
    console.log("1. 部署修复版的 PublicGoodsFund (带 contributeFee 函数)");
    console.log("2. 修改 PaymentGatewayV2 的 _processDonation 函数");
    console.log("3. 确保 PublicGoodsFund 授权正确");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
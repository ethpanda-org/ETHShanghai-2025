// 完整重新部署 - 使用 PublicGoodsFundV2
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 完整重新部署（使用 PublicGoodsFundV2）...\n");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("账户余额:", ethers.utils.formatEther(balance), "ETH\n");

  // 使用已部署的合约
  const MOCK_USDC = "0xb7225051e57db0296C1F56fbD536Acd06c889724";
  const MOCK_USDT = "0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2";
  const FX_ROUTER = "0x81C8F2AdD03187A17F8998541e27E2dD7566c504";

  // ============ 步骤 1: 使用已部署的 PublicGoodsFundV2 ============
  console.log("📦 步骤 1: 使用已部署的 PublicGoodsFundV2...");

  const PUBLIC_GOODS_FUND_V2 = "0xa3CA872b3876FbC2a6759256e57583A25555B4Cb";
  console.log("  PublicGoodsFundV2 地址:", PUBLIC_GOODS_FUND_V2);

  const publicGoodsFundV2 = await ethers.getContractAt(
    "PublicGoodsFundV2",
    PUBLIC_GOODS_FUND_V2
  );

  // ============ 步骤 2: 重新部署 PaymentGatewayV2 ============
  console.log("\n📦 步骤 2: 重新部署 PaymentGatewayV2...");

  const treasuryAddress = deployer.address;
  const donationAddress = deployer.address;

  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
  const paymentGateway = await PaymentGatewayV2.deploy(
    FX_ROUTER,
    treasuryAddress,
    donationAddress,
    PUBLIC_GOODS_FUND_V2,  // 使用新的 PublicGoodsFundV2
    ethers.constants.AddressZero  // 暂时不设置 Oracle
  );
  await paymentGateway.deployed();

  const PAYMENT_GATEWAY_V2 = paymentGateway.address;
  console.log("  ✅ PaymentGatewayV2 部署到:", PAYMENT_GATEWAY_V2);

  // ============ 步骤 3: 配置合约 ============
  console.log("\n📦 步骤 3: 配置合约...");

  // 3.1 授权新的 PaymentGatewayV2 到 PublicGoodsFundV2
  console.log("  授权 PaymentGatewayV2...");
  await publicGoodsFundV2.addAuthorizedGateway(PAYMENT_GATEWAY_V2);
  console.log("    ✓ 授权完成");

  // 3.2 配置 PaymentGatewayV2
  console.log("  配置 PaymentGatewayV2...");

  // 添加支持的代币
  await paymentGateway.addSupportedToken(MOCK_USDC);
  await paymentGateway.addSupportedToken(MOCK_USDT);
  console.log("    ✓ 支持的代币已添加");

  // 设置代币符号
  await paymentGateway.setTokenSymbol(MOCK_USDC, "USDC");
  await paymentGateway.setTokenSymbol(MOCK_USDT, "USDT");
  console.log("    ✓ 代币符号已设置");

  // 开启价差捐赠
  await paymentGateway.setEnableSpreadDonation(true);
  console.log("    ✓ 价差捐赠已开启");

  // 注册商家
  try {
    await paymentGateway.registerMerchant("Test Merchant");
    console.log("    ✓ 商家已注册");
  } catch (e) {
    console.log("    ℹ️ 商家已存在");
  }

  // ============ 步骤 4: 创建并支付测试订单 ============
  console.log("\n🧪 步骤 4: 测试完整流程...");

  // 检查初始状态
  const initialDonations = await publicGoodsFundV2.totalLifetimeDonations();
  const initialContributors = await publicGoodsFundV2.getTotalContributors();

  console.log("  初始状态:");
  console.log("    总捐款额:", ethers.utils.formatUnits(initialDonations, 6), "USDC");
  console.log("    贡献者数:", initialContributors.toString());

  // 创建测试订单
  const orderId = "FINAL_TEST_" + Date.now();
  const orderAmount = ethers.utils.parseUnits("50", 6); // 50 USDC

  console.log("\n  📝 创建测试订单...");
  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    MOCK_USDC,
    MOCK_USDC, // 同币种，避免交换失败
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
  console.log("    ✓ 支付成功! Gas used:", receipt.gasUsed.toString());

  // 分析事件
  let donationProcessed = false;
  for (const event of receipt.events || []) {
    if (event.event === "DonationProcessed") {
      console.log("  🎁 捐款事件:");
      console.log("    接收方:", event.args.recipient);
      console.log("    金额:", ethers.utils.formatUnits(event.args.amount, 6), "USDC");
      donationProcessed = true;
    }
    if (event.event === "OrderPaid") {
      console.log("  💰 支付事件:");
      console.log("    订单ID:", event.args.orderId);
      console.log("    支付金额:", ethers.utils.formatUnits(event.args.paidAmount, 6), "USDC");
    }
  }

  // 等待链上状态更新
  await new Promise(resolve => setTimeout(resolve, 3000));

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

    // 计算预期捐款（0.3% 平台费的 5%）
    const expectedFee = orderAmount.mul(30).div(10000); // 0.3%
    const expectedDonation = expectedFee.mul(500).div(10000); // 5% of fee
    console.log("  预期捐款:", ethers.utils.formatUnits(expectedDonation, 6), "USDC");
  } else if (donationProcessed) {
    console.log("\n⚠️ 捐款事件已触发，但 PublicGoodsFund 统计未更新");
    console.log("  可能原因：代币转账到了 PublicGoodsFund 但 receiveDonation 未被调用");
  } else {
    console.log("\n❌ 捐款功能未工作");
  }

  // ============ 步骤 5: 保存部署配置 ============
  console.log("\n💾 保存部署配置...");

  const deploymentPath = path.join(__dirname, "../deployment-final.json");
  const deployment = {
    network: "optimism-sepolia",
    chainId: 11155420,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      PaymentGatewayV2: PAYMENT_GATEWAY_V2,
      PublicGoodsFundV2: PUBLIC_GOODS_FUND_V2,
      FXRouter: FX_ROUTER,
      MockUSDC: MOCK_USDC,
      MockUSDT: MOCK_USDT,
      TreasuryAddress: treasuryAddress,
      DonationAddress: donationAddress
    },
    status: {
      totalDonations: ethers.utils.formatUnits(finalDonations, 6) + " USDC",
      totalContributors: finalContributors.toString(),
      donationFunctional: finalDonations.gt(initialDonations)
    },
    testOrder: {
      orderId: orderId,
      orderBytes32: orderBytes32,
      amount: "50 USDC",
      status: "completed"
    }
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("  ✅ 配置已保存到:", deploymentPath);

  // ============ 步骤 6: 更新前端配置 ============
  console.log("\n📝 更新前端配置...");

  const frontendConfigPath = path.join(__dirname, "../frontend/lib/contracts.ts");
  let frontendConfig = fs.readFileSync(frontendConfigPath, "utf8");

  // 更新所有合约地址
  frontendConfig = frontendConfig
    .replace(/PAYMENT_GATEWAY_V2:\s*['"][^'"]+['"]/, `PAYMENT_GATEWAY_V2: '${PAYMENT_GATEWAY_V2}'`)
    .replace(/PUBLIC_GOODS_FUND:\s*['"][^'"]+['"]/, `PUBLIC_GOODS_FUND: '${PUBLIC_GOODS_FUND_V2}'`)
    .replace(/FX_ROUTER:\s*['"][^'"]+['"]/, `FX_ROUTER: '${FX_ROUTER}'`)
    .replace(/MOCK_USDC:\s*['"][^'"]+['"]/, `MOCK_USDC: '${MOCK_USDC}'`)
    .replace(/MOCK_USDT:\s*['"][^'"]+['"]/, `MOCK_USDT: '${MOCK_USDT}'`);

  fs.writeFileSync(frontendConfigPath, frontendConfig);
  console.log("  ✅ 前端配置已更新");

  // ============ 完成 ============
  console.log("\n🎉 部署完成！\n");
  console.log("📋 最终合约地址:");
  console.log("=====================================");
  console.log("PaymentGatewayV2:", PAYMENT_GATEWAY_V2);
  console.log("PublicGoodsFundV2:", PUBLIC_GOODS_FUND_V2);
  console.log("Mock USDC:", MOCK_USDC);
  console.log("Mock USDT:", MOCK_USDT);
  console.log("FXRouter:", FX_ROUTER);
  console.log("=====================================");

  if (finalDonations.gt(initialDonations)) {
    console.log("\n✨ 捐款功能状态: ✅ 正常工作");
    console.log("  总捐款:", ethers.utils.formatUnits(finalDonations, 6), "USDC");
    console.log("  贡献者:", finalContributors.toString(), "人");
  } else {
    console.log("\n⚠️ 捐款功能状态: 需要进一步调试");
  }

  console.log("\n下一步:");
  console.log("1. 重启前端: cd frontend && npm run dev");
  console.log("2. 清除浏览器缓存");
  console.log("3. 访问 create-order 页面查看 Public Goods Impact 数据");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
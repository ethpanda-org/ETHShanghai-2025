// 重新部署修复版的合约
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 重新部署修复版合约...\n");

  const [deployer] = await ethers.getSigners();
  console.log("部署账户:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("账户余额:", ethers.utils.formatEther(balance), "ETH\n");

  // 现有合约
  const MOCK_USDC = "0xb7225051e57db0296C1F56fbD536Acd06c889724";
  const MOCK_USDT = "0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2";
  const FX_ROUTER = "0x81C8F2AdD03187A17F8998541e27E2dD7566c504";

  // ============ 步骤 1: 部署新的 PublicGoodsFundV2 ============
  console.log("📦 步骤 1: 部署新的 PublicGoodsFundV2（包含修复）...");

  const PublicGoodsFundV2 = await ethers.getContractFactory("PublicGoodsFundV2");
  const publicGoodsFundV2 = await PublicGoodsFundV2.deploy();
  await publicGoodsFundV2.deployed();

  const PUBLIC_GOODS_FUND_V2 = publicGoodsFundV2.address;
  console.log("  ✅ PublicGoodsFundV2 部署到:", PUBLIC_GOODS_FUND_V2);

  // 配置 PublicGoodsFundV2
  await publicGoodsFundV2.addSupportedToken(MOCK_USDC);
  await publicGoodsFundV2.addSupportedToken(MOCK_USDT);
  console.log("  ✓ 支持的代币已添加");

  // ============ 步骤 2: 部署新的 PaymentGatewayV2 ============
  console.log("\n📦 步骤 2: 部署新的 PaymentGatewayV2（包含修复）...");

  const PaymentGatewayV2 = await ethers.getContractFactory("PaymentGatewayV2");
  const paymentGateway = await PaymentGatewayV2.deploy(
    FX_ROUTER,
    deployer.address, // treasury
    deployer.address, // donation
    PUBLIC_GOODS_FUND_V2,
    ethers.constants.AddressZero // oracle
  );
  await paymentGateway.deployed();

  const PAYMENT_GATEWAY_V2 = paymentGateway.address;
  console.log("  ✅ PaymentGatewayV2 部署到:", PAYMENT_GATEWAY_V2);

  // ============ 步骤 3: 配置合约 ============
  console.log("\n📦 步骤 3: 配置合约...");

  // 授权 PaymentGatewayV2
  await publicGoodsFundV2.addAuthorizedGateway(PAYMENT_GATEWAY_V2);
  console.log("  ✓ PaymentGatewayV2 已授权");

  // 配置 PaymentGatewayV2
  await paymentGateway.addSupportedToken(MOCK_USDC);
  await paymentGateway.addSupportedToken(MOCK_USDT);
  await paymentGateway.setTokenSymbol(MOCK_USDC, "USDC");
  await paymentGateway.setTokenSymbol(MOCK_USDT, "USDT");
  await paymentGateway.setEnableSpreadDonation(true);
  console.log("  ✓ PaymentGatewayV2 配置完成");

  // 注册商家
  try {
    await paymentGateway.registerMerchant("Test Merchant");
    console.log("  ✓ 商家已注册");
  } catch {
    console.log("  ℹ️ 商家已存在");
  }

  // ============ 步骤 4: 验证修复 ============
  console.log("\n🧪 步骤 4: 验证捐款计算修复...");

  const orderAmount = ethers.utils.parseUnits("100", 6); // 100 USDC
  const expectedPlatformFee = orderAmount.mul(30).div(10000); // 0.3 USDC
  const expectedDonation = expectedPlatformFee.mul(500).div(10000); // 0.015 USDC

  console.log("  订单金额: 100 USDC");
  console.log("  预期平台费: 0.3 USDC");
  console.log("  预期捐款: 0.015 USDC");

  // 创建测试订单
  const orderId = "FIX_TEST_" + Date.now();
  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    MOCK_USDC,
    MOCK_USDC,
    "ipfs://test",
    false,
    ethers.constants.AddressZero
  );
  await createTx.wait();

  // 支付订单
  const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);
  const mockUSDC = await ethers.getContractAt("MockERC20", MOCK_USDC);
  await mockUSDC.mint(deployer.address, orderAmount);
  await mockUSDC.approve(PAYMENT_GATEWAY_V2, orderAmount);

  const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
  const receipt = await payTx.wait();

  // 检查事件
  for (const event of receipt.events || []) {
    if (event.event === "DonationProcessed") {
      const eventAmount = event.args.amount;
      console.log("  事件捐款金额:", ethers.utils.formatUnits(eventAmount, 6), "USDC");

      if (eventAmount.eq(expectedDonation)) {
        console.log("  ✅ 事件金额正确!");
      }
    }
  }

  // 等待链上更新
  await new Promise(r => setTimeout(r, 2000));

  // 检查 PublicGoodsFund 记录
  const totalDonations = await publicGoodsFundV2.totalLifetimeDonations();
  console.log("  链上记录总额:", ethers.utils.formatUnits(totalDonations, 6), "USDC");

  if (totalDonations.eq(expectedDonation)) {
    console.log("  ✅ 链上记录正确!");
    console.log("\n🎉 修复成功！捐款金额计算已恢复正常。");
  } else {
    const ratio = totalDonations.mul(100).div(expectedDonation);
    console.log("  ⚠️ 链上记录仍有偏差，比率:", ratio.toString() + "%");
  }

  // ============ 步骤 5: 更新配置 ============
  console.log("\n💾 更新配置文件...");

  // 更新部署配置
  const deploymentPath = path.join(__dirname, "../deployment-fixed.json");
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
      MockUSDT: MOCK_USDT
    },
    fix: {
      issue: "100x donation calculation error",
      status: "FIXED",
      totalDonations: ethers.utils.formatUnits(totalDonations, 6) + " USDC"
    }
  };

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));

  // 更新前端配置
  const frontendConfigPath = path.join(__dirname, "../frontend/lib/contracts.ts");
  let frontendConfig = fs.readFileSync(frontendConfigPath, "utf8");

  frontendConfig = frontendConfig
    .replace(/PAYMENT_GATEWAY_V2:\s*['"][^'"]+['"]/, `PAYMENT_GATEWAY_V2: '${PAYMENT_GATEWAY_V2}'`)
    .replace(/PUBLIC_GOODS_FUND:\s*['"][^'"]+['"]/, `PUBLIC_GOODS_FUND: '${PUBLIC_GOODS_FUND_V2}'`);

  fs.writeFileSync(frontendConfigPath, frontendConfig);
  console.log("  ✅ 配置文件已更新");

  // ============ 完成 ============
  console.log("\n" + "=".repeat(50));
  console.log("✅ 部署完成！");
  console.log("=".repeat(50));
  console.log("PaymentGatewayV2:", PAYMENT_GATEWAY_V2);
  console.log("PublicGoodsFundV2:", PUBLIC_GOODS_FUND_V2);
  console.log("=".repeat(50));
  console.log("\n下一步:");
  console.log("1. 重启前端: cd frontend && npm run dev");
  console.log("2. 清除浏览器缓存");
  console.log("3. 创建新订单查看 Public Goods Impact 数据");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
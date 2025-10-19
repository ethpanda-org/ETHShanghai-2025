/**
 * 重新部署 PublicGoodsFundV2 修复版
 * 解决捐款金额记录错误的问题
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const EXISTING_CONTRACTS = {
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
  OLD_PUBLIC_GOODS_FUND_V2: '0xb83aABD1ebFEefC0AeFbeDE5738d3894abD70C4D',
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  MOCK_USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',
};

async function main() {
  console.log("\n🚀 重新部署 PublicGoodsFundV2 修复版\n");
  console.log("=".repeat(70));

  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);

  const balance = await deployer.getBalance();
  console.log("账户余额:", hre.ethers.utils.formatEther(balance), "ETH\n");

  // ============ 步骤 1: 部署新的 PublicGoodsFundV2 ============
  console.log("📦 步骤 1: 部署新的 PublicGoodsFundV2（修复版）...\n");

  const PublicGoodsFundV2 = await hre.ethers.getContractFactory("PublicGoodsFundV2");

  console.log("编译的字节码大小:", PublicGoodsFundV2.bytecode.length, "bytes");
  console.log("预计 gas 成本: ~3,000,000 gas\n");

  const publicGoodsFundV2 = await PublicGoodsFundV2.deploy();
  await publicGoodsFundV2.deployed();

  const NEW_PUBLIC_GOODS_FUND_V2 = publicGoodsFundV2.address;
  console.log("✅ PublicGoodsFundV2（新）部署到:", NEW_PUBLIC_GOODS_FUND_V2);
  console.log("   旧地址:", EXISTING_CONTRACTS.OLD_PUBLIC_GOODS_FUND_V2);

  // ============ 步骤 2: 配置新合约 ============
  console.log("\n📦 步骤 2: 配置新的 PublicGoodsFundV2...\n");

  // 添加支持的代币
  await publicGoodsFundV2.addSupportedToken(EXISTING_CONTRACTS.MOCK_USDC);
  console.log("  ✓ 添加 USDC");

  await publicGoodsFundV2.addSupportedToken(EXISTING_CONTRACTS.MOCK_USDT);
  console.log("  ✓ 添加 USDT");

  // 授权 PaymentGatewayV2
  await publicGoodsFundV2.addAuthorizedGateway(EXISTING_CONTRACTS.PAYMENT_GATEWAY_V2);
  console.log("  ✓ 授权 PaymentGatewayV2");

  // ============ 步骤 3: 更新 PaymentGatewayV2 ============
  console.log("\n📦 步骤 3: 更新 PaymentGatewayV2 指向新合约...\n");

  const paymentGateway = await hre.ethers.getContractAt(
    "PaymentGatewayV2",
    EXISTING_CONTRACTS.PAYMENT_GATEWAY_V2
  );

  const updateTx = await paymentGateway.setPublicGoodsFund(NEW_PUBLIC_GOODS_FUND_V2);
  await updateTx.wait();
  console.log("  ✅ PaymentGatewayV2 已更新");

  // 验证
  const currentFund = await paymentGateway.publicGoodsFund();
  console.log("  验证: PaymentGatewayV2.publicGoodsFund =", currentFund);

  if (currentFund.toLowerCase() === NEW_PUBLIC_GOODS_FUND_V2.toLowerCase()) {
    console.log("  ✅ 地址更新成功");
  } else {
    console.log("  ❌ 地址更新失败!");
    process.exit(1);
  }

  // ============ 步骤 4: 测试新合约 ============
  console.log("\n🧪 步骤 4: 测试修复后的捐款功能...\n");

  // 创建测试订单
  const orderId = "FIX_TEST_" + Date.now();
  const orderAmount = hre.ethers.utils.parseUnits("10", 6); // 10 USDC

  console.log("  📝 创建测试订单...");
  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    EXISTING_CONTRACTS.MOCK_USDC,
    EXISTING_CONTRACTS.MOCK_USDC, // 同币种
    "ipfs://fix-test",
    false,
    hre.ethers.constants.AddressZero
  );
  await createTx.wait();
  console.log("    ✓ 订单创建:", orderId);

  // Mint 并授权 USDC
  const MockUSDC = await hre.ethers.getContractAt("MockERC20", EXISTING_CONTRACTS.MOCK_USDC);
  await MockUSDC.mint(deployer.address, orderAmount);
  await MockUSDC.approve(EXISTING_CONTRACTS.PAYMENT_GATEWAY_V2, orderAmount);
  console.log("    ✓ USDC 准备完成");

  // 获取订单 bytes32
  const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);

  // 检查初始状态
  const initialDonations = await publicGoodsFundV2.totalLifetimeDonations();
  const initialContributors = await publicGoodsFundV2.getTotalContributors();
  const initialContribution = await publicGoodsFundV2.contributors(deployer.address);

  console.log("\n  初始状态:");
  console.log("    totalLifetimeDonations:", hre.ethers.utils.formatUnits(initialDonations, 6), "USDC");
  console.log("    contributors[user]:", hre.ethers.utils.formatUnits(initialContribution, 6), "USDC");

  // 执行支付
  console.log("\n  💳 执行支付...");
  const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
  const receipt = await payTx.wait();
  console.log("    ✓ 支付成功");

  // 解析事件
  let donationAmount = hre.ethers.BigNumber.from(0);
  for (const event of receipt.events || []) {
    if (event.event === "DonationProcessed") {
      donationAmount = event.args.amount;
      console.log("\n  🎁 DonationProcessed 事件:");
      console.log("    接收方:", event.args.recipient);
      console.log("    金额:", hre.ethers.utils.formatUnits(event.args.amount, 6), "USDC");
    }
    if (event.event === "DonationReceived") {
      console.log("\n  ✅ DonationReceived 事件:");
      console.log("    贡献者:", event.args.contributor);
      console.log("    代币:", event.args.token);
      console.log("    金额:", hre.ethers.utils.formatUnits(event.args.amount, 6), "USDC");
    }
  }

  // 等待链上更新
  await new Promise(resolve => setTimeout(resolve, 2000));

  // 检查最终状态
  const finalDonations = await publicGoodsFundV2.totalLifetimeDonations();
  const finalContributors = await publicGoodsFundV2.getTotalContributors();
  const finalContribution = await publicGoodsFundV2.contributors(deployer.address);

  console.log("\n  最终状态:");
  console.log("    totalLifetimeDonations:", hre.ethers.utils.formatUnits(finalDonations, 6), "USDC");
  console.log("    contributors[user]:", hre.ethers.utils.formatUnits(finalContribution, 6), "USDC");

  // 计算增量
  const donationsIncrease = finalDonations.sub(initialDonations);
  const contributionIncrease = finalContribution.sub(initialContribution);

  console.log("\n📊 验证结果:\n");

  // 期望的捐款金额：$10 × 0.3% platform fee × 5% donation = $0.0015
  const expectedDonation = orderAmount.mul(30).div(10000).mul(5).div(100);
  console.log("  期望捐款:", hre.ethers.utils.formatUnits(expectedDonation, 6), "USDC");
  console.log("  实际 DonationProcessed:", hre.ethers.utils.formatUnits(donationAmount, 6), "USDC");
  console.log("  实际记录增量:", hre.ethers.utils.formatUnits(donationsIncrease, 6), "USDC");

  if (donationsIncrease.eq(donationAmount) && donationsIncrease.eq(expectedDonation)) {
    console.log("\n✅ 捐款功能已修复！金额记录完全正确！");
  } else {
    console.log("\n⚠️ 仍有问题:");
    if (!donationsIncrease.eq(donationAmount)) {
      console.log(`  ❌ 记录的金额 (${hre.ethers.utils.formatUnits(donationsIncrease, 6)}) 与发送的金额 (${hre.ethers.utils.formatUnits(donationAmount, 6)}) 不匹配`);
      console.log(`     倍数差异: ${donationAmount.toNumber() / donationsIncrease.toNumber()}x`);
    }
    if (!donationsIncrease.eq(expectedDonation)) {
      console.log(`  ⚠️ 记录的金额与期望不符`);
    }
  }

  // ============ 步骤 5: 更新配置文件 ============
  console.log("\n💾 步骤 5: 更新配置文件...\n");

  const deploymentPath = path.join(__dirname, "../deployment-gateway-v2-public-goods.json");
  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8"));

  deployment.contracts.PublicGoodsFundV1 = EXISTING_CONTRACTS.OLD_PUBLIC_GOODS_FUND_V2; // 保存旧地址
  deployment.contracts.PublicGoodsFundV2 = NEW_PUBLIC_GOODS_FUND_V2;
  deployment.contracts.PublicGoodsFund = NEW_PUBLIC_GOODS_FUND_V2; // 更新为新地址
  deployment.lastUpdated = new Date().toISOString();

  fs.writeFileSync(deploymentPath, JSON.stringify(deployment, null, 2));
  console.log("  ✅ deployment-gateway-v2-public-goods.json 已更新");

  // ============ 步骤 6: 更新前端配置 ============
  console.log("\n📝 步骤 6: 更新前端配置...\n");

  const frontendConfigPath = path.join(__dirname, "../frontend/lib/contracts.ts");
  let frontendConfig = fs.readFileSync(frontendConfigPath, "utf8");

  // 更新 PublicGoodsFund 地址
  frontendConfig = frontendConfig.replace(
    /PUBLIC_GOODS_FUND:\s*['"][^'"]+['"]/,
    `PUBLIC_GOODS_FUND: '${NEW_PUBLIC_GOODS_FUND_V2}'`
  );

  // 更新注释
  const timestamp = new Date().toISOString();
  frontendConfig = frontendConfig.replace(
    /\/\/ Updated: .+/,
    `// Updated: ${timestamp} - Fixed donation amount recording bug`
  );

  fs.writeFileSync(frontendConfigPath, frontendConfig);
  console.log("  ✅ frontend/lib/contracts.ts 已更新");

  // ============ 完成 ============
  console.log("\n" + "=".repeat(70));
  console.log("✅ PublicGoodsFundV2 修复并重新部署完成！\n");
  console.log("📋 合约地址:");
  console.log("═".repeat(70));
  console.log("PublicGoodsFundV2 (新):", NEW_PUBLIC_GOODS_FUND_V2);
  console.log("PublicGoodsFundV2 (旧):", EXISTING_CONTRACTS.OLD_PUBLIC_GOODS_FUND_V2);
  console.log("PaymentGatewayV2:      ", EXISTING_CONTRACTS.PAYMENT_GATEWAY_V2);
  console.log("═".repeat(70));

  console.log("\n✨ 测试结果:");
  console.log("  捐款金额: ", hre.ethers.utils.formatUnits(donationsIncrease, 6), "USDC");
  console.log("  贡献者数: ", finalContributors.toString(), "人");

  console.log("\n📌 下一步:");
  console.log("1. 重启前端查看更新");
  console.log("2. 创建新订单测试 Total Contributions 是否显示正确");
  console.log("3. 旧合约的数据已被遗留，如需要可以手动迁移\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

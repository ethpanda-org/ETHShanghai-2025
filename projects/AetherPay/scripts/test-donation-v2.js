// 统一版：测试修复后的捐款计算（新版 ABI + 单一地址源）
const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function loadAddresses() {
  try {
    const p = path.join(__dirname, "../addresses.json");
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    return JSON.parse(fs.readFileSync("./addresses.json", "utf8"));
  }
}

async function main() {
  console.log("🧪 测试修复后的捐赠逻辑 (V2)\n");
  console.log(`Network: ${hre.network.name}`);

  const addr = await loadAddresses();
  const contracts = addr.contracts || addr;
  const tokens = addr.tokens || {};

  const paymentGatewayAddress = contracts.paymentGatewayV2 || contracts.PaymentGatewayV2;
  const publicGoodsFundAddress = contracts.publicGoodsFund || contracts.PublicGoodsFundV2 || contracts.PublicGoodsFund;
  const usdcAddress = tokens.USDC || tokens.MockUSDC || addr.USDC;

  const signers = await ethers.getSigners();
  const deployer = signers[0];
  const user = signers[1] || deployer; // Fallback: 若无第二账户，则使用 deployer 作为 payer
  if (signers.length < 2) {
    console.log("⚠️ 未检测到第二账户，使用 deployer 作为用户进行测试");
  }

  const gateway = await ethers.getContractAt("PaymentGatewayV2", paymentGatewayAddress);
  const publicGoodsFund = await ethers.getContractAt("PublicGoodsFundV2", publicGoodsFundAddress);
  const usdc = await ethers.getContractAt("MockERC20", usdcAddress);

  console.log("📋 合约地址:");
  console.log(`PaymentGatewayV2: ${gateway.address}`);
  console.log(`PublicGoodsFundV2: ${publicGoodsFund.address}`);
  console.log(`USDC: ${usdc.address}\n`);

  // 初始状态
  const initialBalance = await usdc.balanceOf(user.address);
  const initialContribution = await publicGoodsFund.contributors(user.address);
  console.log(`用户 USDC 余额: ${ethers.utils.formatUnits(initialBalance, 6)} USDC`);
  console.log(`用户初始贡献: ${ethers.utils.formatUnits(initialContribution, 6)} USDC\n`);

  // 支付与预期
  const paymentAmount = ethers.utils.parseUnits("200", 6); // $200
  const expectedPlatformFee = paymentAmount.mul(30).div(10000); // 0.3%
  const expectedDonation = expectedPlatformFee.mul(500).div(10000); // 5%
  console.log(`支付金额: ${ethers.utils.formatUnits(paymentAmount, 6)} USDC`);
  console.log(`预期平台费: ${ethers.utils.formatUnits(expectedPlatformFee, 6)} USDC`);
  console.log(`预期捐赠金额: ${ethers.utils.formatUnits(expectedDonation, 6)} USDC\n`);

  // 准备代币
  await usdc.mint(user.address, paymentAmount.mul(2));
  await usdc.connect(user).approve(gateway.address, paymentAmount.mul(2));
  console.log("✅ 代币准备完成\n");

  // 创建订单（新版 ABI）
  console.log("4️⃣ 创建测试订单...");
  const orderIdString = `test-order-${Date.now()}`;
  const createTx = await gateway.connect(user).createOrder(
    orderIdString,
    paymentAmount,
    usdc.address,
    usdc.address,
    "ipfs://test",
    false,
    ethers.constants.AddressZero
  );
  const createRcpt = await createTx.wait();
  const orderCreated = createRcpt.events?.find(e => e.event === 'OrderCreated');
  const orderId = orderCreated?.args?.orderId || await gateway.stringToBytes32OrderId(orderIdString);
  console.log(`✅ 订单创建成功: ${orderIdString}`);

  // 执行支付
  console.log("5️⃣ 执行支付...");
  const payTx = await gateway.connect(user).processPayment(orderId, paymentAmount);
  const payRcpt = await payTx.wait();
  console.log(`✅ 支付完成，交易哈希: ${payTx.hash}\n`);

  // 检查结果
  console.log("6️⃣ 检查支付结果...");
  const finalContribution = await publicGoodsFund.contributors(user.address);
  const contributionIncrease = finalContribution.sub(initialContribution);
  console.log(`用户最终贡献: ${ethers.utils.formatUnits(finalContribution, 6)} USDC`);
  console.log(`贡献增加: ${ethers.utils.formatUnits(contributionIncrease, 6)} USDC`);

  const fundBalance = await usdc.balanceOf(publicGoodsFund.address);
  console.log(`PublicGoodsFund USDC 余额: ${ethers.utils.formatUnits(fundBalance, 6)} USDC`);

  // 验证
  const donationTolerance = ethers.utils.parseUnits("0.001", 6);
  if (contributionIncrease.sub(expectedDonation).abs().lte(donationTolerance)) {
    console.log("✅ 捐赠金额正确！");
  } else {
    console.log("❌ 捐赠金额不正确！");
    console.log(`   预期: ${ethers.utils.formatUnits(expectedDonation, 6)} USDC`);
    console.log(`   实际: ${ethers.utils.formatUnits(contributionIncrease, 6)} USDC`);
  }

  // 前端显示逻辑校验
  const [totalContributed, level] = await publicGoodsFund.getContributorInfo(user.address);
  const totalDonation = parseFloat(ethers.utils.formatUnits(totalContributed, 6));
  const expectedFrontendDisplay = parseFloat(ethers.utils.formatUnits(finalContribution, 6));
  console.log(`前端显示的总贡献: $${totalDonation.toFixed(2)} / 等级: ${level}`);
  console.log(Math.abs(totalDonation - expectedFrontendDisplay) < 0.001 ? "✅ 前端显示逻辑正确！" : "❌ 前端显示逻辑有问题！");

  // 事件校验
  const donationEvent = payRcpt.events?.find(e => e.event === 'DonationProcessed');
  if (donationEvent) {
    console.log(`事件捐赠金额: ${ethers.utils.formatUnits(donationEvent.args.amount, 6)} USDC`);
  } else {
    console.log("⚠️ 未捕获到 DonationProcessed 事件（合约仍已入账）");
  }

  console.log("\n🎉 测试完成！");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ 测试失败:", error);
    process.exit(1);
  });
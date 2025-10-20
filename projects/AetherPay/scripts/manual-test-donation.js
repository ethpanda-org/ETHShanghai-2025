/**
 * 手动测试新合约的捐款功能
 */

const hre = require("hardhat");

const CONTRACTS = {
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
  PUBLIC_GOODS_FUND_V2: '0x2f17730A67A19a3Ca2c61f80720E922C553299da',
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
};

async function main() {
  console.log("\n🧪 手动测试新合约的捐款功能\n");
  console.log("=".repeat(70));

  const [user] = await hre.ethers.getSigners();
  console.log("测试账户:", user.address, "\n");

  // 连接合约
  const paymentGateway = await hre.ethers.getContractAt("PaymentGatewayV2", CONTRACTS.PAYMENT_GATEWAY_V2);
  const publicGoodsFund = await hre.ethers.getContractAt("PublicGoodsFundV2", CONTRACTS.PUBLIC_GOODS_FUND_V2);
  const usdc = await hre.ethers.getContractAt("MockERC20", CONTRACTS.MOCK_USDC);

  // 检查初始状态
  console.log("📊 初始状态:");
  const initialTotal = await publicGoodsFund.totalLifetimeDonations();
  const initialUserContribution = await publicGoodsFund.contributors(user.address);
  console.log(`  totalLifetimeDonations: ${hre.ethers.utils.formatUnits(initialTotal, 6)} USDC`);
  console.log(`  user contribution: ${hre.ethers.utils.formatUnits(initialUserContribution, 6)} USDC\n`);

  // 创建订单
  const orderId = "MANUAL_TEST_" + Date.now();
  const orderAmount = hre.ethers.utils.parseUnits("50", 6); // 50 USDC

  console.log("📝 创建订单:", orderId);
  console.log(`   金额: ${hre.ethers.utils.formatUnits(orderAmount, 6)} USDC\n`);

  const createTx = await paymentGateway.createOrder(
    orderId,
    orderAmount,
    CONTRACTS.MOCK_USDC,
    CONTRACTS.MOCK_USDC,
    "ipfs://manual-test",
    false,
    hre.ethers.constants.AddressZero
  );
  await createTx.wait();
  console.log("✓ 订单创建成功\n");

  // Mint 并授权 USDC
  console.log("💰 准备 USDC...");
  await usdc.mint(user.address, orderAmount);
  await usdc.approve(CONTRACTS.PAYMENT_GATEWAY_V2, orderAmount);
  console.log("✓ USDC 已准备并授权\n");

  // 获取订单 ID
  const orderBytes32 = await paymentGateway.stringToBytes32OrderId(orderId);

  // 执行支付
  console.log("💳 执行支付...");
  const payTx = await paymentGateway.processPayment(orderBytes32, orderAmount);
  const receipt = await payTx.wait();
  console.log("✓ 支付成功\n");

  console.log(`Gas used: ${receipt.gasUsed.toString()}`);
  console.log(`TX: ${receipt.transactionHash}\n`);

  // 解析事件
  console.log("📋 交易事件:\n");

  let donationProcessedAmount = hre.ethers.BigNumber.from(0);
  let donationReceivedAmount = hre.ethers.BigNumber.from(0);
  let foundDonationProcessed = false;
  let foundDonationReceived = false;

  for (const event of receipt.events || []) {
    if (event.event === "OrderCompleted") {
      console.log("  ✅ OrderCompleted");
      console.log(`     merchant: ${event.args.merchant}`);
      console.log(`     receivedAmount: ${hre.ethers.utils.formatUnits(event.args.receivedAmount, 6)} USDC`);
      console.log(`     platformFee: ${hre.ethers.utils.formatUnits(event.args.platformFee, 6)} USDC`);
    }

    if (event.event === "DonationProcessed") {
      foundDonationProcessed = true;
      donationProcessedAmount = event.args.amount;
      console.log("  🎁 DonationProcessed");
      console.log(`     recipient: ${event.args.recipient}`);
      console.log(`     amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
    }

    if (event.event === "DonationReceived") {
      foundDonationReceived = true;
      donationReceivedAmount = event.args.amount;
      console.log("  ✅ DonationReceived");
      console.log(`     contributor: ${event.args.contributor}`);
      console.log(`     token: ${event.args.token}`);
      console.log(`     amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
    }
  }

  if (!foundDonationProcessed) {
    console.log("  ⚠️ 没有 DonationProcessed 事件");
  }

  if (!foundDonationReceived) {
    console.log("  ⚠️ 没有 DonationReceived 事件（可能 contributeFee 失败）");
  }

  // 等待状态更新
  await new Promise(resolve => setTimeout(resolve, 3000));

  // 检查最终状态
  console.log("\n📊 最终状态:");
  const finalTotal = await publicGoodsFund.totalLifetimeDonations();
  const finalUserContribution = await publicGoodsFund.contributors(user.address);
  const totalContributors = await publicGoodsFund.getTotalContributors();

  console.log(`  totalLifetimeDonations: ${hre.ethers.utils.formatUnits(finalTotal, 6)} USDC`);
  console.log(`  user contribution: ${hre.ethers.utils.formatUnits(finalUserContribution, 6)} USDC`);
  console.log(`  total contributors: ${totalContributors.toString()}\n`);

  // 计算期望值
  // $50 × 0.3% platform fee = $0.15
  // $0.15 × 5% donation = $0.0075
  const expectedDonation = orderAmount.mul(30).div(10000).mul(5).div(100);

  console.log("📊 结果对比:\n");
  console.log(`  期望捐款: ${hre.ethers.utils.formatUnits(expectedDonation, 6)} USDC`);
  console.log(`  DonationProcessed: ${hre.ethers.utils.formatUnits(donationProcessedAmount, 6)} USDC`);
  console.log(`  实际记录增量: ${hre.ethers.utils.formatUnits(finalTotal.sub(initialTotal), 6)} USDC`);
  console.log(`  用户贡献增量: ${hre.ethers.utils.formatUnits(finalUserContribution.sub(initialUserContribution), 6)} USDC\n`);

  // 验证
  const actualIncrease = finalTotal.sub(initialTotal);

  if (actualIncrease.eq(expectedDonation) && actualIncrease.eq(donationProcessedAmount)) {
    console.log("✅ 捐款功能完全正常！所有金额匹配！");
  } else if (actualIncrease.gt(0)) {
    console.log("⚠️ 捐款部分工作，但金额不匹配:");
    if (!actualIncrease.eq(donationProcessedAmount)) {
      console.log(`   - 记录的金额与发送的金额不符`);
    }
    if (!actualIncrease.eq(expectedDonation)) {
      console.log(`   - 记录的金额与计算的期望值不符`);
    }
  } else {
    console.log("❌ 捐款功能仍然失败，金额没有记录");
    console.log("\n可能的原因:");
    console.log("  1. contributeFee() 调用被 revert");
    console.log("  2. 代币转账失败");
    console.log("  3. 授权不足");
  }

  console.log("\n" + "=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

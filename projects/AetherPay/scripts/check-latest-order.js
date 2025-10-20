/**
 * 检查最近的订单支付情况
 */

const hre = require("hardhat");

const CONTRACTS = {
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
  PUBLIC_GOODS_FUND_V2: '0x2f17730A67A19a3Ca2c61f80720E922C553299da',
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
};

async function main() {
  console.log("\n🔍 检查最近的订单和捐款\n");
  console.log("=".repeat(70));

  const [user] = await hre.ethers.getSigners();

  const paymentGateway = await hre.ethers.getContractAt("PaymentGatewayV2", CONTRACTS.PAYMENT_GATEWAY_V2);
  const publicGoodsFund = await hre.ethers.getContractAt("PublicGoodsFundV2", CONTRACTS.PUBLIC_GOODS_FUND_V2);

  // 获取最近 100 个区块
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 100;

  console.log(`当前区块: ${currentBlock}`);
  console.log(`搜索范围: ${fromBlock} -> ${currentBlock}\n`);

  // 1. 查询 OrderCompleted 事件
  console.log("📦 步骤 1: 查询最近完成的订单\n");

  const completedFilter = paymentGateway.filters.OrderCompleted();
  const completedEvents = await paymentGateway.queryFilter(completedFilter, fromBlock, 'latest');

  console.log(`找到 ${completedEvents.length} 个 OrderCompleted 事件\n`);

  if (completedEvents.length > 0) {
    const latestOrder = completedEvents[completedEvents.length - 1];
    console.log("最近完成的订单:");
    console.log(`  Merchant: ${latestOrder.args.merchant}`);
    console.log(`  ReceivedAmount: ${hre.ethers.utils.formatUnits(latestOrder.args.receivedAmount, 6)} USDC`);
    console.log(`  PlatformFee: ${hre.ethers.utils.formatUnits(latestOrder.args.platformFee, 6)} USDC`);
    console.log(`  Block: ${latestOrder.blockNumber}`);
    console.log(`  TX: ${latestOrder.transactionHash}\n`);

    // 计算期望的捐款金额
    const platformFee = latestOrder.args.platformFee;
    const expectedDonation = platformFee.mul(500).div(10000); // 5% of platform fee
    console.log(`  期望捐款 (5% of platform fee): ${hre.ethers.utils.formatUnits(expectedDonation, 6)} USDC\n`);
  }

  // 2. 查询 DonationProcessed 事件
  console.log("💰 步骤 2: 查询 DonationProcessed 事件\n");

  const donationFilter = paymentGateway.filters.DonationProcessed();
  const donationEvents = await paymentGateway.queryFilter(donationFilter, fromBlock, 'latest');

  console.log(`找到 ${donationEvents.length} 个 DonationProcessed 事件\n`);

  let latestDonationTx = null;
  if (donationEvents.length > 0) {
    for (const event of donationEvents) {
      console.log(`  Recipient: ${event.args.recipient}`);
      console.log(`  Amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
      console.log(`  Block: ${event.blockNumber}`);
      console.log(`  TX: ${event.transactionHash}\n`);
      latestDonationTx = event.transactionHash;
    }
  }

  // 3. 查询 DonationReceived 事件
  console.log("🎁 步骤 3: 查询 DonationReceived 事件 (PublicGoodsFund)\n");

  const receivedFilter = publicGoodsFund.filters.DonationReceived();
  const receivedEvents = await publicGoodsFund.queryFilter(receivedFilter, fromBlock, 'latest');

  console.log(`找到 ${receivedEvents.length} 个 DonationReceived 事件\n`);

  if (receivedEvents.length > 0) {
    for (const event of receivedEvents) {
      console.log(`  Contributor: ${event.args.contributor}`);
      console.log(`  Token: ${event.args.token}`);
      console.log(`  Amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
      console.log(`  Timestamp: ${event.args.timestamp.toString()}`);
      console.log(`  Block: ${event.blockNumber}`);
      console.log(`  TX: ${event.transactionHash}\n`);
    }
  } else {
    console.log("  ❌ 没有找到 DonationReceived 事件");
    console.log("  这说明 contributeFee() 调用失败了！\n");

    // 如果有 DonationProcessed 但没有 DonationReceived，说明调用被 catch 了
    if (latestDonationTx) {
      console.log("  📋 分析最近的 DonationProcessed 交易...\n");

      const receipt = await hre.ethers.provider.getTransactionReceipt(latestDonationTx);

      console.log("  交易日志数量:", receipt.logs.length);
      console.log("  Gas Used:", receipt.gasUsed.toString());

      // 检查是否有转账到 donationAddress
      const donationAddress = await paymentGateway.donationAddress();
      console.log("\n  DonationAddress:", donationAddress);

      // 查找 Transfer 事件
      console.log("\n  查找 ERC20 Transfer 事件:");
      for (const log of receipt.logs) {
        // Transfer event signature
        if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
          const from = "0x" + log.topics[1].slice(26);
          const to = "0x" + log.topics[2].slice(26);
          const amount = hre.ethers.BigNumber.from(log.data);

          console.log(`\n    Transfer:`);
          console.log(`      From: ${from}`);
          console.log(`      To: ${to}`);
          console.log(`      Amount: ${hre.ethers.utils.formatUnits(amount, 6)} USDC`);

          if (to.toLowerCase() === CONTRACTS.PUBLIC_GOODS_FUND_V2.toLowerCase()) {
            console.log(`      ✅ 发送到 PublicGoodsFund`);
          } else if (to.toLowerCase() === donationAddress.toLowerCase()) {
            console.log(`      ⚠️ 发送到 donationAddress (fallback)`);
          }
        }
      }
    }
  }

  // 4. 检查 PublicGoodsFund 当前状态
  console.log("\n📊 步骤 4: PublicGoodsFund 当前状态\n");

  const totalDonations = await publicGoodsFund.totalLifetimeDonations();
  const totalContributors = await publicGoodsFund.getTotalContributors();
  const userContribution = await publicGoodsFund.contributors(user.address);

  console.log(`  totalLifetimeDonations: ${hre.ethers.utils.formatUnits(totalDonations, 6)} USDC`);
  console.log(`  totalContributors: ${totalContributors.toString()}`);
  console.log(`  您的贡献: ${hre.ethers.utils.formatUnits(userContribution, 6)} USDC`);

  console.log("\n" + "=".repeat(70));
  console.log("🎯 分析完成！\n");

  // 总结
  if (donationEvents.length > 0 && receivedEvents.length === 0) {
    console.log("❌ 问题确认:");
    console.log("  - DonationProcessed 事件存在（PaymentGateway 尝试发送捐款）");
    console.log("  - DonationReceived 事件不存在（PublicGoodsFund 没有收到）");
    console.log("  - 说明 contributeFee() 调用失败，触发了 catch 分支");
    console.log("\n可能原因:");
    console.log("  1. safeTransferFrom 失败（授权不足或余额不足）");
    console.log("  2. contributeFee 函数内部 revert");
    console.log("  3. Gas 不足");
  } else if (donationEvents.length > 0 && receivedEvents.length > 0) {
    console.log("✅ 捐款成功记录！");
  } else {
    console.log("⚠️ 没有发现捐款活动");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

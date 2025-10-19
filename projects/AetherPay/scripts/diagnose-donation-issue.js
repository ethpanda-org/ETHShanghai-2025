/**
 * 诊断 PublicGoodsFundV2 捐款记录问题
 * 检查链上实际数据
 */

const hre = require("hardhat");

// 合约地址
const CONTRACTS = {
  PUBLIC_GOODS_FUND_V2: '0xb83aABD1ebFEefC0AeFbeDE5738d3894abD70C4D',
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
};

async function main() {
  console.log("\n🔍 诊断 PublicGoodsFundV2 捐款记录问题\n");
  console.log("=".repeat(70));

  const [user] = await hre.ethers.getSigners();
  console.log(`用户地址: ${user.address}\n`);

  // 连接到合约
  const PublicGoodsFundV2 = await hre.ethers.getContractFactory("PublicGoodsFundV2");
  const publicGoodsFund = PublicGoodsFundV2.attach(CONTRACTS.PUBLIC_GOODS_FUND_V2);

  const PaymentGatewayV2 = await hre.ethers.getContractFactory("PaymentGatewayV2");
  const paymentGateway = PaymentGatewayV2.attach(CONTRACTS.PAYMENT_GATEWAY_V2);

  console.log("📊 步骤 1: 检查 PublicGoodsFundV2 全局状态");
  console.log("-".repeat(70));

  try {
    // 检查全局统计
    const totalLifetimeDonations = await publicGoodsFund.totalLifetimeDonations();
    const totalTransactions = await publicGoodsFund.totalTransactions();
    const totalContributors = await publicGoodsFund.getTotalContributors();

    console.log(`总捐款额: ${hre.ethers.utils.formatUnits(totalLifetimeDonations, 6)} USDC`);
    console.log(`总交易数: ${totalTransactions.toString()}`);
    console.log(`总贡献者: ${totalContributors.toString()}`);

    // 检查代币余额
    const tokenBalance = await publicGoodsFund.tokenBalances(CONTRACTS.MOCK_USDC);
    console.log(`合约 USDC 余额: ${hre.ethers.utils.formatUnits(tokenBalance, 6)} USDC`);

    // 检查授权
    const isAuthorized = await publicGoodsFund.authorizedGateways(CONTRACTS.PAYMENT_GATEWAY_V2);
    console.log(`PaymentGatewayV2 授权状态: ${isAuthorized ? '✅ 已授权' : '❌ 未授权'}`);

  } catch (error) {
    console.error("❌ 读取全局状态失败:", error.message);
  }

  console.log("\n📊 步骤 2: 检查用户贡献数据");
  console.log("-".repeat(70));

  try {
    // 直接读取 contributors mapping
    const userContribution = await publicGoodsFund.contributors(user.address);
    console.log(`contributors[${user.address}]: ${hre.ethers.utils.formatUnits(userContribution, 6)} USDC`);

    // 调用 getContributorInfo
    const contributorInfo = await publicGoodsFund.getContributorInfo(user.address);
    console.log(`getContributorInfo():`);
    console.log(`  totalContributed: ${hre.ethers.utils.formatUnits(contributorInfo.totalContributed, 6)} USDC`);
    console.log(`  level: ${contributorInfo.level}`);

  } catch (error) {
    console.error("❌ 读取用户数据失败:", error.message);
  }

  console.log("\n📊 步骤 3: 检查 PaymentGatewayV2 配置");
  console.log("-".repeat(70));

  try {
    // 检查 PublicGoodsFund 地址
    const fundAddress = await paymentGateway.publicGoodsFund();
    console.log(`PaymentGatewayV2.publicGoodsFund: ${fundAddress}`);
    console.log(`是否正确: ${fundAddress.toLowerCase() === CONTRACTS.PUBLIC_GOODS_FUND_V2.toLowerCase() ? '✅ 正确' : '❌ 错误'}`);

    // 检查捐赠百分比
    const donationPercentage = await paymentGateway.donationPercentage();
    console.log(`donationPercentage: ${donationPercentage.toString()} (${donationPercentage / 100}%)`);

    // 检查平台费率
    const platformFeeRate = await paymentGateway.platformFeeRate();
    console.log(`platformFeeRate: ${platformFeeRate.toString()} (${platformFeeRate / 100}%)`);

  } catch (error) {
    console.error("❌ 读取 PaymentGateway 配置失败:", error.message);
  }

  console.log("\n📊 步骤 4: 查询最近的捐款事件");
  console.log("-".repeat(70));

  try {
    // 获取最近 1000 个区块的事件
    const currentBlock = await hre.ethers.provider.getBlockNumber();
    const fromBlock = currentBlock > 1000 ? currentBlock - 1000 : 0;

    console.log(`查询区块范围: ${fromBlock} -> ${currentBlock}`);

    // 查询 DonationReceived 事件
    const filter = publicGoodsFund.filters.DonationReceived(null, null);
    const events = await publicGoodsFund.queryFilter(filter, fromBlock, 'latest');

    console.log(`\n找到 ${events.length} 个 DonationReceived 事件:\n`);

    if (events.length > 0) {
      let totalFromEvents = hre.ethers.BigNumber.from(0);
      let userEventsCount = 0;
      let userTotalFromEvents = hre.ethers.BigNumber.from(0);

      for (const event of events) {
        const contributor = event.args.contributor;
        const token = event.args.token;
        const amount = event.args.amount;
        const timestamp = event.args.timestamp;

        const date = new Date(timestamp.toNumber() * 1000);
        const isUser = contributor.toLowerCase() === user.address.toLowerCase();

        console.log(`  ${isUser ? '👤 [YOU]' : '   '} Contributor: ${contributor.slice(0, 10)}...`);
        console.log(`        Amount: ${hre.ethers.utils.formatUnits(amount, 6)} USDC`);
        console.log(`        Time: ${date.toLocaleString()}`);
        console.log(`        Block: ${event.blockNumber}`);
        console.log();

        totalFromEvents = totalFromEvents.add(amount);

        if (isUser) {
          userEventsCount++;
          userTotalFromEvents = userTotalFromEvents.add(amount);
        }
      }

      console.log("-".repeat(70));
      console.log(`事件统计:`);
      console.log(`  所有捐款总额: ${hre.ethers.utils.formatUnits(totalFromEvents, 6)} USDC`);
      console.log(`  你的捐款笔数: ${userEventsCount}`);
      console.log(`  你的捐款总额: ${hre.ethers.utils.formatUnits(userTotalFromEvents, 6)} USDC`);
    } else {
      console.log("⚠️ 没有找到任何 DonationReceived 事件");
    }

  } catch (error) {
    console.error("❌ 查询事件失败:", error.message);
  }

  console.log("\n📊 步骤 5: 查询 DonationProcessed 事件（来自 PaymentGateway）");
  console.log("-".repeat(70));

  try {
    const currentBlock = await hre.ethers.provider.getBlockNumber();
    const fromBlock = currentBlock > 1000 ? currentBlock - 1000 : 0;

    // 查询 DonationProcessed 事件
    const filter = paymentGateway.filters.DonationProcessed();
    const events = await paymentGateway.queryFilter(filter, fromBlock, 'latest');

    console.log(`找到 ${events.length} 个 DonationProcessed 事件:\n`);

    if (events.length > 0) {
      let totalProcessed = hre.ethers.BigNumber.from(0);

      for (const event of events) {
        const recipient = event.args.recipient;
        const amount = event.args.amount;

        console.log(`  Recipient: ${recipient}`);
        console.log(`  Amount: ${hre.ethers.utils.formatUnits(amount, 6)} USDC`);
        console.log(`  Block: ${event.blockNumber}`);
        console.log();

        totalProcessed = totalProcessed.add(amount);
      }

      console.log("-".repeat(70));
      console.log(`总处理金额: ${hre.ethers.utils.formatUnits(totalProcessed, 6)} USDC`);
    } else {
      console.log("⚠️ 没有找到任何 DonationProcessed 事件");
    }

  } catch (error) {
    console.error("❌ 查询 PaymentGateway 事件失败:", error.message);
  }

  console.log("\n" + "=".repeat(70));
  console.log("🎯 诊断完成！\n");

  // 总结
  console.log("💡 问题分析:");
  console.log("1. 如果 'DonationReceived' 事件存在但金额很小 → contributeFee() 传入的金额不对");
  console.log("2. 如果 'DonationReceived' 事件不存在 → contributeFee() 没有被调用");
  console.log("3. 如果 'contributors[user]' 为 0 但事件存在 → 数据没有正确写入");
  console.log("4. 检查 'DonationProcessed' 金额是否与预期匹配（$20 × 0.3% × 5% = $0.003）");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

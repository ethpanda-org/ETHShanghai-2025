/**
 * 检查特定用户在 PublicGoodsFundV2 合约上的贡献记录
 */

const hre = require("hardhat");

// 从 deployment-final.json 读取的正确地址
const CONTRACTS = {
  PUBLIC_GOODS_FUND_V2: '0xa3CA872b3876FbC2a6759256e57583A25555B4Cb',
  PAYMENT_GATEWAY_V2: '0x119122157f5988d65D2D8B1A8b327C2eD27E9417',
};

async function main() {
  console.log("\n🔍 检查用户贡献记录\n");
  console.log("=".repeat(70));

  // 获取当前账户
  const [deployer] = await hre.ethers.getSigners();
  const userAddress = deployer.address;

  console.log(`\n当前账户: ${userAddress}`);
  console.log(`合约地址: ${CONTRACTS.PUBLIC_GOODS_FUND_V2}\n`);

  // 连接 PublicGoodsFundV2 合约
  const publicGoodsFund = await hre.ethers.getContractAt(
    "PublicGoodsFundV2",
    CONTRACTS.PUBLIC_GOODS_FUND_V2
  );

  // 1. 读取用户贡献金额
  console.log("📊 步骤 1: 读取 contributors mapping\n");
  const userContribution = await publicGoodsFund.contributors(userAddress);
  console.log(`  contributors[${userAddress}] = ${hre.ethers.utils.formatUnits(userContribution, 6)} USDC\n`);

  // 2. 调用 getContributorInfo
  console.log("📊 步骤 2: 调用 getContributorInfo\n");
  try {
    const contributorInfo = await publicGoodsFund.getContributorInfo(userAddress);
    console.log(`  totalContributed: ${hre.ethers.utils.formatUnits(contributorInfo[0], 6)} USDC`);
    console.log(`  lastContributionTime: ${contributorInfo[1].toString()}`);
    console.log(`  badgeLevel: ${contributorInfo[2]}\n`);
  } catch (error) {
    console.log(`  ❌ 调用失败: ${error.message}\n`);
  }

  // 3. 读取全局统计
  console.log("📊 步骤 3: 全局统计\n");
  const totalDonations = await publicGoodsFund.totalLifetimeDonations();
  const totalContributors = await publicGoodsFund.getTotalContributors();
  console.log(`  totalLifetimeDonations: ${hre.ethers.utils.formatUnits(totalDonations, 6)} USDC`);
  console.log(`  totalContributors: ${totalContributors.toString()}\n`);

  // 4. 查询 DonationReceived 事件（最近 200 个区块）
  console.log("📊 步骤 4: 查询 DonationReceived 事件\n");
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 200;

  console.log(`  查询区块范围: ${fromBlock} -> ${currentBlock}\n`);

  const receivedFilter = publicGoodsFund.filters.DonationReceived(userAddress);
  const receivedEvents = await publicGoodsFund.queryFilter(receivedFilter, fromBlock, 'latest');

  console.log(`  找到 ${receivedEvents.length} 个 DonationReceived 事件\n`);

  if (receivedEvents.length > 0) {
    for (const event of receivedEvents) {
      console.log(`  📝 事件 #${event.blockNumber}:`);
      console.log(`     Contributor: ${event.args.contributor}`);
      console.log(`     Token: ${event.args.token}`);
      console.log(`     Amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
      console.log(`     Timestamp: ${event.args.timestamp.toString()}`);
      console.log(`     TX: ${event.transactionHash}\n`);
    }
  } else {
    console.log("  ❌ 没有找到此用户的 DonationReceived 事件\n");
    console.log("  可能原因:");
    console.log("    1. 用户从未在此合约上有过贡献");
    console.log("    2. 贡献事件发生在 200 个区块之前");
    console.log("    3. 使用了不同的钱包地址进行支付\n");
  }

  // 5. 查询所有的 DonationReceived 事件（不限地址）
  console.log("📊 步骤 5: 查询所有 DonationReceived 事件\n");
  const allReceivedFilter = publicGoodsFund.filters.DonationReceived();
  const allReceivedEvents = await publicGoodsFund.queryFilter(allReceivedFilter, fromBlock, 'latest');

  console.log(`  找到 ${allReceivedEvents.length} 个 DonationReceived 事件（所有用户）\n`);

  if (allReceivedEvents.length > 0) {
    console.log("  最近的贡献记录:\n");
    const recentEvents = allReceivedEvents.slice(-5); // 最近 5 个
    for (const event of recentEvents) {
      console.log(`  📝 事件 #${event.blockNumber}:`);
      console.log(`     Contributor: ${event.args.contributor}`);
      console.log(`     Amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
      console.log(`     TX: ${event.transactionHash}\n`);
    }
  }

  console.log("=".repeat(70));
  console.log("\n✅ 检查完成\n");

  // 6. 总结
  console.log("📋 诊断结果:\n");

  if (userContribution.gt(0)) {
    console.log(`  ✅ 用户在合约上有贡献记录: ${hre.ethers.utils.formatUnits(userContribution, 6)} USDC`);
    console.log(`  ✅ 前端应该能够显示这个金额`);
    console.log(`\n  如果前端显示 $0.0000，可能是:`);
    console.log(`    1. 前端缓存问题 - 请硬刷新浏览器 (Ctrl+Shift+R)`);
    console.log(`    2. 前端服务器未重启 - 请重启 npm run dev`);
    console.log(`    3. 使用了不同的钱包地址`);
  } else {
    console.log(`  ❌ 用户在此合约上没有贡献记录`);
    console.log(`\n  可能原因:`);
    console.log(`    1. 支付时使用了不同的钱包地址`);
    console.log(`    2. 贡献记录在旧合约上 (0x2f17730A67A19a3Ca2c61f80720E922C553299da)`);
    console.log(`    3. 捐款功能未正常工作`);
    console.log(`\n  建议:`);
    console.log(`    1. 检查支付订单时使用的钱包地址`);
    console.log(`    2. 运行 check-latest-order.js 查看最近的订单详情`);
  }

  console.log("\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

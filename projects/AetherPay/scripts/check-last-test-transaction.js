/**
 * 检查刚才测试交易的详细日志
 */

const hre = require("hardhat");

const CONTRACTS = {
  PUBLIC_GOODS_FUND_V2: '0x2f17730A67A19a3Ca2c61f80720E922C553299da',
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
};

async function main() {
  console.log("\n🔍 检查最近的测试交易\n");
  console.log("=".repeat(70));

  const PublicGoodsFundV2 = await hre.ethers.getContractFactory("PublicGoodsFundV2");
  const publicGoodsFund = PublicGoodsFundV2.attach(CONTRACTS.PUBLIC_GOODS_FUND_V2);

  const PaymentGatewayV2 = await hre.ethers.getContractFactory("PaymentGatewayV2");
  const paymentGateway = PaymentGatewayV2.attach(CONTRACTS.PAYMENT_GATEWAY_V2);

  // 获取最近区块
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock - 20; // 最近 20 个区块

  console.log(`查询区块范围: ${fromBlock} -> ${currentBlock}\n`);

  // 查询 DonationProcessed 事件
  const processedFilter = paymentGateway.filters.DonationProcessed();
  const processedEvents = await paymentGateway.queryFilter(processedFilter, fromBlock, 'latest');

  console.log(`找到 ${processedEvents.length} 个 DonationProcessed 事件\n`);

  if (processedEvents.length > 0) {
    const latestEvent = processedEvents[processedEvents.length - 1];
    const txHash = latestEvent.transactionHash;
    const blockNumber = latestEvent.blockNumber;

    console.log("最新的 DonationProcessed:");
    console.log(`  Recipient: ${latestEvent.args.recipient}`);
    console.log(`  Amount: ${hre.ethers.utils.formatUnits(latestEvent.args.amount, 6)} USDC`);
    console.log(`  Block: ${blockNumber}`);
    console.log(`  TX: ${txHash}\n`);

    // 获取完整交易收据
    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);

    console.log("交易状态:", receipt.status === 1 ? "✅ Success" : "❌ Failed");
    console.log(`Gas Used: ${receipt.gasUsed.toString()}\n`);

    // 查找 DonationReceived 事件
    const receivedFilter = publicGoodsFund.filters.DonationReceived();
    const receivedEvents = await publicGoodsFund.queryFilter(receivedFilter, blockNumber, blockNumber);

    console.log(`在同一区块找到 ${receivedEvents.length} 个 DonationReceived 事件\n`);

    if (receivedEvents.length > 0) {
      for (const event of receivedEvents) {
        if (event.transactionHash === txHash) {
          console.log("✅ 找到对应的 DonationReceived:");
          console.log(`  Contributor: ${event.args.contributor}`);
          console.log(`  Token: ${event.args.token}`);
          console.log(`  Amount: ${hre.ethers.utils.formatUnits(event.args.amount, 6)} USDC`);
        }
      }
    } else {
      console.log("❌ 没有找到 DonationReceived 事件");
      console.log("这说明 contributeFee() 失败，触发了 catch 分支\n");

      // 解析所有日志
      console.log("📋 解析交易中的所有事件:\n");

      for (const log of receipt.logs) {
        try {
          // 尝试用 PaymentGateway 接口解析
          const parsed = paymentGateway.interface.parseLog(log);
          console.log(`  [PaymentGateway] ${parsed.name}`);
          if (parsed.name === "DonationProcessed") {
            console.log(`    recipient: ${parsed.args.recipient}`);
            console.log(`    amount: ${hre.ethers.utils.formatUnits(parsed.args.amount, 6)} USDC`);
          }
        } catch (e1) {
          try {
            // 尝试用 PublicGoodsFund 接口解析
            const parsed = publicGoodsFund.interface.parseLog(log);
            console.log(`  [PublicGoodsFund] ${parsed.name}`);
            if (parsed.name === "DonationReceived") {
              console.log(`    contributor: ${parsed.args.contributor}`);
              console.log(`    amount: ${hre.ethers.utils.formatUnits(parsed.args.amount, 6)} USDC`);
            }
          } catch (e2) {
            // 尝试解析 ERC20 Transfer 事件
            if (log.topics[0] === "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef") {
              const from = "0x" + log.topics[1].slice(26);
              const to = "0x" + log.topics[2].slice(26);
              const amount = hre.ethers.BigNumber.from(log.data);
              console.log(`  [ERC20] Transfer`);
              console.log(`    from: ${from}`);
              console.log(`    to: ${to}`);
              console.log(`    amount: ${hre.ethers.utils.formatUnits(amount, 6)} USDC`);
            }
          }
        }
      }
    }

    // 检查合约状态
    console.log("\n📊 检查 PublicGoodsFundV2 当前状态:\n");

    const totalDonations = await publicGoodsFund.totalLifetimeDonations();
    const totalContributors = await publicGoodsFund.getTotalContributors();

    console.log(`  totalLifetimeDonations: ${hre.ethers.utils.formatUnits(totalDonations, 6)} USDC`);
    console.log(`  totalContributors: ${totalContributors.toString()}`);

    // 检查授权状态
    const isAuthorized = await publicGoodsFund.authorizedGateways(CONTRACTS.PAYMENT_GATEWAY_V2);
    console.log(`\n  PaymentGatewayV2 授权状态: ${isAuthorized ? '✅ 已授权' : '❌ 未授权'}`);

    // 检查 PaymentGateway 的 publicGoodsFund 地址
    const fundAddress = await paymentGateway.publicGoodsFund();
    console.log(`  PaymentGateway.publicGoodsFund: ${fundAddress}`);
    console.log(`  是否指向新合约: ${fundAddress.toLowerCase() === CONTRACTS.PUBLIC_GOODS_FUND_V2.toLowerCase() ? '✅ 正确' : '❌ 错误'}`);
  }

  console.log("\n" + "=".repeat(70));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

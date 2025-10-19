/**
 * 检查具体的捐款交易细节
 */

const hre = require("hardhat");

const CONTRACTS = {
  PUBLIC_GOODS_FUND_V2: '0xb83aABD1ebFEefC0AeFbeDE5738d3894abD70C4D',
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',
};

async function main() {
  console.log("\n🔍 检查捐款交易详情\n");
  console.log("=".repeat(70));

  const PaymentGatewayV2 = await hre.ethers.getContractFactory("PaymentGatewayV2");
  const paymentGateway = PaymentGatewayV2.attach(CONTRACTS.PAYMENT_GATEWAY_V2);

  // 查询 DonationProcessed 事件
  const currentBlock = await hre.ethers.provider.getBlockNumber();
  const fromBlock = currentBlock > 1000 ? currentBlock - 1000 : 0;

  const filter = paymentGateway.filters.DonationProcessed();
  const events = await paymentGateway.queryFilter(filter, fromBlock, 'latest');

  console.log(`找到 ${events.length} 个 DonationProcessed 事件\n`);

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    const { recipient, amount } = event.args;
    const blockNumber = event.blockNumber;
    const txHash = event.transactionHash;

    console.log(`\n事件 #${i + 1}:`);
    console.log(`  Recipient: ${recipient}`);
    console.log(`  Amount: ${hre.ethers.utils.formatUnits(amount, 6)} USDC`);
    console.log(`  Block: ${blockNumber}`);
    console.log(`  TX Hash: ${txHash}`);

    // 获取交易收据
    try {
      const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);
      console.log(`  Status: ${receipt.status === 1 ? '✅ Success' : '❌ Failed'}`);
      console.log(`  Gas Used: ${receipt.gasUsed.toString()}`);

      // 查找 DonationReceived 事件
      const PublicGoodsFundV2 = await hre.ethers.getContractFactory("PublicGoodsFundV2");
      const publicGoodsFund = PublicGoodsFundV2.attach(CONTRACTS.PUBLIC_GOODS_FUND_V2);

      const donationReceivedFilter = publicGoodsFund.filters.DonationReceived();
      const donationEvents = await publicGoodsFund.queryFilter(
        donationReceivedFilter,
        blockNumber,
        blockNumber
      );

      console.log(`  DonationReceived 事件: ${donationEvents.length} 个`);

      if (donationEvents.length > 0) {
        for (const dEvent of donationEvents) {
          if (dEvent.transactionHash === txHash) {
            console.log(`    ✅ 找到对应的 DonationReceived`);
            console.log(`    Amount: ${hre.ethers.utils.formatUnits(dEvent.args.amount, 6)} USDC`);
            console.log(`    Contributor: ${dEvent.args.contributor}`);
          }
        }
      } else {
        console.log(`    ❌ 没有找到对应的 DonationReceived 事件`);
        console.log(`    这说明 contributeFee() 调用可能失败了！`);

        // 解析所有日志
        console.log(`\n  📋 交易日志分析:`);
        for (const log of receipt.logs) {
          try {
            if (log.address.toLowerCase() === CONTRACTS.PUBLIC_GOODS_FUND_V2.toLowerCase()) {
              const parsed = publicGoodsFund.interface.parseLog(log);
              console.log(`    Event: ${parsed.name}`);
              console.log(`    Args:`, parsed.args);
            }
          } catch (e) {
            // 无法解析的日志
          }
        }
      }

    } catch (error) {
      console.log(`  ❌ 获取交易详情失败: ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("🎯 分析完成！\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

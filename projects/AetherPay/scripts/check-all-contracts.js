const { ethers } = require('hardhat');

async function main() {
  console.log('\n🔍 全面检查合约状态和订单\n');

  const [signer] = await ethers.getSigners();
  const userAddress = signer.address;
  console.log('当前钱包地址:', userAddress);
  console.log('');

  // 所有已知的合约地址
  const contracts = [
    { name: 'PaymentGateway V1', address: '0xe624C84633FA9C3D250222b202059d03830C52cf', deployDate: '2025-09-30' },
    { name: 'PaymentGateway V2 (Oct 8)', address: '0x7aC993ee1E0b00C319b90822C701dF61896141BA', deployDate: '2025-10-08' },
    { name: 'PaymentGateway V2 (Oct 11)', address: '0xdd0F17F87F60A39ab6004160cc2b503b24a518F8', deployDate: '2025-10-11' },
    { name: 'Old Contract', address: '0x4995168D409767330D9693034d5cFfc7daFFb89B', deployDate: 'Unknown' }
  ];

  for (const contract of contracts) {
    console.log(`\n========== ${contract.name} ==========`);
    console.log(`地址: ${contract.address}`);
    console.log(`部署时间: ${contract.deployDate}`);

    try {
      const gateway = await ethers.getContractAt('PaymentGatewayV2', contract.address);

      // 检查商家信息
      try {
        const merchantInfo = await gateway.getMerchantInfo(userAddress);
        if (merchantInfo && merchantInfo[5]) { // isActive
          console.log('✅ 商家已注册!');
          console.log('  - 商家名称:', merchantInfo[0]);
          console.log('  - 总订单数:', merchantInfo[1].toString());
          console.log('  - 总交易量:', ethers.formatUnits(merchantInfo[2], 6), 'USDC');
          console.log('  - 待提现余额:', ethers.formatUnits(merchantInfo[3], 6), 'USDC');
        } else {
          console.log('❌ 商家未注册');
        }
      } catch (e) {
        console.log('❌ 无法获取商家信息');
      }

      // 检查订单
      try {
        const orderCount = await gateway.getMerchantOrderCount(userAddress);
        console.log('📦 订单总数:', orderCount.toString());

        if (orderCount > 0) {
          // 获取前5个订单
          const orders = await gateway.getMerchantOrders(userAddress, 0, 5);
          console.log(`📋 前${Math.min(5, orders.length)}个订单:`);

          for (const order of orders) {
            console.log(`  - 订单ID: ${order.orderIdString || order.orderId}`);
            console.log(`    金额: ${ethers.formatUnits(order.orderAmount, 6)} USDC`);
            console.log(`    状态: ${['PENDING', 'PARTIAL', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'][order.status]}`);
          }
        }
      } catch (e) {
        console.log('❌ 无法获取订单信息');
      }

    } catch (error) {
      console.log('❌ 合约不可访问或不存在');
    }
  }

  // 检查 PublicGoodsFund
  console.log('\n========== PublicGoodsFund ==========');
  const publicGoodsAddress = '0xCc9b8861CB2e42A043376433A73F2f019A7B2e1B';
  console.log(`地址: ${publicGoodsAddress}`);

  try {
    const publicGoods = await ethers.getContractAt('PublicGoodsFund', publicGoodsAddress);

    const totalDonations = await publicGoods.totalLifetimeDonations();
    console.log('💰 平台总捐赠:', ethers.formatUnits(totalDonations, 6), 'USDC');

    const contributorInfo = await publicGoods.getContributorInfo(userAddress);
    console.log('👤 您的贡献:');
    console.log('  - 总贡献:', ethers.formatUnits(contributorInfo[0], 6), 'USDC');
    console.log('  - 徽章等级:', contributorInfo[2]);
  } catch (e) {
    console.log('❌ 无法访问 PublicGoodsFund');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
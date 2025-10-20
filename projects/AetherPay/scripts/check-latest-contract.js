const { ethers } = require('hardhat');

async function main() {
  console.log('\n🔍 检查最新合约订单状态\n');

  const [signer] = await ethers.getSigners();
  const userAddress = signer.address;
  console.log('钱包地址:', userAddress);

  // 最新的合约地址（10月11日部署）
  const GATEWAY_V2 = '0xdd0F17F87F60A39ab6004160cc2b503b24a518F8';
  console.log('合约地址:', GATEWAY_V2);
  console.log('');

  const gateway = await ethers.getContractAt('PaymentGatewayV2', GATEWAY_V2);

  // 获取商家信息
  console.log('📊 商家信息:');
  const merchantInfo = await gateway.getMerchantInfo(userAddress);
  console.log('  商家名称:', merchantInfo[0]);
  console.log('  总订单数:', merchantInfo[1].toString());
  console.log('  总交易量:', ethers.formatUnits(merchantInfo[2], 6), 'USDC');
  console.log('  待提现余额:', ethers.formatUnits(merchantInfo[3], 6), 'USDC');
  console.log('  费率:', merchantInfo[4].toString(), 'bps');
  console.log('  是否激活:', merchantInfo[5]);

  // 如果有订单，获取详情
  if (merchantInfo[1] > 0) {
    console.log('\n📦 订单详情:');
    const orders = await gateway.getMerchantOrders(userAddress, 0, 10);
    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      console.log(`\n订单 #${i + 1}:`);
      console.log('  ID:', order.orderIdString);
      console.log('  金额:', ethers.formatUnits(order.orderAmount, 6), 'USDC');
      console.log('  状态:', ['PENDING', 'PARTIAL', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'][order.status]);
    }
  } else {
    console.log('\n❌ 没有订单记录');
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('错误:', error.message);
    process.exit(1);
  });
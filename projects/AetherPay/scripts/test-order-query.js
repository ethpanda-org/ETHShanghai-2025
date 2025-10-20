const { ethers } = require('hardhat');

const PAYMENT_GATEWAY_V2 = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const ORDER_ID = 'AP65ELTMI';

async function main() {
  console.log('\n🔍 测试订单查询方法\n');
  
  const gateway = await ethers.getContractAt('PaymentGatewayV2', PAYMENT_GATEWAY_V2);
  
  // 尝试方法 1: getOrderByString (5个返回值)
  try {
    console.log('📝 方法 1: getOrderByString');
    const result = await gateway.getOrderByString(ORDER_ID);
    console.log('✅ 成功!');
    console.log('  订单ID (bytes32):', result[0]);
    console.log('  商家:', result[1]);
    console.log('  买家:', result[2]);
    console.log('  订单金额:', ethers.formatUnits(result[3], 6), 'USDC');
    console.log('  状态:', result[4]);
  } catch (error) {
    console.log('❌ 失败:', error.message.split('(')[0]);
  }
  console.log('');
  
  // 尝试方法 2: getOrderDetailsByString (12个返回值)
  try {
    console.log('📝 方法 2: getOrderDetailsByString');
    const result = await gateway.getOrderDetailsByString(ORDER_ID);
    console.log('✅ 成功!');
    console.log('  订单ID (bytes32):', result[0]);
    console.log('  商家:', result[1]);
    console.log('  买家:', result[2]);
    console.log('  订单金额:', ethers.formatUnits(result[3], 6), 'USDC');
    console.log('  支付代币:', result[4]);
    console.log('  状态:', result[8]);
  } catch (error) {
    console.log('❌ 失败:', error.message.split('(')[0]);
  }
  console.log('');
  
  // 尝试方法 3: 先转换为 bytes32，再用 getOrder
  try {
    console.log('📝 方法 3: 使用 ethers.id() 转换为 bytes32');
    const orderIdBytes32 = ethers.id(ORDER_ID);
    console.log('  转换后的 bytes32:', orderIdBytes32);
    
    const result = await gateway.getOrder(orderIdBytes32);
    console.log('✅ 成功!');
    console.log('  商家:', result[0]);
    console.log('  买家:', result[1]);
    console.log('  订单金额:', ethers.formatUnits(result[2], 6), 'USDC');
    console.log('  已支付:', ethers.formatUnits(result[3], 6), 'USDC');
    console.log('  状态:', result[5]);
  } catch (error) {
    console.log('❌ 失败:', error.message.split('(')[0]);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

const { ethers } = require('hardhat');

const OLD_GATEWAY = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const NEW_GATEWAY = '0xdd0F17F87F60A39ab6004160cc2b503b24a518F8';
const ORDER_ID = '0x9768c4399f306c13c2b03c251e4cde9092f79a198270432af2e37c6516d1db42';

async function main() {
  console.log('\n🔍 检查订单位置\n');
  console.log('订单ID:', ORDER_ID);
  console.log('');

  try {
    // 检查旧合约
    console.log('1️⃣  检查旧合约:', OLD_GATEWAY);
    const oldGateway = await ethers.getContractAt('PaymentGatewayV2', OLD_GATEWAY);
    try {
      const order = await oldGateway.orders(ORDER_ID);
      if (order.merchant !== ethers.ZeroAddress) {
        console.log('   ✅ 订单在旧合约上！');
        console.log('   商家:', order.merchant);
        console.log('   买家:', order.payer);
        console.log('   金额:', ethers.formatUnits(order.orderAmount, 6), 'USDC');
        console.log('   支付代币:', order.paymentToken);
        console.log('   状态:', order.status);
        console.log('');
        console.log('❌ **这就是问题所在！**');
        console.log('');
        console.log('订单在旧合约上创建，但你在新合约上支付！');
        console.log('');
        console.log('**解决方案**：');
        console.log('1. 在新合约上重新创建订单');
        console.log('2. 或者使用旧合约完成支付（不推荐）');
        console.log('');
        return;
      }
    } catch (error) {
      console.log('   ❌ 旧合约读取失败或订单不存在');
    }
    console.log('');

    // 检查新合约
    console.log('2️⃣  检查新合约:', NEW_GATEWAY);
    const newGateway = await ethers.getContractAt('PaymentGatewayV2', NEW_GATEWAY);
    try {
      const order = await newGateway.orders(ORDER_ID);
      if (order.merchant !== ethers.ZeroAddress) {
        console.log('   ✅ 订单在新合约上！');
        console.log('   商家:', order.merchant);
        console.log('   买家:', order.payer);
        console.log('   金额:', ethers.formatUnits(order.orderAmount, 6), 'USDC');
        console.log('   支付代币:', order.paymentToken);
        console.log('   状态:', order.status);
        console.log('');
        console.log('✅ 订单位置正确！');
        console.log('');
        console.log('那么问题应该是授权不足。');
        console.log('请在支付页面重新点击 "Approve USDC"。');
      } else {
        console.log('   ❌ 订单在新合约上不存在');
        console.log('');
        console.log('**结论**: 订单可能既不在旧合约也不在新合约，或者订单ID不正确。');
      }
    } catch (error) {
      console.log('   ❌ 新合约读取失败:', error.message);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

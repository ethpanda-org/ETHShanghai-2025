const { ethers } = require('hardhat');

const PAYMENT_GATEWAY_V2 = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const MOCK_USDC = '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3';
const ORDER_ID = 'AP65ELTMI';
const BUYER = '0x99f8C4e03181022125CAB1A9929Ab44027AD276a';

async function main() {
  console.log('\n🔍 快速诊断\n');

  try {
    const [signer] = await ethers.getSigners();
    console.log('使用签名者:', signer.address);
    console.log('');

    // 1. USDC 合约
    const usdc = await ethers.getContractAt(
      ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'],
      MOCK_USDC
    );

    // 2. 检查余额
    const balance = await usdc.balanceOf(BUYER);
    console.log('💰 买家余额:', ethers.formatUnits(balance, 6), 'USDC');

    // 3. 检查授权
    const allowance = await usdc.allowance(BUYER, PAYMENT_GATEWAY_V2);
    console.log('🔐 授权额度:', ethers.formatUnits(allowance, 6), 'USDC');
    console.log('    原始值:', allowance.toString());
    console.log('    是否 Max?', allowance === ethers.MaxUint256);
    console.log('');

    // 4. 网关合约
    const gateway = await ethers.getContractAt(
      ['function getOrderDetailsByString(string) view returns (bytes32,address,address,uint256,address,address,uint256,uint256,uint8,uint256,uint256,string)'],
      PAYMENT_GATEWAY_V2
    );

    // 5. 读取订单
    const order = await gateway.getOrderDetailsByString(ORDER_ID);
    console.log('📦 订单信息:');
    console.log('  订单金额:', ethers.formatUnits(order[3], 6), 'USDC');
    console.log('  支付代币:', order[4]);
    console.log('  商家:', order[1]);
    console.log('  指定买家:', order[2]);
    console.log('  状态:', ['Pending', 'Paid', 'Processing', 'Completed', 'Cancelled', 'Expired'][order[8]]);
    console.log('');

    // 6. 判断
    const orderAmount = order[3];
    const paymentToken = order[4];
    const merchant = order[1];
    const payer = order[2];

    console.log('🎯 诊断结果:\n');
    console.log('  余额充足?', balance >= orderAmount ? '✅ 是' : '❌ 否');
    console.log('  授权充足?', allowance >= orderAmount ? '✅ 是' : '❌ 否');
    console.log('  代币匹配?', paymentToken.toLowerCase() === MOCK_USDC.toLowerCase() ? '✅ 是' : '❌ 否');
    console.log('  买家匹配?', payer === ethers.ZeroAddress || payer.toLowerCase() === BUYER.toLowerCase() ? '✅ 是' : '❌ 否');
    console.log('');

    if (payer !== ethers.ZeroAddress) {
      console.log('⚠️  订单指定买家:', payer);
      console.log('   你的地址:', BUYER);
      console.log('   地址匹配?', payer.toLowerCase() === BUYER.toLowerCase() ? '✅ 是' : '❌ 否');
      console.log('');
    }

    // 7. 检查商家注册
    const merchantInfo = await ethers.getContractAt(
      ['function getMerchantInfo(address) view returns (string,uint256,uint256,uint256,uint256,bool)'],
      PAYMENT_GATEWAY_V2
    );
    const info = await merchantInfo.getMerchantInfo(merchant);
    console.log('👤 商家状态:');
    console.log('  商家名称:', info[0]);
    console.log('  是否激活:', info[5] ? '✅ 是' : '❌ 否');
    console.log('');

    if (!info[5]) {
      console.log('❌ 问题：商家未在 V2 网关注册！');
      console.log('   这可能导致支付失败。');
      console.log('');
    }

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

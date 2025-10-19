const { ethers } = require('hardhat');

const PAYMENT_GATEWAY_V2 = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const MOCK_USDC = '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3';
const ORDER_ID = 'AP65ELTMI';
const BUYER = '0x99f8C4e03181022125CAB1A9929Ab44027AD276a';

async function main() {
  console.log('\n🔍 兼容性诊断（使用旧ABI）\n');
  
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
    console.log('💰 买家 USDC 余额:', ethers.formatUnits(balance, 6), 'USDC');
    
    // 3. 检查授权
    const allowance = await usdc.allowance(BUYER, PAYMENT_GATEWAY_V2);
    console.log('🔐 对V2网关授权:', ethers.formatUnits(allowance, 6), 'USDC');
    console.log('    原始值:', allowance.toString());
    console.log('    是否Max?', allowance === ethers.MaxUint256 ? '✅ 是' : '❌ 否');
    console.log('');
    
    // 4. 使用旧的 ABI（5个返回值）
    const gateway = await ethers.getContractAt(
      ['function getOrderByString(string) view returns (bytes32,address,address,uint256,uint8)'],
      PAYMENT_GATEWAY_V2
    );
    
    // 5. 读取订单（旧方法）
    console.log('📦 读取订单信息（使用 getOrderByString）...');
    const order = await gateway.getOrderByString(ORDER_ID);
    console.log('  订单ID (bytes32):', order[0]);
    console.log('  商家地址:', order[1]);
    console.log('  指定买家:', order[2] === ethers.ZeroAddress ? '(公开订单)' : order[2]);
    console.log('  订单金额:', ethers.formatUnits(order[3], 6), 'USDC');
    console.log('  订单状态:', ['Pending', 'Paid', 'Processing', 'Completed', 'Cancelled', 'Expired'][order[4]]);
    console.log('');
    
    const orderAmount = order[3];
    const merchant = order[1];
    const payer = order[2];
    const status = order[4];
    
    // 6. 检查商家注册
    const merchantABI = await ethers.getContractAt(
      ['function getMerchantInfo(address) view returns (string,uint256,uint256,uint256,uint256,bool)'],
      PAYMENT_GATEWAY_V2
    );
    
    console.log('👤 检查商家注册状态...');
    const info = await merchantABI.getMerchantInfo(merchant);
    console.log('  商家名称:', info[0]);
    console.log('  总订单数:', info[1].toString());
    console.log('  是否激活:', info[5] ? '✅ 是' : '❌ 否');
    console.log('');
    
    // 7. 综合诊断
    console.log('🎯 综合诊断结果:\n');
    console.log(`  [ ${balance >= orderAmount ? '✅' : '❌'} ] 买家余额充足 (${ethers.formatUnits(balance, 6)} >= ${ethers.formatUnits(orderAmount, 6)} USDC)`);
    console.log(`  [ ${allowance >= orderAmount ? '✅' : '❌'} ] 买家授权充足 (${allowance === ethers.MaxUint256 ? 'Max' : ethers.formatUnits(allowance, 6)} USDC)`);
    console.log(`  [ ${info[5] ? '✅' : '❌'} ] 商家已在V2注册`);
    console.log(`  [ ${payer === ethers.ZeroAddress || payer.toLowerCase() === BUYER.toLowerCase() ? '✅' : '❌'} ] 买家有权限支付`);
    console.log(`  [ ${status === 0 ? '✅' : '❌'} ] 订单状态为 Pending`);
    console.log('');
    
    // 8. 问题定位
    if (!info[5]) {
      console.log('❌ 根本问题：商家未在 V2 网关注册！\n');
      console.log('   解决方案：');
      console.log('   1. 访问 http://localhost:3000/dashboard');
      console.log('   2. 连接商家钱包:', merchant);
      console.log('   3. 重新注册商家账户');
      console.log('   4. 等待交易确认');
      console.log('   5. 刷新页面，确认状态为 "Active"');
      console.log('');
    } else if (balance < orderAmount) {
      console.log('❌ 根本问题：买家余额不足！\n');
      console.log('   当前余额:', ethers.formatUnits(balance, 6), 'USDC');
      console.log('   需要金额:', ethers.formatUnits(orderAmount, 6), 'USDC');
      console.log('   差额:', ethers.formatUnits(orderAmount - balance, 6), 'USDC');
      console.log('');
    } else if (allowance < orderAmount) {
      console.log('❌ 根本问题：买家授权不足！\n');
      console.log('   当前授权:', allowance === ethers.MaxUint256 ? 'Max (理论上充足)' : ethers.formatUnits(allowance, 6) + ' USDC');
      console.log('   需要授权:', ethers.formatUnits(orderAmount, 6), 'USDC');
      console.log('');
      if (allowance === ethers.MaxUint256) {
        console.log('   ⚠️  注意：授权是Max但仍失败，可能是：');
        console.log('   1. RPC缓存问题 - 实际链上授权可能已被重置');
        console.log('   2. 授权给了错误的地址');
        console.log('   3. 代币合约地址不匹配');
        console.log('');
      }
    } else if (payer !== ethers.ZeroAddress && payer.toLowerCase() !== BUYER.toLowerCase()) {
      console.log('❌ 根本问题：买家无权限支付指定订单！\n');
      console.log('   订单指定买家:', payer);
      console.log('   你的地址:', BUYER);
      console.log('   只有指定买家可以支付此订单');
      console.log('');
    } else if (status !== 0) {
      console.log('❌ 根本问题：订单状态不是 Pending！\n');
      console.log('   当前状态:', ['Pending', 'Paid', 'Processing', 'Completed', 'Cancelled', 'Expired'][status]);
      console.log('   只有 Pending 状态的订单可以支付');
      console.log('');
    } else {
      console.log('✅ 所有检查都通过！\n');
      console.log('   理论上应该可以支付，但如果仍失败：');
      console.log('   1. 尝试刷新页面（Ctrl+Shift+R 硬刷新）');
      console.log('   2. 检查 MetaMask 连接的账户是否是:', BUYER);
      console.log('   3. 检查网络是否是 Optimism Sepolia');
      console.log('   4. 尝试重新授权（点击 Approve 再次授权）');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
    console.error('');
    
    if (error.message.includes('Order not found')) {
      console.log('订单不存在！可能原因：');
      console.log('1. 订单ID错误');
      console.log('2. 订单未在 V2 网关创建');
      console.log('3. 网络不对（确保连接 Optimism Sepolia）');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

const { ethers } = require('hardhat');

// 合约地址
const OLD_GATEWAY = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const NEW_GATEWAY = '0xdd0F17F87F60A39ab6004160cc2b503b24a518F8';
const USDC = '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3';

// 从交易日志获取的订单ID和金额
const ORDER_ID_HEX = '0xe111cf8912fab27f62073fada2766c9aedd1d604df7f7765d1787c89ba3a1126';
const ORDER_AMOUNT = '2000000'; // 2 USDC

async function main() {
  const buyerAddress = process.argv[2];
  
  if (!buyerAddress) {
    console.log('Usage: node scripts/diagnose-allowance-mismatch.js <买家地址>');
    console.log('Example: node scripts/diagnose-allowance-mismatch.js 0x99f8C4e03181022125CAB1A9929Ab44027AD276a');
    process.exit(1);
  }

  console.log('\n🔍 诊断授权错配问题\n');
  console.log('买家地址:', buyerAddress);
  console.log('订单ID:', ORDER_ID_HEX);
  console.log('订单金额:', ORDER_AMOUNT, '(2 USDC)');
  console.log('');

  try {
    // 1. USDC 合约
    const usdc = await ethers.getContractAt(
      ['function balanceOf(address) view returns (uint256)', 'function allowance(address,address) view returns (uint256)'],
      USDC
    );

    // 2. 检查余额
    console.log('💰 1. 检查 USDC 余额\n');
    const balance = await usdc.balanceOf(buyerAddress);
    console.log('   余额:', ethers.formatUnits(balance, 6), 'USDC');
    console.log('   原始值:', balance.toString());
    console.log('   充足?', balance >= BigInt(ORDER_AMOUNT) ? '✅ 是' : '❌ 否');
    console.log('');

    // 3. 检查对旧网关的授权
    console.log('🔐 2. 检查对 **旧网关** 的授权\n');
    const allowanceOld = await usdc.allowance(buyerAddress, OLD_GATEWAY);
    console.log('   旧网关:', OLD_GATEWAY);
    console.log('   授权额度:', ethers.formatUnits(allowanceOld, 6), 'USDC');
    console.log('   原始值:', allowanceOld.toString());
    console.log('   是否Max?', allowanceOld === ethers.MaxUint256 ? '✅ 是' : '❌ 否');
    console.log('   充足?', allowanceOld >= BigInt(ORDER_AMOUNT) ? '✅ 是' : '❌ 否');
    console.log('');

    // 4. 检查对新网关的授权（关键！）
    console.log('🔐 3. 检查对 **新网关** 的授权 (关键！)\n');
    const allowanceNew = await usdc.allowance(buyerAddress, NEW_GATEWAY);
    console.log('   新网关:', NEW_GATEWAY);
    console.log('   授权额度:', ethers.formatUnits(allowanceNew, 6), 'USDC');
    console.log('   原始值:', allowanceNew.toString());
    console.log('   是否Max?', allowanceNew === ethers.MaxUint256 ? '✅ 是' : '❌ 否');
    console.log('   充足?', allowanceNew >= BigInt(ORDER_AMOUNT) ? '✅ 是' : '❌ 否');
    console.log('');

    // 5. 分析问题
    console.log('🎯 4. 问题分析\n');
    
    if (allowanceOld >= BigInt(ORDER_AMOUNT) && allowanceNew < BigInt(ORDER_AMOUNT)) {
      console.log('❌ **问题确认：授权错配！**\n');
      console.log('   你授权给了旧网关，但现在支付调用新网关。');
      console.log('   旧网关授权:', ethers.formatUnits(allowanceOld, 6), 'USDC');
      console.log('   新网关授权:', ethers.formatUnits(allowanceNew, 6), 'USDC');
      console.log('   需要授权:', ethers.formatUnits(ORDER_AMOUNT, 6), 'USDC');
      console.log('');
      console.log('✅ **解决方案**：\n');
      console.log('   1. 访问支付页面');
      console.log('   2. 刷新页面（Ctrl+Shift+R 硬刷新）');
      console.log('   3. 点击 "Approve USDC" 按钮');
      console.log('   4. 确认 MetaMask 交易（授权给新网关）');
      console.log('   5. 等待交易确认（约 30 秒）');
      console.log('   6. 刷新页面，点击 "Pay Now"');
      console.log('');
    } else if (allowanceNew >= BigInt(ORDER_AMOUNT)) {
      console.log('✅ 新网关授权充足\n');
      console.log('   新网关授权:', ethers.formatUnits(allowanceNew, 6), 'USDC');
      console.log('   需要授权:', ethers.formatUnits(ORDER_AMOUNT, 6), 'USDC');
      console.log('');
      console.log('   如果仍然失败，可能的原因：');
      console.log('   1. RPC 缓存问题 - 等待几秒后重试');
      console.log('   2. 账户不匹配 - 检查 MetaMask 连接的账户');
      console.log('   3. 代币地址不匹配 - 订单可能不是 USDC');
      console.log('   4. 商家未注册 - 商家需要在新网关注册');
      console.log('');
    } else if (balance < BigInt(ORDER_AMOUNT)) {
      console.log('❌ 余额不足\n');
      console.log('   当前余额:', ethers.formatUnits(balance, 6), 'USDC');
      console.log('   需要金额:', ethers.formatUnits(ORDER_AMOUNT, 6), 'USDC');
      console.log('   差额:', ethers.formatUnits(BigInt(ORDER_AMOUNT) - balance, 6), 'USDC');
      console.log('');
    } else {
      console.log('⚠️  两个网关都没有充足授权\n');
      console.log('   旧网关授权:', ethers.formatUnits(allowanceOld, 6), 'USDC');
      console.log('   新网关授权:', ethers.formatUnits(allowanceNew, 6), 'USDC');
      console.log('   需要授权:', ethers.formatUnits(ORDER_AMOUNT, 6), 'USDC');
      console.log('');
      console.log('   请重新授权给新网关。');
      console.log('');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

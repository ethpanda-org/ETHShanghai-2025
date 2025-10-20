const { ethers } = require('hardhat');

async function main() {
  const USDC = '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3';
  const NEW_GATEWAY = '0xdd0F17F87F60A39ab6004160cc2b503b24a518F8';
  const OLD_GATEWAY = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
  const BUYER = '0x99f8C4e03181022125CAB1A9929Ab44027AD276a';

  console.log('\n🔍 快速检查授权状态\n');

  try {
    const usdc = await ethers.getContractAt(
      ['function allowance(address,address) view returns (uint256)'],
      USDC
    );

    console.log('买家地址:', BUYER);
    console.log('');

    const allowanceNew = await usdc.allowance(BUYER, NEW_GATEWAY);
    console.log('✅ 新网关授权:', ethers.formatUnits(allowanceNew, 6), 'USDC');
    console.log('   地址:', NEW_GATEWAY);
    console.log('   原始值:', allowanceNew.toString());
    console.log('   是否Max?', allowanceNew === ethers.MaxUint256 ? '✅ 是' : '❌ 否');
    console.log('');

    const allowanceOld = await usdc.allowance(BUYER, OLD_GATEWAY);
    console.log('📦 旧网关授权:', ethers.formatUnits(allowanceOld, 6), 'USDC');
    console.log('   地址:', OLD_GATEWAY);
    console.log('   原始值:', allowanceOld.toString());
    console.log('   是否Max?', allowanceOld === ethers.MaxUint256 ? '✅ 是' : '❌ 否');
    console.log('');

    // 分析
    if (allowanceNew === ethers.MaxUint256) {
      console.log('🎉 太好了！新网关已经有Max授权！');
      console.log('');
      console.log('如果支付仍然失败，可能的原因：');
      console.log('1. 商家未在新合约注册');
      console.log('2. 订单在旧合约上创建（需要重新创建）');
      console.log('3. RPC缓存问题（等待几秒后重试）');
    } else if (allowanceNew > 0n) {
      console.log('⚠️  新网关有部分授权，但不是Max');
      console.log('建议：重新授权为Max');
    } else {
      console.log('❌ 新网关授权为0！');
      console.log('');
      console.log('解决方案：');
      console.log('1. 访问支付页面');
      console.log('2. 清除浏览器缓存（Ctrl+Shift+Delete）');
      console.log('3. 硬刷新（Ctrl+Shift+R）');
      console.log('4. 点击 "Approve USDC" 按钮');
      console.log('5. 在MetaMask确认交易');
      console.log('6. 等待确认后再点击 "Pay Now"');
    }

  } catch (error) {
    console.error('❌ 查询失败:', error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

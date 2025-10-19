const { ethers } = require('hardhat');

// 合约地址
const PAYMENT_GATEWAY_V2 = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const MOCK_USDC = '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3';

// ERC20 ABI
const ERC20_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// PaymentGateway ABI
const GATEWAY_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "orderIdString", "type": "string"}],
    "name": "getOrderDetailsByString",
    "outputs": [
      {"internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "address", "name": "payer", "type": "address"},
      {"internalType": "uint256", "name": "orderAmount", "type": "uint256"},
      {"internalType": "address", "name": "paymentToken", "type": "address"},
      {"internalType": "address", "name": "settlementToken", "type": "address"},
      {"internalType": "uint256", "name": "paidAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "receivedAmount", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
      {"internalType": "string", "name": "metadataURI", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

async function main() {
  const orderIdString = process.argv[2];
  const buyerAddress = process.argv[3];

  if (!orderIdString || !buyerAddress) {
    console.log('Usage: node scripts/verify-allowance-onchain.js <orderIdString> <buyerAddress>');
    console.log('Example: node scripts/verify-allowance-onchain.js AP65ELTMI 0x...');
    process.exit(1);
  }

  console.log('\n🔍 深度验证链上授权状态\n');
  console.log('订单ID:', orderIdString);
  console.log('买家地址:', buyerAddress);
  console.log('');

  try {
    const gateway = await ethers.getContractAt(GATEWAY_ABI, PAYMENT_GATEWAY_V2);
    const usdc = await ethers.getContractAt(ERC20_ABI, MOCK_USDC);

    // 1. 获取订单详情
    console.log('📦 1. 订单详情\n');
    const order = await gateway.getOrderDetailsByString(orderIdString);
    const orderAmount = ethers.formatUnits(order.orderAmount, 6);
    const orderAmountRaw = order.orderAmount;

    console.log('  订单金额:', orderAmount, 'USDC');
    console.log('  订单金额 (raw):', orderAmountRaw.toString());
    console.log('  支付代币:', order.paymentToken);
    console.log('  商家地址:', order.merchant);
    console.log('  指定买家:', order.payer === ethers.ZeroAddress ? '(公开订单)' : order.payer);
    console.log('');

    // 2. 检查买家余额
    console.log('💰 2. 买家余额\n');
    const balance = await usdc.balanceOf(buyerAddress);
    const balanceFormatted = ethers.formatUnits(balance, 6);
    console.log('  USDC 余额:', balanceFormatted, 'USDC');
    console.log('  USDC 余额 (raw):', balance.toString());
    console.log('  余额充足?', balance >= orderAmountRaw ? '✅ 是' : '❌ 否');
    console.log('');

    // 3. 检查链上授权（使用最新区块）
    console.log('🔐 3. 链上授权检查\n');

    // 检查对 V2 网关的授权
    const allowanceV2 = await usdc.allowance(buyerAddress, PAYMENT_GATEWAY_V2);
    const allowanceV2Formatted = ethers.formatUnits(allowanceV2, 6);

    console.log('  对 V2 网关的授权:');
    console.log('    地址:', PAYMENT_GATEWAY_V2);
    console.log('    授权额度:', allowanceV2Formatted, 'USDC');
    console.log('    授权额度 (raw):', allowanceV2.toString());
    console.log('    是否 Max?', allowanceV2 === ethers.MaxUint256 ? '✅ 是' : `❌ 否`);
    console.log('    授权充足?', allowanceV2 >= orderAmountRaw ? '✅ 是' : '❌ 否');
    console.log('');

    // 4. 模拟 processPayment 调用（不真正执行）
    console.log('🧪 4. 模拟 processPayment 调用\n');

    try {
      // 使用 callStatic 模拟调用（不会改变状态）
      const signer = (await ethers.getSigners())[0];
      const gatewayWithSigner = gateway.connect(signer);

      // 注意：这里我们无法完全模拟用户的调用，因为 msg.sender 会是我们的测试账户
      // 但我们可以检查合约的其他状态

      console.log('  ⚠️  注意：由于 Hardhat 限制，无法完全模拟用户调用');
      console.log('  但可以检查其他链上状态...');
      console.log('');

    } catch (error) {
      console.log('  模拟调用失败:', error.message);
      console.log('');
    }

    // 5. 综合诊断
    console.log('🎯 5. 综合诊断结果\n');

    const hasBalance = balance >= orderAmountRaw;
    const hasAllowance = allowanceV2 >= orderAmountRaw;
    const isMaxAllowance = allowanceV2 === ethers.MaxUint256;

    console.log(`  [ ${hasBalance ? '✅' : '❌'} ] 余额充足`);
    console.log(`  [ ${hasAllowance ? '✅' : '❌'} ] 授权充足`);
    console.log(`  [ ${isMaxAllowance ? '✅' : '⚠️ ' } ] 授权为 Max 值`);
    console.log('');

    // 6. 问题分析
    if (!hasBalance) {
      console.log('❌ 问题：余额不足！');
      console.log('');
      console.log('   解决方案：');
      console.log('   运行铸币脚本: npx hardhat run scripts/mint-tokens.js --network op-sepolia');
      console.log('');
    } else if (!hasAllowance) {
      console.log('❌ 问题：授权不足！');
      console.log('');
      console.log('   当前授权:', allowanceV2Formatted, 'USDC');
      console.log('   需要授权:', orderAmount, 'USDC');
      console.log('   差额:', ethers.formatUnits(orderAmountRaw - allowanceV2, 6), 'USDC');
      console.log('');
      console.log('   解决方案：');
      console.log('   1. 访问支付页面: http://localhost:3000/pay/' + orderIdString);
      console.log('   2. 连接买家钱包 (' + buyerAddress + ')');
      console.log('   3. 点击 "Approve USDC" 按钮');
      console.log('   4. 确认 MetaMask 交易');
      console.log('   5. 等待交易确认（约 30 秒）');
      console.log('   6. 刷新页面并重试');
      console.log('');
    } else {
      console.log('✅ 所有链上检查通过！');
      console.log('');
      console.log('   余额和授权都充足，理论上可以支付。');
      console.log('');
      console.log('   如果仍然失败，可能的原因：');
      console.log('   1. 🔄 RPC 缓存问题 - 等待几秒后重试');
      console.log('   2. 🌐 网络延迟 - 尝试切换 RPC 端点');
      console.log('   3. 👤 账户不匹配 - 确认 MetaMask 连接的是正确账户');
      console.log('   4. 🔒 订单指定买家 - 确认你的地址是否是指定买家');
      console.log('');
      console.log('   请确认以下信息：');
      console.log('   - MetaMask 当前账户:', buyerAddress);
      console.log('   - 订单指定买家:', order.payer === ethers.ZeroAddress ? '(任何人可支付)' : order.payer);

      if (order.payer !== ethers.ZeroAddress && order.payer.toLowerCase() !== buyerAddress.toLowerCase()) {
        console.log('');
        console.log('   ⚠️  警告：订单有指定买家，但你不是指定买家！');
        console.log('   订单指定买家:', order.payer);
        console.log('   你的地址:', buyerAddress);
        console.log('   只有指定买家可以支付此订单。');
      }
      console.log('');
    }

    // 7. 额外检查：验证代币合约地址
    console.log('🔍 6. 代币合约验证\n');
    console.log('  支付代币 (订单):', order.paymentToken);
    console.log('  USDC 地址 (常量):', MOCK_USDC);
    console.log('  地址一致?', order.paymentToken.toLowerCase() === MOCK_USDC.toLowerCase() ? '✅ 是' : '❌ 否');

    if (order.paymentToken.toLowerCase() !== MOCK_USDC.toLowerCase()) {
      console.log('');
      console.log('  ❌ 警告：订单的支付代币与 USDC 不一致！');
      console.log('  你可能需要授权其他代币:', order.paymentToken);
    }
    console.log('');

  } catch (error) {
    console.error('❌ 检查失败:', error.message);

    if (error.message.includes('Order not found')) {
      console.log('');
      console.log('订单不存在！可能的原因：');
      console.log('1. 订单ID错误');
      console.log('2. 订单未在 V2 网关创建');
      console.log('3. 网络连接问题');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

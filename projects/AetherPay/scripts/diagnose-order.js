const { ethers } = require('hardhat');

// 合约地址
const PAYMENT_GATEWAY_V2 = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const PAYMENT_GATEWAY_V1 = '0xe624C84633FA9C3D250222b202059d03830C52cf';
const MOCK_USDC = '0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3';

// ABI
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
  },
  {
    "inputs": [{"internalType": "address", "name": "merchant", "type": "address"}],
    "name": "getMerchantInfo",
    "outputs": [
      {"internalType": "string", "name": "businessName", "type": "string"},
      {"internalType": "uint256", "name": "totalOrders", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVolume", "type": "uint256"},
      {"internalType": "uint256", "name": "pendingBalance", "type": "uint256"},
      {"internalType": "uint256", "name": "feeRate", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

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

async function main() {
  const orderIdString = process.argv[2];
  const buyerAddress = process.argv[3];

  if (!orderIdString || !buyerAddress) {
    console.log('Usage: node scripts/diagnose-order.js <orderIdString> <buyerAddress>');
    console.log('Example: node scripts/diagnose-order.js AP65ELTMI 0x...');
    process.exit(1);
  }

  console.log('\n🔍 诊断订单状态\n');
  console.log('订单ID:', orderIdString);
  console.log('买家地址:', buyerAddress);
  console.log('');

  const gatewayV2 = await ethers.getContractAt(GATEWAY_ABI, PAYMENT_GATEWAY_V2);
  const gatewayV1 = await ethers.getContractAt(GATEWAY_ABI, PAYMENT_GATEWAY_V1);
  const usdc = await ethers.getContractAt(ERC20_ABI, MOCK_USDC);

  try {
    // 1. 读取订单信息
    console.log('📦 1. 订单信息 (V2网关)\n');
    const order = await gatewayV2.getOrderDetailsByString(orderIdString);
    console.log('  订单ID (bytes32):', order.orderId);
    console.log('  商家地址:', order.merchant);
    console.log('  买家地址:', order.payer);
    console.log('  订单金额:', ethers.formatUnits(order.orderAmount, 6), 'USDC');
    console.log('  支付代币:', order.paymentToken);
    console.log('  结算代币:', order.settlementToken);
    console.log('  状态:', ['Pending', 'Paid', 'Processing', 'Completed', 'Cancelled', 'Expired'][order.status]);
    console.log('');

    // 2. 检查商家在V2的注册状态
    console.log('👤 2. 商家注册状态\n');
    const merchantInfoV2 = await gatewayV2.getMerchantInfo(order.merchant);
    console.log('  在 V2 网关:');
    console.log('    商家名称:', merchantInfoV2.businessName || '(未注册)');
    console.log('    是否激活:', merchantInfoV2.isActive);
    console.log('    总订单数:', merchantInfoV2.totalOrders.toString());
    console.log('');

    // 3. 检查商家在V1的注册状态
    const merchantInfoV1 = await gatewayV1.getMerchantInfo(order.merchant);
    console.log('  在 V1 网关 (旧版):');
    console.log('    商家名称:', merchantInfoV1.businessName || '(未注册)');
    console.log('    是否激活:', merchantInfoV1.isActive);
    console.log('    总订单数:', merchantInfoV1.totalOrders.toString());
    console.log('');

    // 4. 检查买家余额和授权
    console.log('💰 3. 买家账户状态\n');
    const balance = await usdc.balanceOf(buyerAddress);
    const allowanceV2 = await usdc.allowance(buyerAddress, PAYMENT_GATEWAY_V2);
    const allowanceV1 = await usdc.allowance(buyerAddress, PAYMENT_GATEWAY_V1);

    console.log('  USDC 余额:', ethers.formatUnits(balance, 6), 'USDC');
    console.log('  授权给 V2 网关:', ethers.formatUnits(allowanceV2, 6), 'USDC');
    console.log('  授权给 V1 网关:', ethers.formatUnits(allowanceV1, 6), 'USDC');
    console.log('');

    // 5. 诊断结果
    console.log('🎯 4. 诊断结果\n');

    const hasBalance = balance >= order.orderAmount;
    const hasAllowanceV2 = allowanceV2 >= order.orderAmount;
    const merchantRegisteredV2 = merchantInfoV2.isActive;
    const merchantRegisteredV1 = merchantInfoV1.isActive;

    console.log(`  [${ hasBalance ? '✅' : '❌' }] 买家余额充足: ${hasBalance ? '是' : '否'}`);
    console.log(`  [${ hasAllowanceV2 ? '✅' : '❌' }] V2授权充足: ${hasAllowanceV2 ? '是' : '否'}`);
    console.log(`  [${ merchantRegisteredV2 ? '✅' : '❌' }] 商家在V2注册: ${merchantRegisteredV2 ? '是' : '否'}`);
    console.log(`  [${ !merchantRegisteredV1 ? '✅' : '⚠️' }] 商家未在V1注册: ${!merchantRegisteredV1 ? '是' : '否 (这可能导致混淆)'}`);
    console.log('');

    // 6. 问题分析
    if (!merchantRegisteredV2) {
      console.log('❌ 关键问题: 商家未在V2网关注册!');
      console.log('');
      console.log('   解决方案:');
      console.log('   1. 商家需要访问 Dashboard 重新注册');
      console.log('   2. 确保使用的是商家钱包地址:', order.merchant);
      console.log('   3. 在 http://localhost:3000/dashboard 点击 "Register Merchant Account"');
      console.log('');
    } else if (!hasAllowanceV2) {
      console.log('❌ 关键问题: 买家未授权V2网关!');
      console.log('');
      console.log('   解决方案:');
      console.log('   1. 买家需要访问支付页面');
      console.log('   2. 点击 "Approve USDC" 按钮');
      console.log('   3. 确认MetaMask交易并等待确认');
      console.log('');
    } else if (!hasBalance) {
      console.log('❌ 关键问题: 买家余额不足!');
      console.log('');
      console.log('   解决方案:');
      console.log('   1. 运行铸币脚本: npx hardhat run scripts/mint-tokens.js --network op-sepolia');
      console.log('');
    } else {
      console.log('✅ 所有检查通过! 理论上应该可以支付。');
      console.log('');
      console.log('   如果仍然失败,可能的原因:');
      console.log('   1. 前端缓存问题 - 尝试硬刷新 (Ctrl+Shift+R)');
      console.log('   2. MetaMask缓存 - 尝试重新连接钱包');
      console.log('   3. RPC延迟 - 等待几秒后重试');
      console.log('');
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error.message);
    if (error.message.includes('Order not found')) {
      console.log('');
      console.log('订单不存在! 可能的原因:');
      console.log('1. 订单ID错误');
      console.log('2. 订单未在V2网关创建');
      console.log('3. 订单可能在V1网关 (已弃用)');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

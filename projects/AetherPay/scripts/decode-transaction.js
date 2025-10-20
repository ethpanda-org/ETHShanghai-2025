const { ethers } = require('ethers');

// 配置
const RPC_URL = 'https://sepolia.optimism.io';
const GATEWAY_ADDRESS = '0x4995168D409767330D9693034d5cFfc7daFFb89B';

// 失败的交易数据
const TX_DATA = '0x571376de8441fd6b3d628819344966f733ca269c111c9a81aa257109a96f35dffb1285cc00000000000000000000000000000000000000000000000000000000001e8480';

// ABI
const GATEWAY_ABI = [
  "function processPayment(bytes32 orderId, uint256 paymentAmount) external returns (bool)",
  "function getOrderDetailsByString(string) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string metadataURI)",
  "function stringToBytes32OrderId(string) view returns (bytes32)"
];

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

async function main() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 交易数据解码和链上状态验证工具');
  console.log('='.repeat(70));
  console.log('');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const gateway = new ethers.Contract(GATEWAY_ADDRESS, GATEWAY_ABI, provider);
  const iface = new ethers.utils.Interface(GATEWAY_ABI);

  // ==================== 步骤 1: 解码交易数据 ====================
  console.log('━'.repeat(70));
  console.log('📋 步骤 1: 解码交易calldata');
  console.log('━'.repeat(70));
  console.log('');

  try {
    const decoded = iface.parseTransaction({ data: TX_DATA });
    console.log('  ✅ 解码成功！');
    console.log('  ├─ 函数名:', decoded.name);
    console.log('  ├─ 函数签名:', decoded.signature);
    console.log('  ├─ 参数列表:');
    console.log('  │  ├─ orderId (bytes32):', decoded.args.orderId);
    console.log('  │  └─ paymentAmount (uint256):', decoded.args.paymentAmount.toString());
    console.log('');

    const orderIdBytes32 = decoded.args.orderId;
    const paymentAmount = decoded.args.paymentAmount;

    console.log('  📊 人类可读格式:');
    console.log('  ├─ orderId:', orderIdBytes32);
    console.log('  └─ paymentAmount:', ethers.utils.formatUnits(paymentAmount, 6), 'tokens (假设6位小数)');
    console.log('');

    // ==================== 步骤 2: 查询订单详情 ====================
    console.log('━'.repeat(70));
    console.log('📦 步骤 2: 从链上读取订单详情');
    console.log('━'.repeat(70));
    console.log('');

    // 首先尝试通过bytes32直接查询
    let orderDetails;
    try {
      // 我们需要使用直接的订单查询
      const orderData = await provider.call({
        to: GATEWAY_ADDRESS,
        data: gateway.interface.encodeFunctionData('orders', [orderIdBytes32])
      });

      console.log('  ⚠️ 无法直接查询订单，尝试遍历所有可能的订单ID...');
      console.log('');

    } catch (error) {
      console.log('  ⚠️ 直接查询失败，需要订单ID字符串');
      console.log('');
    }

    // 让用户提供订单ID字符串
    console.log('━'.repeat(70));
    console.log('💡 需要订单ID字符串来查询完整订单详情');
    console.log('━'.repeat(70));
    console.log('');
    console.log('  请运行以下命令来获取完整诊断:');
    console.log('  node diagnose-payment-complete.js <订单ID字符串> <买家地址>');
    console.log('');
    console.log('  从前端日志中查找订单ID字符串，例如:');
    console.log('  - TEST_ORDER');
    console.log('  - ORDER_001');
    console.log('  - 或其他你在创建订单时使用的ID');
    console.log('');

    // ==================== 步骤 3: 关键检查 ====================
    console.log('━'.repeat(70));
    console.log('🔍 步骤 3: 关键问题排查');
    console.log('━'.repeat(70));
    console.log('');

    console.log('  基于交易数据，我们知道:');
    console.log('  ├─ 调用的合约: ' + GATEWAY_ADDRESS);
    console.log('  ├─ 调用的函数: processPayment(bytes32, uint256)');
    console.log('  ├─ 订单ID (bytes32): ' + orderIdBytes32);
    console.log('  └─ 支付金额: ' + paymentAmount.toString() + ' (原始值)');
    console.log('');

    console.log('  ❓ 需要确认的关键信息:');
    console.log('  1️⃣  这个订单的 paymentToken 地址是什么？');
    console.log('      - 前端认为是: 0x07C1E2588295b73bD0b98F2806AbF13E748b6cC3 (MOCK_USDC)');
    console.log('      - 但需要验证链上订单实际存储的是什么地址');
    console.log('');
    console.log('  2️⃣  买家对哪个代币地址进行了 approve？');
    console.log('      - 前端日志显示授权了 Max 数量');
    console.log('      - 但需要确认授权的是哪个具体代币合约');
    console.log('');
    console.log('  3️⃣  买家地址是谁？');
    console.log('      - 交易的 msg.sender 是买家地址');
    console.log('      - 需要确认这个地址对正确的代币进行了授权');
    console.log('');

    console.log('━'.repeat(70));
    console.log('🎯 最可能的问题原因');
    console.log('━'.repeat(70));
    console.log('');
    console.log('  根据症状（前端显示Max授权但链上失败），可能是:');
    console.log('');
    console.log('  ❌ 问题A: 代币地址不匹配');
    console.log('     - 订单创建时使用的 paymentToken = 地址A');
    console.log('     - 但前端授权的是 paymentToken = 地址B');
    console.log('     - processPayment 尝试转移地址A的代币，但授权在地址B上');
    console.log('');
    console.log('  ❌ 问题B: 前端读取了错误的订单');
    console.log('     - 前端查询的订单ID 可能与实际支付的不同');
    console.log('     - 导致授权检查通过，但实际支付的订单需要不同的代币');
    console.log('');
    console.log('  ❌ 问题C: 买家地址不匹配');
    console.log('     - 前端检查的地址 与 实际发送交易的地址不同');
    console.log('     - 例如：MetaMask切换了账户但前端未更新');
    console.log('');

    console.log('━'.repeat(70));
    console.log('📝 下一步操作');
    console.log('━'.repeat(70));
    console.log('');
    console.log('  请提供以下信息以继续诊断:');
    console.log('  1. 订单ID字符串（从前端或创建订单时的记录）');
    console.log('  2. 买家钱包地址（发送交易的地址）');
    console.log('');
    console.log('  然后运行:');
    console.log('  cd /mnt/e/dapp开发路线/模型调优/aether-oracle');
    console.log('  node scripts/diagnose-payment-complete.js <订单ID> <买家地址>');
    console.log('');

  } catch (error) {
    console.error('❌ 解码失败:', error.message);
    console.log('');
    console.log('原始交易数据:', TX_DATA);
  }

  console.log('='.repeat(70));
  console.log('');
}

main().catch(console.error);

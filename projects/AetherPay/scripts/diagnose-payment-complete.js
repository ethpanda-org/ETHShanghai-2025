const { ethers } = require('ethers');
require('dotenv').config({ path: './config/.env' });

// 配置
const RPC_URL = 'https://sepolia.optimism.io';
const GATEWAY_ADDRESS = '0x4995168D409767330D9693034d5cFfc7daFFb89B';
const PRIVATE_KEY = process.env.PRIVATE_KEY;

// 从命令行参数获取
const ORDER_ID_STRING = process.argv[2];
const BUYER_ADDRESS = process.argv[3];

if (!ORDER_ID_STRING) {
  console.error('❌ 用法: node diagnose-payment-complete.js <订单ID> [买家地址]');
  console.error('示例: node diagnose-payment-complete.js ORDER_001 0x1234...');
  process.exit(1);
}

// ABI片段
const GATEWAY_ABI = [
  "function stringToBytes32OrderId(string) view returns (bytes32)",
  "function getOrderDetailsByString(string) view returns (bytes32 orderId, address merchant, address payer, uint256 orderAmount, address paymentToken, address settlementToken, uint256 paidAmount, uint256 receivedAmount, uint8 status, uint256 createdAt, uint256 expiryTime, string metadataURI)",
  "function processPayment(bytes32 orderId, uint256 paymentAmount) external"
];

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) external returns (bool)"
];

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 AetherPay 支付问题完整诊断工具');
  console.log('='.repeat(60));
  console.log('');
  console.log('📋 配置信息:');
  console.log('  - 网关地址:', GATEWAY_ADDRESS);
  console.log('  - 订单ID:', ORDER_ID_STRING);
  console.log('  - 买家地址:', BUYER_ADDRESS || '未提供（仅查询）');
  console.log('');

  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  const gateway = new ethers.Contract(GATEWAY_ADDRESS, GATEWAY_ABI, provider);

  try {
    // ==================== 步骤 1: 检查订单映射 ====================
    console.log('━'.repeat(60));
    console.log('📋 步骤 1/5: 检查订单是否存在于网关');
    console.log('━'.repeat(60));

    const orderIdBytes32 = await gateway.stringToBytes32OrderId(ORDER_ID_STRING);
    console.log('  ├─ bytes32 OrderID:', orderIdBytes32);

    if (orderIdBytes32 === ethers.constants.HashZero) {
      console.log('  └─ ❌ 订单不存在！');
      console.log('');
      console.log('💡 解决方案:');
      console.log('  1. 确认订单ID是否正确');
      console.log('  2. 确认订单是否在当前网关创建（地址: ' + GATEWAY_ADDRESS + '）');
      console.log('  3. 在商家Dashboard重新创建订单');
      console.log('');
      return;
    }

    console.log('  └─ ✅ 订单存在！');
    console.log('');

    // ==================== 步骤 2: 获取订单详情 ====================
    console.log('━'.repeat(60));
    console.log('📦 步骤 2/5: 获取订单详细信息');
    console.log('━'.repeat(60));

    const orderDetails = await gateway.getOrderDetailsByString(ORDER_ID_STRING);
    const [
      orderId, merchant, payer, orderAmount, paymentToken, settlementToken,
      paidAmount, receivedAmount, status, createdAt, expiryTime, metadataURI
    ] = orderDetails;

    console.log('  ├─ Merchant:', merchant);
    console.log('  ├─ Designated Payer:', payer === ethers.constants.AddressZero ? 'Public Order (任何人可支付)' : payer);
    console.log('  ├─ Payment Token:', paymentToken);
    console.log('  ├─ Settlement Token:', settlementToken);
    console.log('  ├─ Order Amount:', ethers.utils.formatUnits(orderAmount, 6), 'tokens');
    console.log('  ├─ Paid Amount:', ethers.utils.formatUnits(paidAmount, 6), 'tokens');
    console.log('  ├─ Status:', ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'EXPIRED'][status]);
    console.log('  ├─ Created At:', new Date(createdAt * 1000).toLocaleString());
    console.log('  ├─ Expiry Time:', new Date(expiryTime * 1000).toLocaleString());
    const now = Math.floor(Date.now() / 1000);
    const expired = now > expiryTime;
    console.log('  ├─ Expired:', expired ? '❌ 是（已过期）' : '✅ 否（有效）');
    console.log('  └─ Metadata URI:', metadataURI || '无');
    console.log('');

    // 检查订单状态
    if (status !== 0) {
      console.log('⚠️ 订单状态不是 PENDING，无法支付！');
      console.log('  当前状态:', ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'EXPIRED'][status]);
      console.log('');
      return;
    }

    if (expired) {
      console.log('⚠️ 订单已过期，无法支付！');
      console.log('');
      return;
    }

    // ==================== 步骤 3: 检查代币信息 ====================
    console.log('━'.repeat(60));
    console.log('💰 步骤 3/5: 检查支付代币信息');
    console.log('━'.repeat(60));

    const token = new ethers.Contract(paymentToken, ERC20_ABI, provider);
    const symbol = await token.symbol();
    const decimals = await token.decimals();
    console.log('  ├─ Token Symbol:', symbol);
    console.log('  ├─ Token Decimals:', decimals);
    console.log('  └─ Token Address:', paymentToken);
    console.log('');

    // ==================== 步骤 4: 检查买家授权和余额 ====================
    if (!BUYER_ADDRESS) {
      console.log('⚠️ 未提供买家地址，跳过授权和余额检查');
      console.log('');
      console.log('💡 如需完整诊断，请提供买家地址:');
      console.log(`  node diagnose-payment-complete.js ${ORDER_ID_STRING} <买家地址>`);
      console.log('');
      return;
    }

    console.log('━'.repeat(60));
    console.log('🔍 步骤 4/5: 检查买家授权和余额');
    console.log('━'.repeat(60));

    // 检查指定买家
    if (payer !== ethers.constants.AddressZero && payer.toLowerCase() !== BUYER_ADDRESS.toLowerCase()) {
      console.log('  ❌ 钱包地址不匹配！');
      console.log('  ├─ 订单指定买家:', payer);
      console.log('  ├─ 当前钱包地址:', BUYER_ADDRESS);
      console.log('  └─ 解决方案: 切换到指定的钱包地址');
      console.log('');
      return;
    }

    const balance = await token.balanceOf(BUYER_ADDRESS);
    const allowance = await token.allowance(BUYER_ADDRESS, GATEWAY_ADDRESS);

    console.log('  ├─ 买家余额:', ethers.utils.formatUnits(balance, decimals), symbol);
    console.log('  ├─ 已授权额度:', ethers.utils.formatUnits(allowance, decimals), symbol);
    console.log('  └─ 需要金额:', ethers.utils.formatUnits(orderAmount, decimals), symbol);
    console.log('');

    // ==================== 步骤 5: 三元组验证 ====================
    console.log('━'.repeat(60));
    console.log('✅ 步骤 5/5: 三元组一致性验证');
    console.log('━'.repeat(60));
    console.log('  ├─ 订单网关:', GATEWAY_ADDRESS);
    console.log('  ├─ 支付代币:', paymentToken);
    console.log('  └─ 买家地址:', BUYER_ADDRESS);
    console.log('');

    // 检查是否满足条件
    const balanceSufficient = balance.gte(orderAmount);
    const allowanceSufficient = allowance.gte(orderAmount);

    console.log('━'.repeat(60));
    console.log('📊 支付条件检查结果');
    console.log('━'.repeat(60));
    console.log('  ├─ 余额充足:', balanceSufficient ? '✅ 是' : '❌ 否');
    console.log('  ├─ 授权充足:', allowanceSufficient ? '✅ 是' : '❌ 否');
    console.log('  ├─ 订单有效:', status === 0 ? '✅ 是 (PENDING)' : '❌ 否');
    console.log('  └─ 买家匹配:', payer === ethers.constants.AddressZero || payer.toLowerCase() === BUYER_ADDRESS.toLowerCase() ? '✅ 是' : '❌ 否');
    console.log('');

    // ==================== 诊断结果和建议 ====================
    console.log('━'.repeat(60));
    console.log('🔧 诊断结果和修复建议');
    console.log('━'.repeat(60));
    console.log('');

    if (!balanceSufficient) {
      console.log('❌ 问题 1: 余额不足');
      console.log('  当前余额:', ethers.utils.formatUnits(balance, decimals), symbol);
      console.log('  需要金额:', ethers.utils.formatUnits(orderAmount, decimals), symbol);
      console.log('  缺少金额:', ethers.utils.formatUnits(orderAmount.sub(balance), decimals), symbol);
      console.log('');
      console.log('💡 解决方案:');
      console.log('  1. 前端铸造测试代币: /dashboard → Mint Test Tokens');
      console.log('  2. 或运行脚本: npx hardhat run scripts/mint-tokens.js --network op-sepolia');
      console.log('');
    }

    if (!allowanceSufficient) {
      console.log('❌ 问题 2: 授权不足 (这是你的主要问题！)');
      console.log('  当前授权:', ethers.utils.formatUnits(allowance, decimals), symbol);
      console.log('  需要授权:', ethers.utils.formatUnits(orderAmount, decimals), symbol);
      console.log('  缺少授权:', ethers.utils.formatUnits(orderAmount.sub(allowance), decimals), symbol);
      console.log('');
      console.log('💡 解决方案:');
      console.log('  前端应该显示 "Approve" 按钮，点击后执行以下操作:');
      console.log('');
      console.log('  1. 调用 approve 函数:');
      console.log(`     token.approve("${GATEWAY_ADDRESS}", "115792089237316195423570985008687907853269984665640564039457584007913129639935")`);
      console.log('');
      console.log('  2. 等待交易确认');
      console.log('  3. 再次检查授权额度');
      console.log('  4. 然后执行支付');
      console.log('');

      // 自动修复（如果提供了私钥）
      if (PRIVATE_KEY) {
        console.log('━'.repeat(60));
        console.log('🔧 自动修复授权问题');
        console.log('━'.repeat(60));
        console.log('');

        const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
        const tokenWithSigner = new ethers.Contract(paymentToken, ERC20_ABI, wallet);

        console.log('正在授权...');
        const maxApproval = ethers.constants.MaxUint256;

        try {
          // 某些代币（如USDT）需要先重置授权
          if (allowance.gt(0)) {
            console.log('  ├─ 检测到非零授权，先重置为0...');
            const resetTx = await tokenWithSigner.approve(GATEWAY_ADDRESS, 0);
            console.log('  ├─ 重置交易哈希:', resetTx.hash);
            await resetTx.wait();
            console.log('  ├─ ✅ 重置成功');
          }

          console.log('  ├─ 设置无限授权...');
          const approveTx = await tokenWithSigner.approve(GATEWAY_ADDRESS, maxApproval);
          console.log('  ├─ 授权交易哈希:', approveTx.hash);
          console.log('  ├─ 等待确认...');
          await approveTx.wait();
          console.log('  └─ ✅ 授权成功！');
          console.log('');

          // 验证授权
          const newAllowance = await token.allowance(BUYER_ADDRESS, GATEWAY_ADDRESS);
          console.log('✅ 新授权额度:', ethers.utils.formatUnits(newAllowance, decimals), symbol);
          console.log('');

        } catch (error) {
          console.error('  └─ ❌ 授权失败:', error.message);
          console.log('');
        }
      } else {
        console.log('⚠️ 未提供私钥，无法自动修复授权问题');
        console.log('  提示: 在 .env 文件中设置 PRIVATE_KEY 可启用自动修复');
        console.log('');
      }
    }

    if (balanceSufficient && allowanceSufficient) {
      console.log('✅ 所有条件满足，可以正常支付！');
      console.log('');
      console.log('━'.repeat(60));
      console.log('📝 前端应该显示的按钮:');
      console.log('━'.repeat(60));
      console.log('  [Pay Now] 按钮应该是启用状态');
      console.log('');
      console.log('如果仍然失败，请检查:');
      console.log('  1. 前端调用的网关地址是否是:', GATEWAY_ADDRESS);
      console.log('  2. 前端传递的 orderIdBytes32 是否是:', orderIdBytes32);
      console.log('  3. 前端传递的 paymentAmount 是否是:', orderAmount.toString());
      console.log('  4. 买家地址是否有足够的 ETH 支付 Gas 费');
      console.log('');
    }

    console.log('━'.repeat(60));
    console.log('🎯 关键排查清单');
    console.log('━'.repeat(60));
    console.log('  [ ' + (balanceSufficient ? '✅' : '❌') + ' ] 1. 余额充足');
    console.log('  [ ' + (allowanceSufficient ? '✅' : '❌') + ' ] 2. 授权充足（最可能的问题！）');
    console.log('  [ ✅ ] 3. 订单存在于正确的网关');
    console.log('  [ ✅ ] 4. 订单状态为 PENDING');
    console.log('  [ ✅ ] 5. 订单未过期');
    console.log('  [ ' + (payer === ethers.constants.AddressZero || payer.toLowerCase() === BUYER_ADDRESS.toLowerCase() ? '✅' : '❌') + ' ] 6. 买家地址匹配');
    console.log('');

    console.log('━'.repeat(60));
    console.log('💡 下一步操作');
    console.log('━'.repeat(60));
    if (!allowanceSufficient) {
      console.log('  1. 在前端点击 "Approve USDC" 按钮');
      console.log('  2. 等待MetaMask弹出，确认授权交易');
      console.log('  3. 等待交易确认（约10-20秒）');
      console.log('  4. 前端应该自动刷新授权状态');
      console.log('  5. 确认 "Pay Now" 按钮变为可用状态');
      console.log('  6. 点击 "Pay Now" 执行支付');
    } else if (!balanceSufficient) {
      console.log('  1. 铸造更多测试代币');
      console.log('  2. 然后返回支付页面');
    } else {
      console.log('  ✅ 所有条件满足，直接点击 "Pay Now" 即可');
    }
    console.log('');

  } catch (error) {
    console.error('');
    console.error('━'.repeat(60));
    console.error('❌ 诊断过程出错');
    console.error('━'.repeat(60));
    console.error('  错误信息:', error.message);
    if (error.reason) console.error('  错误原因:', error.reason);
    if (error.code) console.error('  错误代码:', error.code);
    console.error('');
  }

  console.log('='.repeat(60));
  console.log('✅ 诊断完成');
  console.log('='.repeat(60));
  console.log('');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

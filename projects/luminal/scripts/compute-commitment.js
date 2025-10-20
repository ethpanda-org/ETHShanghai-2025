#!/usr/bin/env node
/**
 * Commitment Calculator
 * 用途：计算池子状态的 Poseidon 承诺
 *
 * 使用方法：
 *   cd client && node ../scripts/compute-commitment.js
 *   cd client && node ../scripts/compute-commitment.js --reserve0 10 --reserve1 20000 --nonce 0 --fee 0
 *   cd client && node ../scripts/compute-commitment.js --check 0x17596af...
 *
 * 注意：必须从 client/ 目录运行，因为需要访问 node_modules/@iden3/js-crypto
 */

// 尝试导入（需要从 client 目录运行）
let poseidon;
try {
  const crypto = await import('@iden3/js-crypto');
  poseidon = crypto.poseidon;
} catch (error) {
  console.error('\n❌ Error: Cannot find @iden3/js-crypto');
  console.error('   Please run this script from the client/ directory:');
  console.error('\n   cd client && node ../scripts/compute-commitment.js\n');
  console.error('   Or install dependencies first:');
  console.error('   cd client && npm install\n');
  process.exit(1);
}

// 解析命令行参数
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace(/^--/, '');
  const value = args[i + 1];
  options[key] = value;
}

// 辅助函数：转换为 hex
const toHex = (value) => {
  const hex = value.toString(16).padStart(64, '0');
  return `0x${hex}`;
};

// 辅助函数：格式化显示
const formatAmount = (amount, decimals = 18, symbol = '') => {
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const fraction = amount % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  if (fractionStr) {
    return `${whole}.${fractionStr} ${symbol}`.trim();
  }
  return `${whole} ${symbol}`.trim();
};

console.log('\n🔐 Poseidon Commitment Calculator\n');

if (options.check) {
  // 模式：验证 commitment
  const targetCommitment = options.check;
  console.log(`🔍 Checking commitment: ${targetCommitment}\n`);

  // 尝试常见的初始状态
  const testCases = [
    { reserve0: 10n * (10n ** 18n), reserve1: 20_000n * (10n ** 6n), nonce: 0n, fee: 0n, name: 'Default Initial' },
    { reserve0: 100n * (10n ** 18n), reserve1: 200_000n * (10n ** 6n), nonce: 0n, fee: 0n, name: 'Large Pool' },
    { reserve0: 1n * (10n ** 18n), reserve1: 2_000n * (10n ** 6n), nonce: 0n, fee: 0n, name: 'Small Pool' },
  ];

  let found = false;
  for (const testCase of testCases) {
    const hash = poseidon.hash([testCase.reserve0, testCase.reserve1, testCase.nonce, testCase.fee]);
    const commitment = toHex(hash);

    if (commitment.toLowerCase() === targetCommitment.toLowerCase()) {
      console.log('✅ Match found!\n');
      console.log(`Pool State (${testCase.name}):`);
      console.log(`  reserve0: ${formatAmount(testCase.reserve0, 18, 'ETH')}`);
      console.log(`  reserve1: ${formatAmount(testCase.reserve1, 6, 'USDC')}`);
      console.log(`  nonce:    ${testCase.nonce}`);
      console.log(`  feeBps:   ${testCase.fee}`);
      console.log(`  commitment: ${commitment}\n`);
      found = true;
      break;
    }
  }

  if (!found) {
    console.log('❌ No match found in common states.');
    console.log('   This might be a custom state after swaps.\n');
    console.log('💡 Hint: Use localStorage or state service to retrieve the actual state.\n');
  }

} else {
  // 模式：计算新 commitment
  const reserve0 = options.reserve0
    ? BigInt(options.reserve0) * (10n ** 18n)  // 输入的是 ETH 数量
    : 10n * (10n ** 18n);  // 默认 10 ETH

  const reserve1 = options.reserve1
    ? BigInt(options.reserve1) * (10n ** 6n)  // 输入的是 USDC 数量
    : 20_000n * (10n ** 6n);  // 默认 20,000 USDC

  const nonce = options.nonce ? BigInt(options.nonce) : 0n;
  const fee = options.fee ? BigInt(options.fee) : 0n;

  console.log('📊 Input Pool State:\n');
  console.log(`  reserve0 (ETH):  ${formatAmount(reserve0, 18, 'ETH')}`);
  console.log(`  reserve1 (USDC): ${formatAmount(reserve1, 6, 'USDC')}`);
  console.log(`  nonce:           ${nonce}`);
  console.log(`  feeBps:          ${fee}`);
  console.log(`  (raw values: ${reserve0}, ${reserve1}, ${nonce}, ${fee})\n`);

  const hash = poseidon.hash([reserve0, reserve1, nonce, fee]);
  const commitment = toHex(hash);

  console.log('🔐 Computed Commitment:\n');
  console.log(`  ${commitment}\n`);

  console.log('📋 Usage:\n');
  console.log('  Export for deployment:');
  console.log(`    export INITIAL_COMMITMENT="${commitment}"\n`);
  console.log('  Use in contracts:');
  console.log(`    vault.setCommitment(${commitment});\n`);
  console.log('  Verify later:');
  console.log(`    node scripts/compute-commitment.js --check ${commitment}\n`);
}

console.log('💡 Examples:\n');
console.log('  # Calculate default initial state (10 ETH, 20k USDC)');
console.log('  node scripts/compute-commitment.js\n');
console.log('  # Calculate custom state');
console.log('  node scripts/compute-commitment.js --reserve0 100 --reserve1 200000 --nonce 0 --fee 0\n');
console.log('  # Check if a commitment matches known states');
console.log('  node scripts/compute-commitment.js --check 0x17596af29b3e8e9043d30b0fad867684c480ebf73e262bd870c94e00988fe1a1\n');

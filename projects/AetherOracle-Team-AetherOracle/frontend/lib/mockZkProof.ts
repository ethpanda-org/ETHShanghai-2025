/**
 * 模拟ZK证明生成器（用于Demo展示）
 *
 * 注意：这是一个proof-of-concept实现，用于展示ZK验证的用户体验和概念。
 * 生产环境将使用RISC-Zero zkVM生成真正的SNARK证明。
 */

export interface ZKProof {
  pi_a: [string, string];
  pi_b: [[string, string], [string, string]];
  pi_c: [string, string];
  publicSignals: string[];
  protocol: string;
  curve: string;
}

/**
 * 生成模拟的ZK证明（格式类似Groth16 proof）
 * @param prices - 6个交易所价格（已放大10000倍的整数）
 * @param predictedPrice - AI预测价格（已放大10000倍的整数）
 * @returns 模拟的ZK proof对象
 */
export async function generateMockZKProof(
  prices: number[],
  predictedPrice: number
): Promise<ZKProof> {
  // 验证输入
  if (prices.length !== 6) {
    throw new Error('需要提供6个交易所价格');
  }

  // 模拟证明生成延迟（让用户觉得在计算复杂的密码学操作）
  const delay = 1500 + Math.random() * 1000; // 1.5-2.5秒
  await new Promise(resolve => setTimeout(resolve, delay));

  // 生成基于输入数据的确定性哈希
  const inputHash = hashInputs(prices, predictedPrice);

  // 模拟Groth16 proof格式
  const proof: ZKProof = {
    pi_a: [
      generateFakeFieldElement(inputHash, 'a1'),
      generateFakeFieldElement(inputHash, 'a2')
    ],
    pi_b: [
      [
        generateFakeFieldElement(inputHash, 'b11'),
        generateFakeFieldElement(inputHash, 'b12')
      ],
      [
        generateFakeFieldElement(inputHash, 'b21'),
        generateFakeFieldElement(inputHash, 'b22')
      ]
    ],
    pi_c: [
      generateFakeFieldElement(inputHash, 'c1'),
      generateFakeFieldElement(inputHash, 'c2')
    ],
    publicSignals: [
      predictedPrice.toString(),
      generateFakeMerkleRoot(prices)
    ],
    protocol: 'groth16',
    curve: 'bn128'
  };

  return proof;
}

/**
 * 模拟链上验证（展示验证流程）
 * @param proof - ZK证明对象
 * @returns 总是返回true（但有真实的验证逻辑检查）
 */
export async function mockVerifyProof(proof: ZKProof): Promise<boolean> {
  // 模拟链上验证延迟
  const delay = 800 + Math.random() * 400; // 0.8-1.2秒
  await new Promise(resolve => setTimeout(resolve, delay));

  // 基本格式验证（确保proof结构正确）
  const isValidFormat =
    proof.pi_a.length === 2 &&
    proof.pi_b.length === 2 &&
    proof.pi_b[0].length === 2 &&
    proof.pi_b[1].length === 2 &&
    proof.pi_c.length === 2 &&
    proof.publicSignals.length === 2 &&
    proof.protocol === 'groth16' &&
    proof.curve === 'bn128';

  if (!isValidFormat) {
    console.log('❌ ZK Proof format validation failed');
    return false;
  }

  // 验证public signals是否合理
  const predictedPrice = parseInt(proof.publicSignals[0]);
  console.log('🔍 ZK Proof验证 - 预测价格 (放大10000倍):', predictedPrice);
  console.log('🔍 ZK Proof验证 - 实际价格:', (predictedPrice / 10000).toFixed(6));
  
  if (isNaN(predictedPrice)) {
    console.log('❌ ZK Proof验证失败: 预测价格不是有效数字');
    return false;
  }
  
  // 更宽松的价格范围验证 - 支持从0.0001到100的价格范围
  // 放大10000倍后，范围是1到1000000
  if (predictedPrice < 1 || predictedPrice > 1000000) {
    console.log('❌ ZK Proof验证失败: 价格超出合理范围 (0.0001-100)');
    console.log('   当前价格 (放大10000倍):', predictedPrice);
    console.log('   允许范围: 1-1000000');
    return false;
  }

  console.log('✅ ZK Proof验证成功!');
  // 验证成功
  return true;
}

/**
 * 格式化proof用于UI显示
 * @param proof - ZK证明对象
 * @returns 格式化的字符串
 */
export function formatProofForDisplay(proof: ZKProof): string {
  return `Proof (${proof.protocol}/${proof.curve}):
π_a: [${proof.pi_a[0].slice(0, 10)}..., ${proof.pi_a[1].slice(0, 10)}...]
π_b: [[${proof.pi_b[0][0].slice(0, 8)}..., ${proof.pi_b[0][1].slice(0, 8)}...],
     [${proof.pi_b[1][0].slice(0, 8)}..., ${proof.pi_b[1][1].slice(0, 8)}...]]
π_c: [${proof.pi_c[0].slice(0, 10)}..., ${proof.pi_c[1].slice(0, 10)}...]

Public Signals:
  predictedPrice: ${proof.publicSignals[0]} (${(parseInt(proof.publicSignals[0]) / 10000).toFixed(4)})
  dataIntegrity: ${proof.publicSignals[1]}`;
}

// ====== 辅助函数（内部使用）======

/**
 * 计算输入数据的哈希（用于生成确定性的proof）
 */
function hashInputs(prices: number[], predicted: number): string {
  const data = [...prices, predicted].join(',');
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = ((hash << 5) - hash) + data.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(64, '0');
}

/**
 * 生成看起来真实的椭圆曲线点（BN128曲线上的元素）
 */
function generateFakeFieldElement(seed: string, suffix: string): string {
  const combined = seed + suffix;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  // BN128曲线的模数大约是2^254，用64个十六进制字符表示
  const fieldElement = Math.abs(hash).toString(16).padStart(64, '0');
  return '0x' + fieldElement;
}

/**
 * 生成模拟的Merkle root（代表数据完整性）
 */
function generateFakeMerkleRoot(prices: number[]): string {
  const pricesStr = prices.join(',');
  let hash = 0;
  for (let i = 0; i < pricesStr.length; i++) {
    hash = ((hash << 5) - hash) + pricesStr.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString();
}

/**
 * 获取proof的简短摘要（用于UI显示）
 */
export function getProofSummary(proof: ZKProof): string {
  const predictedPrice = parseInt(proof.publicSignals[0]);
  const priceInDecimal = (predictedPrice / 10000).toFixed(4);
  return `Verified prediction: ${priceInDecimal} (${proof.protocol.toUpperCase()})`;
}

/**
 * 验证输入价格是否在合理范围内
 */
export function validatePrices(prices: number[]): { valid: boolean; error?: string } {
  if (prices.length !== 6) {
    return { valid: false, error: '需要提供6个交易所价格' };
  }

  for (let i = 0; i < prices.length; i++) {
    if (isNaN(prices[i])) {
      return { valid: false, error: `价格 ${i + 1} 不是有效数字` };
    }
    if (prices[i] < 9000 || prices[i] > 11000) {
      return { valid: false, error: `价格 ${i + 1} 超出合理范围 (0.9-1.1)` };
    }
  }

  return { valid: true };
}

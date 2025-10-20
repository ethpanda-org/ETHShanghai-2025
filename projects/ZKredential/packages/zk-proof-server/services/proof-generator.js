// Dedicated ZK Proof Generation Service
// 专用的ZK证明生成服务，优化性能

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { keccak256, encodePacked } from 'viem';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ProofGenerator {
  constructor(config) {
    this.config = config;
    // 使用服务器根目录作为基准，而不是services目录
    const serverRoot = join(__dirname, '..');
    this.basePath = join(serverRoot, config.circuits.basePath);
    this.wasmPath = join(serverRoot, config.circuits.wasmPath);
    this.zkeyPath = join(serverRoot, config.circuits.zkeyPath);
    this.vkeyPath = join(serverRoot, config.circuits.vkeyPath);
    
    // 预加载验证密钥
    this.preloadVerificationKey();
    
    console.log('🚀 ZK证明生成器初始化完成');
    console.log('📁 电路文件路径:', {
      wasm: this.wasmPath,
      zkey: this.zkeyPath,
      vkey: this.vkeyPath
    });
  }

  /**
   * 预加载验证密钥到内存
   */
  preloadVerificationKey() {
    try {
      if (existsSync(this.vkeyPath)) {
        this.cachedVKey = JSON.parse(readFileSync(this.vkeyPath, 'utf8'));
        console.log('✅ 验证密钥已预加载到内存');
      }
    } catch (error) {
      console.warn('⚠️ 验证密钥预加载失败:', error.message);
    }
  }

  /**
   * 验证电路文件是否存在
   */
  validateCircuitFiles() {
    const files = {
      wasm: existsSync(this.wasmPath),
      zkey: existsSync(this.zkeyPath),
      vkey: existsSync(this.vkeyPath)
    };

    console.log('📁 文件存在性检查:', files);

    if (!files.wasm || !files.zkey || !files.vkey) {
      throw new Error('电路文件缺失，请确保已正确编译电路');
    }

    return files;
  }

  /**
   * 生成ZK证明
   */
  async generateProof(zkInput) {
    const startTime = Date.now();
    
    try {
      console.log('🔧 开始生成ZK证明...');
      console.log('📊 输入数据:', {
        actualAge: zkInput.actualAge,
        actualCountry: zkInput.actualCountry,
        actualAssets: zkInput.actualAssets,
        minAge: zkInput.minAge,
        allowedCountry: zkInput.allowedCountry,
        minAssets: zkInput.minAssets,
        walletAddress: zkInput.walletAddress.toString(),
        timestamp: zkInput.timestamp.toString()
      });

      // 验证文件存在
      this.validateCircuitFiles();

      // 动态导入snarkjs（避免启动时的开销）
      const snarkjs = await import('snarkjs');

      // 准备电路输入
      const circuitInput = this.prepareCircuitInput(zkInput);
      
      console.log('📊 电路输入:', circuitInput);
      console.log('⏳ 开始生成证明，专用服务器模式...');

      // 生成证明（无超时，让它自然完成）
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInput,
        this.wasmPath,
        this.zkeyPath
      );

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ 证明生成成功！耗时: ${elapsed}秒`);

      // 重新排列公共信号以匹配合约期望
      const reorderedSignals = this.reorderPublicSignals(publicSignals);
      
      // 验证公共信号在字段范围内
      const validatedSignals = this.validatePublicSignals(reorderedSignals);

      const result = {
        proof,
        publicSignals: validatedSignals,
        metadata: {
          generationTime: elapsed,
          timestamp: Date.now(),
          server: 'dedicated-zk-server'
        }
      };

      // 验证生成的证明
      if (this.cachedVKey) {
        const isValid = await this.verifyProof(result);
        result.verified = isValid;
        console.log('🔍 证明验证结果:', isValid ? '✅ 通过' : '❌ 失败');
      }

      return result;

    } catch (error) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ 证明生成失败 (${elapsed}秒):`, error.message);
      
      // 返回错误信息，让调用方决定是否使用模拟证明
      throw {
        error: error.message,
        generationTime: elapsed,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 准备电路输入
   */
  prepareCircuitInput(zkInput) {
    // BN254字段最大值
    const maxFieldValue = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    // 确保所有输入都在字段范围内
    const safeInputs = {};
    
    for (const [key, value] of Object.entries(zkInput)) {
      let bigIntValue;
      
      if (typeof value === 'string') {
        bigIntValue = BigInt(value);
      } else if (typeof value === 'number') {
        bigIntValue = BigInt(value);
      } else if (typeof value === 'bigint') {
        bigIntValue = value;
      } else {
        bigIntValue = BigInt(value.toString());
      }
      
      // 检查并修正字段大小
      if (bigIntValue >= maxFieldValue) {
        const safeValue = bigIntValue % maxFieldValue;
        console.warn(`⚠️ ${key} 超出字段大小，已进行模运算:`, bigIntValue.toString(), '->', safeValue.toString());
        safeInputs[key] = safeValue.toString();
      } else {
        safeInputs[key] = bigIntValue.toString();
      }
    }
    
    console.log('🔧 安全的电路输入:', safeInputs);
    
    return safeInputs;
  }

  /**
   * 验证公共信号在字段范围内
   */
  validatePublicSignals(publicSignals) {
    const maxFieldValue = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    console.log('🔍 验证公共信号字段范围...');
    
    const validatedSignals = publicSignals.map((signal, index) => {
      const bigIntSignal = BigInt(signal);
      
      if (bigIntSignal >= maxFieldValue) {
        const safeSignal = bigIntSignal % maxFieldValue;
        console.warn(`⚠️ 公共信号[${index}] 超出字段大小，已修正:`, signal, '->', safeSignal.toString());
        return safeSignal.toString();
      }
      
      return signal;
    });
    
    console.log('✅ 公共信号字段验证完成');
    return validatedSignals;
  }

  /**
   * 重新排列公共信号以匹配合约期望
   */
  reorderPublicSignals(publicSignals) {
    console.log('🔧 原始公共信号:', publicSignals);
    
    // 新的复合证明电路输出顺序（12个信号）：
    // [commitment, nullifierHash, isCompliant, 
    //  minAge, allowedCountry, minKycLevel, minNetWorth, minLiquidAssets, requireAccredited, minIncome,
    //  walletAddress, timestamp]
    // 
    // 合约期望的顺序也是相同的，所以不需要重排序
    
    // ✅ 动态验证公共信号数量（12或16）
    if (publicSignals.length !== 12 && publicSignals.length !== 16) {
      console.error('❌ 公共信号数量错误，期望12或16个，实际:', publicSignals.length);
      throw new Error(`公共信号数量错误: 期望12或16个，实际${publicSignals.length}个`);
    }
    
    console.log(`🔧 公共信号解析 (${publicSignals.length}个):`, {
      '[0] commitment': publicSignals[0] ? publicSignals[0].toString().substring(0, 15) + '...' : 'N/A',
      '[1] nullifierHash': publicSignals[1] ? publicSignals[1].toString().substring(0, 15) + '...' : 'N/A',
      '[2] isCompliant': publicSignals[2],
      '[3] minAge': publicSignals[3],
      '[4] allowedCountry': publicSignals[4],
      '[5] minKycLevel': publicSignals[5],
      '[6] minNetWorth': publicSignals[6],
      '[7] minLiquidAssets': publicSignals[7],
      '[8] requireAccredited': publicSignals[8],
      '[9] minIncome': publicSignals[9],
      '[10] walletAddress': publicSignals[10] ? publicSignals[10].toString().substring(0, 15) + '...' : 'N/A',
      '[11] timestamp': publicSignals[11]
    });
    
    // 直接返回原始信号，不需要重排序
    return publicSignals;
  }

  /**
   * 验证ZK证明
   */
  async verifyProof(proofResult) {
    try {
      if (!this.cachedVKey) {
        console.warn('⚠️ 验证密钥未缓存，跳过验证');
        return null;
      }

      const snarkjs = await import('snarkjs');
      
      const isValid = await snarkjs.groth16.verify(
        this.cachedVKey,
        proofResult.publicSignals,
        proofResult.proof
      );

      return isValid;
    } catch (error) {
      console.error('❌ 证明验证失败:', error.message);
      return false;
    }
  }

  /**
   * 生成模拟证明（降级方案）
   * ⚠️ 警告：这是模拟证明，仅用于开发和测试
   * 生产环境应该使用真实的ZK证明
   */
  generateMockProof(zkInput) {
    console.warn('🎭 警告：生成模拟证明（降级方案）');
    console.warn('⚠️ 这不是真实的零知识证明！仅用于开发测试！');
    
    // 模拟合规检查 (KYC + Asset)
    const ageCheck = zkInput.actualAge >= zkInput.minAge;
    const countryCheck = zkInput.allowedCountry === 0 || zkInput.actualCountry === zkInput.allowedCountry;
    const kycLevelCheck = (zkInput.kycLevel || 3) >= (zkInput.minKycLevel || 2);
    const netWorthCheck = (zkInput.actualNetWorth || 0) >= (zkInput.minNetWorth || 0);
    const liquidAssetsCheck = (zkInput.actualLiquidAssets || 0) >= (zkInput.minLiquidAssets || 0);
    const accreditedCheck = (zkInput.requireAccredited || 0) === 0 || (zkInput.isAccreditedInvestor || 0) === 1;
    const incomeCheck = (zkInput.incomeLast12Months || 0) >= (zkInput.minIncome || 0);
    
    const isCompliant = ageCheck && countryCheck && kycLevelCheck && netWorthCheck && liquidAssetsCheck && accreditedCheck && incomeCheck;

    console.log('📊 合规检查 (12信号):', {
      ageCheck: `${zkInput.actualAge} >= ${zkInput.minAge} = ${ageCheck}`,
      countryCheck: `${zkInput.actualCountry} === ${zkInput.allowedCountry} = ${countryCheck}`,
      kycLevelCheck: `${zkInput.kycLevel || 3} >= ${zkInput.minKycLevel || 2} = ${kycLevelCheck}`,
      netWorthCheck: `${zkInput.actualNetWorth || 0} >= ${zkInput.minNetWorth || 0} = ${netWorthCheck}`,
      liquidAssetsCheck: `${zkInput.actualLiquidAssets || 0} >= ${zkInput.minLiquidAssets || 0} = ${liquidAssetsCheck}`,
      accreditedCheck,
      incomeCheck: `${zkInput.incomeLast12Months || 0} >= ${zkInput.minIncome || 0} = ${incomeCheck}`,
      isCompliant
    });

    // 计算commitment和nullifierHash (确保所有值都是BigInt)
    const credHash = typeof zkInput.credentialHash === 'bigint' ? zkInput.credentialHash : BigInt(zkInput.credentialHash);
    const sec = typeof zkInput.secret === 'bigint' ? zkInput.secret : BigInt(zkInput.secret);
    const wallet = typeof zkInput.walletAddress === 'bigint' ? zkInput.walletAddress : BigInt(zkInput.walletAddress);
    const maxField = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617');
    
    const commitment = (credHash + sec + wallet) % maxField;
    const nullifierHash = (credHash + sec) % maxField;

    // 模拟证明数据
    const mockProof = {
      pi_a: [
        "103929005307927756724354605802047639613112342136",
        "1455006025860628148969203348972365368650123491849",
        "1"
      ],
      pi_b: [
        ["194866884977453722427157977695504402620791005730", "97433442488726861213578988847752201310395502865"],
        ["389733769954907444854315955391008805241582011460", "292300327466180583640736966543256603931186508595"],
        ["1", "0"]
      ],
      pi_c: [
        "487167212443634306067894944238761006551977514325",
        "584600654932361167281473933086513207862373017190",
        "1"
      ],
      protocol: "groth16",
      curve: "bn128"
    };

    // 按合约期望的顺序组装公共信号 (12个)
    const publicSignals = [
      commitment.toString(),                            // [0] commitment
      nullifierHash.toString(),                         // [1] nullifierHash
      isCompliant ? "1" : "0",                         // [2] isCompliant
      (zkInput.minAge || 18).toString(),               // [3] minAge
      (zkInput.allowedCountry || 0).toString(),        // [4] allowedCountry
      (zkInput.minKycLevel || 2).toString(),           // [5] minKycLevel
      (zkInput.minNetWorth || 0).toString(),           // [6] minNetWorth
      (zkInput.minLiquidAssets || 0).toString(),       // [7] minLiquidAssets
      (zkInput.requireAccredited || 0).toString(),     // [8] requireAccredited
      (zkInput.minIncome || 0).toString(),             // [9] minIncome
      zkInput.walletAddress.toString(),                 // [10] walletAddress
      zkInput.timestamp.toString()                      // [11] timestamp
    ];

    console.log('🎭 生成的模拟公共信号 (12个):', publicSignals.map((s, i) => `[${i}] ${s.length > 20 ? s.substring(0, 15) + '...' : s}`));

    return {
      proof: mockProof,
      publicSignals,
      verified: false, // 模拟证明无法通过真实验证
      isMockProof: true, // 明确标识这是模拟证明
      metadata: {
        type: 'mock',
        timestamp: Date.now(),
        server: 'dedicated-zk-server',
        generationTime: '0.001',
        warning: '⚠️ 模拟证明：仅用于开发测试，不具备真实零知识证明的安全性'
      }
    };
  }

  /**
   * 健康检查
   */
  healthCheck() {
    try {
      const files = this.validateCircuitFiles();
      return {
        status: 'healthy',
        files,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: Date.now()
      };
    }
  }
}

export default ProofGenerator;

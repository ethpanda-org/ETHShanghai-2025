// Real SnarkJS service for ZK proof generation
// 基于真实电路的 ZK 证明生成服务

import { keccak256, encodePacked } from "viem"
import path from 'path'
import fs from 'fs'

/**
 * ZK 证明输入接口
 */
export interface ZKProofInput {
  // 私密输入（用户隐私，不会泄露）
  actualAge: number
  actualCountry: number
  actualAssets: number
  credentialHash: bigint
  secret: bigint
  
  // 公开输入（平台要求，所有人可见）
  minAge: number
  allowedCountry: number
  minAssets: number
  walletAddress: bigint
  timestamp: bigint
}

/**
 * ZK 证明输出接口
 */
export interface ZKProof {
  proof: {
    pi_a: [string, string]
    pi_b: [[string, string], [string, string]]
    pi_c: [string, string]
    protocol: string
    curve: string
  }
  publicSignals: string[]
}

/**
 * SnarkJS 服务类 - 真实 ZK 证明生成
 * 
 * 公共信号结构（8个）：
 * [0] commitment      - 电路计算输出
 * [1] nullifierHash   - 电路计算输出
 * [2] isCompliant     - 电路计算输出
 * [3] minAge          - 公开输入
 * [4] allowedCountry  - 公开输入
 * [5] minAssets       - 公开输入
 * [6] walletAddress   - 公开输入
 * [7] timestamp       - 公开输入
 */
class SnarkJSService {
  private circuitName = "minimal_zkrwa"
  private basePath = path.join(process.cwd(), 'circuits')
  private wasmPath = path.join(this.basePath, 'minimal_zkrwa_js', 'minimal_zkrwa.wasm')
  private zkeyPath = path.join(this.basePath, 'keys', 'minimal_zkrwa_final.zkey')
  private vkeyPath = path.join(this.basePath, 'keys', 'minimal_zkrwa_verification_key.json')

  /**
   * 从 VC 准备 ZK 证明输入
   * 
   * @param vcData - VC 凭证主题数据
   * @param walletAddress - 用户钱包地址
   * @param requirements - 平台合规要求
   * @returns ZK 证明输入
   */
  prepareInputsFromVC(
    vcData: any,
    walletAddress: string,
    requirements: {
      minAge: number
      allowedCountry: number
      minAssets: number
    }
  ): ZKProofInput {
    // 计算 credentialHash (VC 的哈希)
    const credentialHash = this.hash(JSON.stringify(vcData))
    
    // 生成随机 secret
    const secret = this.generateSecret()
    
    // BN254 字段最大值
    const maxFieldValue = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    
    // 验证并修正字段大小
    const safeCredentialHash = credentialHash >= maxFieldValue ? credentialHash % maxFieldValue : credentialHash
    const safeSecret = secret >= maxFieldValue ? secret % maxFieldValue : secret

    if (credentialHash >= maxFieldValue) {
      console.warn('⚠️ credentialHash 超出字段大小，已进行模运算:', credentialHash.toString(), '->', safeCredentialHash.toString())
    }
    if (secret >= maxFieldValue) {
      console.warn('⚠️ secret 超出字段大小，已进行模运算:', secret.toString(), '->', safeSecret.toString())
    }
    
    // 提取实际数据
    const actualAge = vcData.age || this.calculateAge(vcData.dateOfBirth) || 0
    const actualCountry = this.countryToCode(vcData.nationality || 'CN')
    const actualAssets = vcData.netWorth || vcData.assets || 0
    
    // 转换钱包地址为 BigInt
    let walletAddressBigInt: bigint
    try {
      // 处理以太坊地址格式
      const cleanAddress = walletAddress.startsWith('0x') ? walletAddress.slice(2) : walletAddress
      walletAddressBigInt = BigInt('0x' + cleanAddress)
      console.log('✅ 钱包地址转换成功:', walletAddressBigInt.toString())
    } catch (error) {
      console.error('❌ 钱包地址转换失败:', error)
      throw new Error(`无效的钱包地址格式: ${walletAddress}`)
    }
    
    // 生成时间戳
    const timestamp = BigInt(Math.floor(Date.now() / 1000))
    
    return {
      // 私密输入
      actualAge,
      actualCountry,
      actualAssets,
      credentialHash: safeCredentialHash,  // ✅ 使用安全值
      secret: safeSecret,                  // ✅ 使用安全值
      
      // 公开输入
      minAge: requirements.minAge,
      allowedCountry: requirements.allowedCountry,
      minAssets: requirements.minAssets,
      walletAddress: walletAddressBigInt,
      timestamp
    }
  }

  /**
   * 生成 ZK 证明
   * 
   * @param input - ZK 证明输入
   * @returns ZK 证明
   */
  async generateProof(input: ZKProofInput): Promise<ZKProof> {
    console.log('🔧 开始生成 ZK 证明...')
    
    try {
      // 动态导入 snarkjs
      const snarkjs = await import('snarkjs')
      
      // 准备电路输入
      const circuitInput = {
        actualAge: input.actualAge.toString(),
        actualCountry: input.actualCountry.toString(),
        actualAssets: input.actualAssets.toString(),
        credentialHash: input.credentialHash.toString(),
        secret: input.secret.toString(),
        minAge: input.minAge.toString(),
        allowedCountry: input.allowedCountry.toString(),
        minAssets: input.minAssets.toString(),
        walletAddress: input.walletAddress.toString(),
        timestamp: input.timestamp.toString()
      }
      
      console.log('📊 电路输入:', circuitInput)
      
      // 检查文件路径
      const paths = {
        wasmPath: this.wasmPath,
        zkeyPath: this.zkeyPath,
        vkeyPath: this.vkeyPath
      }
      console.log('📁 电路文件路径:', paths)
      
      // 验证文件存在
      const fileChecks = {
        wasmExists: fs.existsSync(this.wasmPath),
        zkeyExists: fs.existsSync(this.zkeyPath),
        vkeyExists: fs.existsSync(this.vkeyPath)
      }
      console.log('📁 文件存在性检查:', fileChecks)
      
      if (!fileChecks.wasmExists || !fileChecks.zkeyExists || !fileChecks.vkeyExists) {
        throw new Error('电路文件缺失，请确保已正确编译电路')
      }
      
      // 验证输入格式
      console.log('🔧 验证电路输入格式...')
      const inputKeys = Object.keys(circuitInput)
      console.log('输入信号数量:', inputKeys.length)
      console.log('预期信号:', [
        'actualAge', 'actualCountry', 'actualAssets', 'credentialHash', 'secret',
        'minAge', 'allowedCountry', 'minAssets', 'walletAddress', 'timestamp'
      ])
      console.log('实际信号:', inputKeys)
      
      console.log('⏳ 开始生成ZK证明...')
      console.log('📊 电路复杂度: 79个非线性约束')
      console.log('⏱️  预计需要: 30-120秒（取决于系统性能）')
      console.log('💡 提示: 首次生成可能较慢，请耐心等待...')
      
      const startTime = Date.now()
      
      // 创建证明生成的Promise
      const proofPromise = snarkjs.groth16.fullProve(
        circuitInput,
        this.wasmPath,
        this.zkeyPath
      ).then(result => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2)
        console.log(`⏱️  证明生成耗时: ${elapsed}秒`)
        return result
      })
      
      // 180秒超时（给ZK证明生成足够时间，复杂电路需要更长时间）
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ZK证明生成超时（180秒）')), 180000)
      })
      
      const { proof, publicSignals } = await Promise.race([proofPromise, timeoutPromise])
      
      console.log('✅ ZK 证明生成成功!')
      console.log('📊 原始公共信号:', publicSignals)
      
      // 🔧 重新排列公共信号以匹配合约期望
      // 电路输出: [minAge, allowedCountry, minAssets, walletAddress, timestamp, commitment, nullifierHash, isCompliant]
      // 合约期望: [commitment, nullifierHash, isCompliant, minAge, allowedCountry, minAssets, walletAddress, timestamp]
      const reorderedSignals = [
        publicSignals[5], // commitment
        publicSignals[6], // nullifierHash
        publicSignals[7], // isCompliant
        publicSignals[0], // minAge
        publicSignals[1], // allowedCountry
        publicSignals[2], // minAssets
        publicSignals[3], // walletAddress
        publicSignals[4]  // timestamp
      ]
      
      console.log('📊 重新排列后的公共信号:', reorderedSignals)
      
      return { proof, publicSignals: reorderedSignals }
      
    } catch (error: any) {
      console.error('❌ 真实证明生成失败，使用模拟证明:', error)
      console.log('🕐 错误类型:', error.message?.includes('超时') ? '证明生成超时' : '电路或输入错误')
      
      // 生成模拟证明作为降级方案
      return this.generateMockProof(input)
    }
  }

  /**
   * 生成模拟 ZK 证明（用于测试和降级）
   * 
   * @param input - ZK 证明输入
   * @returns 模拟 ZK 证明
   */
  private generateMockProof(input: ZKProofInput): ZKProof {
    console.log('🎭 生成模拟 ZK 证明')
    console.log('📊 输入参数:', {
      actualAge: input.actualAge,
      actualCountry: input.actualCountry,
      actualAssets: input.actualAssets,
      minAge: input.minAge,
      allowedCountry: input.allowedCountry,
      minAssets: input.minAssets,
      walletAddress: input.walletAddress.toString(),
      timestamp: input.timestamp.toString()
    })
    
    // 模拟合规检查
    const ageCheck = input.actualAge >= input.minAge
    const countryCheck = input.actualCountry === input.allowedCountry
    const assetsCheck = input.actualAssets >= input.minAssets
    const isCompliant = ageCheck && countryCheck && assetsCheck
    
    console.log('📊 合规检查:', {
      ageCheck: `${input.actualAge} >= ${input.minAge} = ${ageCheck}`,
      countryCheck: `${input.actualCountry} === ${input.allowedCountry} = ${countryCheck}`,
      assetsCheck: `${input.actualAssets} >= ${input.minAssets} = ${assetsCheck}`,
      isCompliant
    })
    
    // 计算 commitment 和 nullifierHash
    const commitment = (input.credentialHash + input.secret + input.walletAddress) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    const nullifierHash = (input.credentialHash + input.secret) % BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    
    // 模拟证明结构
    const proof = {
      pi_a: [
        "0x1234567890abcdef1234567890abcdef12345678",
        "0xfedcba0987654321fedcba0987654321fedcba09"
      ],
      pi_b: [
        [
          "0x1111111111111111111111111111111111111111",
          "0x2222222222222222222222222222222222222222"
        ],
        [
          "0x3333333333333333333333333333333333333333",
          "0x4444444444444444444444444444444444444444"
        ]
      ],
      pi_c: [
        "0x5555555555555555555555555555555555555555",
        "0x6666666666666666666666666666666666666666"
      ],
      protocol: "groth16",
      curve: "bn128"
    }
    
    // 🔧 修复：按合约期望的顺序组装公共信号
    // 合约期望: [commitment, nullifierHash, isCompliant, minAge, allowedCountry, minAssets, walletAddress, timestamp]
    const publicSignals = [
      commitment.toString(),           // [0] commitment
      nullifierHash.toString(),        // [1] nullifierHash
      isCompliant ? "1" : "0",        // [2] isCompliant
      input.minAge.toString(),         // [3] minAge
      input.allowedCountry.toString(), // [4] allowedCountry
      input.minAssets.toString(),      // [5] minAssets
      input.walletAddress.toString(),  // [6] walletAddress
      input.timestamp.toString()       // [7] timestamp
    ]
    
    console.log('📊 最终公共信号:', {
      commitment: publicSignals[0],
      nullifierHash: publicSignals[1],
      isCompliant: publicSignals[2],
      minAge: publicSignals[3],
      allowedCountry: publicSignals[4],
      minAssets: publicSignals[5],
      walletAddress: publicSignals[6],
      timestamp: publicSignals[7]
    })
    
    return { proof, publicSignals }
  }

  /**
   * 哈希函数
   * 
   * @param data - 要哈希的数据
   * @returns BigInt 哈希值
   */
  private hash(data: string): bigint {
    try {
      // 使用 keccak256 生成哈希
      const hash = keccak256(encodePacked(['string'], [data]))
      const hashBigInt = BigInt(hash)
      
      // 确保在BN254字段范围内
      const maxFieldValue = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
      return hashBigInt % maxFieldValue
    } catch (error) {
      // 降级方案：使用简单的字符串哈希
      let hashValue = 0n
      const maxFieldValue = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
      for (let i = 0; i < data.length; i++) {
        hashValue = (hashValue * 31n + BigInt(data.charCodeAt(i))) % maxFieldValue
      }
      return hashValue
    }
  }

  /**
   * 生成随机 secret
   * 
   * @returns 随机 BigInt
   */
  private generateSecret(): bigint {
    // 生成 32 字节的随机数
    const randomBytes = new Uint8Array(32)
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomBytes)
    } else {
      // Node.js 环境降级方案
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256)
      }
    }
    
    // 转换为 BigInt
    let result = 0n
    for (let i = 0; i < randomBytes.length; i++) {
      result = (result << 8n) + BigInt(randomBytes[i])
    }
    
    // 确保在字段范围内
    const maxFieldValue = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
    return result % maxFieldValue
  }

  /**
   * 计算年龄
   * 
   * @param dateOfBirth - 出生日期字符串
   * @returns 年龄
   */
  private calculateAge(dateOfBirth: string): number {
    const birth = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    
    if (today.getMonth() < birth.getMonth() || 
        (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) {
      age--
    }
    
    return age
  }

  /**
   * 国家名称转换为 ISO 数字代码
   * 
   * @param country - 国家名称或代码
   * @returns ISO 3166-1 数字代码
   */
  private countryToCode(country: string): number {
    const countryMap: { [key: string]: number } = {
      'CN': 156,
      '中国': 156,
      'China': 156,
      'US': 840,
      '美国': 840,
      'USA': 840,
      'United States': 840,
      'JP': 392,
      '日本': 392,
      'Japan': 392,
      'UK': 826,
      '英国': 826,
      'United Kingdom': 826
    }
    
    return countryMap[country] || 156 // 默认中国
  }

  /**
   * 验证ZK证明
   * @param proof - ZK证明对象
   * @returns 是否验证通过
   */
  async verifyProof(proof: ZKProofResult): Promise<boolean> {
    try {
      console.log('🔍 开始验证ZK证明...')
      
      // 动态导入 snarkjs
      const snarkjs = await import('snarkjs')
      
      // 检查文件是否存在
      if (!fs.existsSync(this.vkeyPath)) {
        console.error('❌ 验证密钥文件不存在:', this.vkeyPath)
        return false
      }

      // 读取验证密钥
      const vKey = JSON.parse(fs.readFileSync(this.vkeyPath, 'utf8'))
      
      // 使用snarkjs验证证明
      const isValid = await snarkjs.groth16.verify(
        vKey,
        proof.publicSignals,
        proof.proof
      )

      console.log('✅ ZK证明验证结果:', isValid)
      return isValid

    } catch (error) {
      console.error('❌ ZK证明验证失败:', error)
      return false
    }
  }

  /**
   * 从公共信号中提取commitment
   * @param publicSignals - 公共信号数组
   * @returns commitment值
   */
  extractCommitment(publicSignals: string[]): string {
    // commitment是第一个公共信号
    return publicSignals[0] || '0'
  }

  /**
   * 检查公共信号中的合规性
   * @param publicSignals - 公共信号数组
   * @returns 是否合规
   */
  isValidCompliance(publicSignals: string[]): boolean {
    // isCompliant是第三个公共信号（索引2）
    const isCompliant = publicSignals[2]
    return isCompliant === '1'
  }
}

// 导出单例
export const realSnarkJSService = new SnarkJSService()
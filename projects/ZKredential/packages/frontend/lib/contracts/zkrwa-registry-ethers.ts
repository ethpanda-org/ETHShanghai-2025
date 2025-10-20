import { ethers } from 'ethers'
import { getContractAddresses } from './addresses'
import ZKRWA_REGISTRY_ABI from './abis/ZKRWARegistry.json'
import ZKRWA_REGISTRY_MULTIPLATFORM_ABI from './abis/ZKRWARegistryMultiPlatform.json'

export interface ZKProofData {
  zkProof?: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
    curve: string
  }
  proof?: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
    curve: string
  }
  publicSignals: string[]
  commitment?: string
}

/**
 * ZKRWARegistry 合约交互类 (使用 ethers.js v6)
 */
export class ZKRWARegistryContract {
  private contract: ethers.Contract
  private signer: ethers.Signer
  private provider: ethers.Provider
  public readonly address: string

  constructor(provider: ethers.Provider, signer?: ethers.Signer | ethers.Provider, chainId: number = 11155111) {
    const addresses = getContractAddresses(chainId)
    this.address = addresses.registry
    this.provider = provider
    
    // 使用新的多平台 ABI（支持 platform 参数）
    const ABI = (chainId === 11155111 || chainId === 31337) && ZKRWA_REGISTRY_MULTIPLATFORM_ABI
      ? ZKRWA_REGISTRY_MULTIPLATFORM_ABI  // Sepolia 和 Localhost 使用新合约
      : ZKRWA_REGISTRY_ABI;                // 其他网络使用旧合约
    
    console.log('🔍 使用的 ABI:', {
      chainId,
      abiType: ABI === ZKRWA_REGISTRY_MULTIPLATFORM_ABI ? 'MultiPlatform' : 'Legacy',
      abiIsArray: Array.isArray(ABI)
    })
    
    // 如果signer是Provider类型，说明是只读模式
    if (signer && 'getSigner' in signer) {
      this.signer = signer as ethers.Signer
      this.contract = new ethers.Contract(this.address, ABI as any, provider)
    } else if (signer) {
      this.signer = signer as ethers.Signer
      this.contract = new ethers.Contract(this.address, ABI as any, signer)
    } else {
      // 只读模式
      this.signer = provider as any
      this.contract = new ethers.Contract(this.address, ABI as any, provider)
    }
    
    console.log('🏗️ ZKRWARegistry 合约初始化:', {
      address: this.address,
      chainId,
      hasProvider: !!provider,
      hasSigner: !!signer,
      isReadOnly: !signer || 'getSigner' in signer
    })
  }

  /**
   * 估算注册身份的Gas费用
   */
  async estimateRegisterIdentityGas(
    proof: ZKProofData,
    provider: string = 'baidu',
    expiresAt?: number
  ): Promise<bigint> {
    if (!this.signer) {
      throw new Error('需要钱包签名者进行Gas估算')
    }

    const currentTimestamp = Math.floor(Date.now() / 1000)
    const finalExpiresAt = expiresAt || (currentTimestamp + 24 * 60 * 60)

    // 适配新的证明数据结构
    const zkProof = proof.zkProof || proof.proof
    
    if (!zkProof) {
      throw new Error('证明数据格式错误：缺少zkProof或proof字段')
    }
    
    const proofA = [
      BigInt(zkProof.pi_a[0]),
      BigInt(zkProof.pi_a[1])
    ]

    const proofB = [
      [BigInt(zkProof.pi_b[0][1]), BigInt(zkProof.pi_b[0][0])],
      [BigInt(zkProof.pi_b[1][1]), BigInt(zkProof.pi_b[1][0])]
    ]

    const proofC = [
      BigInt(zkProof.pi_c[0]),
      BigInt(zkProof.pi_c[1])
    ]

    const pubSignals = proof.publicSignals.slice(0, 12).map(s => BigInt(s))

    return await this.contract.registerIdentity.estimateGas(
      proofA,
      proofB,
      proofC,
      pubSignals,
      provider,
      finalExpiresAt
    )
  }

  /**
   * 注册身份到链上
   */
  async registerIdentity(
    proof: ZKProofData,
    provider: string = 'baidu',
    expiresAt?: number
  ): Promise<{ hash: string }> {
    try {
      if (!this.signer) {
        throw new Error('需要钱包签名者进行交易')
      }

      const signerAddress = await this.signer.getAddress()
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const finalExpiresAt = expiresAt || (currentTimestamp + 24 * 60 * 60) // 默认24小时后过期

      console.log('📝 准备链上注册参数:', {
        signerAddress,
        proofKeysCount: Object.keys(proof.zkProof || proof.proof || {}).length,
        publicSignalsLength: proof.publicSignals?.length,
        provider,
        expiresAt: finalExpiresAt,
        currentTimestamp
      })

      // 适配新的证明数据结构
      const zkProof = proof.zkProof || proof.proof
      
      if (!zkProof) {
        throw new Error('证明数据格式错误：缺少zkProof或proof字段')
      }
      
      // 转换证明格式为合约需要的格式
      const proofA = [
        BigInt(zkProof.pi_a[0]),
        BigInt(zkProof.pi_a[1])
      ]

      // 尝试不同的pi_b顺序（Groth16验证器对顺序敏感）
      const proofB_original = [
        [BigInt(zkProof.pi_b[0][1]), BigInt(zkProof.pi_b[0][0])],
        [BigInt(zkProof.pi_b[1][1]), BigInt(zkProof.pi_b[1][0])]
      ]

      const proofB_alternative = [
        [BigInt(zkProof.pi_b[0][0]), BigInt(zkProof.pi_b[0][1])],
        [BigInt(zkProof.pi_b[1][0]), BigInt(zkProof.pi_b[1][1])]
      ]

      console.log('🔍 pi_b顺序测试:', {
        original: proofB_original.map(arr => arr.map(x => x.toString())),
        alternative: proofB_alternative.map(arr => arr.map(x => x.toString()))
      })

      const proofC = [
        BigInt(zkProof.pi_c[0]),
        BigInt(zkProof.pi_c[1])
      ]

      // 转换公共信号（12个）
      const pubSignals = proof.publicSignals.slice(0, 12).map(s => BigInt(s))

      // 验证器合约状态检查
      try {
        const verifierAddress = await this.contract.verifier()
        const verifierCode = await this.provider.getCode(verifierAddress)
        
        console.log('🔍 验证器合约状态:', {
          verifierAddress,
          hasCode: verifierCode !== '0x',
          codeLength: verifierCode.length
        })
      } catch (error) {
        console.warn('⚠️ 无法获取验证器状态:', error)
      }

      // 地址转换验证
      const addressFromProof = "0x" + BigInt(proof.publicSignals[6]).toString(16).padStart(40, '0').toLowerCase()
      const actualAddress = signerAddress.toLowerCase()
      
      console.log('🔍 地址验证详情:', {
        publicSignalRaw: proof.publicSignals[6],
        addressFromProof,
        actualAddress,
        addressMatch: addressFromProof === actualAddress,
        bigIntFromAddress: BigInt(signerAddress).toString()
      })

      // 验证关键参数
      console.log('🔍 关键参数验证:', {
        commitment: pubSignals[0].toString(),
        nullifierHash: pubSignals[1].toString(),
        isCompliant: pubSignals[2].toString(),
        walletAddressFromProof: pubSignals[6].toString(),
        currentAccount: signerAddress,
        addressMatch: pubSignals[6].toString() === BigInt(signerAddress).toString(),
        currentTimestamp,
        expiresAt: finalExpiresAt,
        timeValid: finalExpiresAt > currentTimestamp
      })

      // 🔍 验证原始证明数据结构
      console.log('🔍 原始证明数据结构检查:', {
        zkProof: {
          pi_a: {
            exists: !!zkProof.pi_a,
            length: zkProof.pi_a?.length,
            values: zkProof.pi_a?.slice(0, 2).map(x => x.toString()), // 只显示前2个用于合约
            allStrings: zkProof.pi_a?.every(x => typeof x === 'string')
          },
          pi_b: {
            exists: !!zkProof.pi_b,
            length: zkProof.pi_b?.length,
            structure: zkProof.pi_b?.slice(0, 2).map(arr => arr?.length), // 只显示前2个用于合约
            values: zkProof.pi_b?.slice(0, 2).map(arr => arr?.map(x => x.toString())),
            allStrings: zkProof.pi_b?.slice(0, 2).every(arr => arr?.every(x => typeof x === 'string'))
          },
          pi_c: {
            exists: !!zkProof.pi_c,
            length: zkProof.pi_c?.length,
            values: zkProof.pi_c?.slice(0, 2).map(x => x.toString()), // 只显示前2个用于合约
            allStrings: zkProof.pi_c?.every(x => typeof x === 'string')
          }
        },
        publicSignals: {
          exists: !!proof.publicSignals,
          length: proof.publicSignals?.length,
          values: proof.publicSignals?.map(x => x.toString()),
          allStrings: proof.publicSignals?.every(x => typeof x === 'string')
        }
      })

      // 🔍 检查是否是模拟数据
      const isMockData = zkProof.pi_a?.[0] === "0" || 
                        zkProof.pi_a?.every(x => x === "0") ||
                        zkProof.pi_b?.every(arr => arr?.every(x => x === "0")) ||
                        zkProof.pi_c?.every(x => x === "0")
      
      if (isMockData) {
        console.warn('⚠️ 检测到可能的模拟证明数据 - 这将导致验证失败')
      } else {
        console.log('✅ 证明数据看起来是真实的（非全零）')
      }

      // 🔍 详细调试 - 逐步验证所有参数
      console.log('🔍 开始详细调试合约调用...')
      
      try {
        // 1. 单独测试ZK验证器
        console.log('🔍 步骤1: 测试ZK验证器...')
        // 使用正确的验证器ABI (直接导入JSON文件避免动态导入问题)
        const GROTH16_VERIFIER_ABI = [
          {
            "inputs": [
              {"internalType": "uint256[2]", "name": "_pA", "type": "uint256[2]"},
              {"internalType": "uint256[2][2]", "name": "_pB", "type": "uint256[2][2]"},
              {"internalType": "uint256[2]", "name": "_pC", "type": "uint256[2]"},
              {"internalType": "uint256[8]", "name": "_pubSignals", "type": "uint256[8]"}
            ],
            "name": "verifyProof",
            "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
            "stateMutability": "view",
            "type": "function"
          }
        ]
        
        const verifierContract = new ethers.Contract(
          await this.contract.verifier(),
          GROTH16_VERIFIER_ABI,
          this.provider
        )
        console.log("🔧 验证器合约实例创建成功");
        
        // 🔍 详细参数检查
        console.log('🔍 验证器调用参数详情:', {
          proofA: {
            values: proofA.map(x => x.toString()),
            types: proofA.map(x => typeof x),
            isValid: proofA.every(x => typeof x === 'bigint'),
            length: proofA.length
          },
          proofB_original: {
            values: proofB_original.map(arr => arr.map(x => x.toString())),
            structure: `${proofB_original.length}x${proofB_original[0]?.length}`,
            isValid: proofB_original.every(arr => arr.every(x => typeof x === 'bigint')),
            flatLength: proofB_original.flat().length
          },
          proofC: {
            values: proofC.map(x => x.toString()),
            types: proofC.map(x => typeof x),
            isValid: proofC.every(x => typeof x === 'bigint'),
            length: proofC.length
          },
          pubSignals: {
            values: pubSignals.map(x => x.toString()),
            length: pubSignals.length,
            types: pubSignals.map(x => typeof x),
            isValid: pubSignals.length === 8 && pubSignals.every(x => typeof x === 'bigint')
          }
        })

        // 🔍 检查BN254字段范围
        const maxFieldValue = BigInt('21888242871839275222246405745257275088548364400416034343698204186575808495617')
        const allValues = [
          ...proofA,
          ...proofB_original.flat(),
          ...proofC,
          ...pubSignals
        ]

        const outOfRange = allValues.filter(val => val >= maxFieldValue)
        if (outOfRange.length > 0) {
          console.error('❌ 发现超出BN254字段范围的值:', outOfRange.map(x => x.toString()))
          console.error('❌ 最大允许值:', maxFieldValue.toString())
        } else {
          console.log('✅ 所有值都在BN254字段范围内')
        }

        // 🔍 检查验证器合约状态
        const verifierAddress = await this.contract.verifier()
        const verifierCode = await this.provider.getCode(verifierAddress)
        
        console.log('🔍 验证器合约检查:', {
          address: verifierAddress,
          hasCode: verifierCode !== '0x',
          codeLength: verifierCode.length,
          publicSignalsCount: pubSignals.length
        })

        // 🔍 尝试低级调用进行更详细的错误诊断
        try {
          console.log('🔍 尝试低级调用验证器...')
          const callData = verifierContract.interface.encodeFunctionData('verifyProof', [
            proofA, proofB_original, proofC, pubSignals
          ])
          
          console.log('🔍 编码的调用数据长度:', callData.length)
          console.log('🔍 调用数据前缀:', callData.substring(0, 10))
          
          const result = await this.provider.call({
            to: verifierAddress,
            data: callData
          })
          
          const decoded = verifierContract.interface.decodeFunctionResult('verifyProof', result)
          console.log('✅ 低级调用成功，结果:', decoded[0])
          
        } catch (lowLevelError: any) {
          console.error('❌ 低级调用也失败:', {
            message: lowLevelError.message,
            code: lowLevelError.code,
            data: lowLevelError.data
          })
        }
        
        // 测试原始pi_b顺序
        console.log('🔍 开始测试原始pi_b顺序...')
        const isProofValid_original = await verifierContract.verifyProof(proofA, proofB_original, proofC, pubSignals)
        console.log('🔍 ZK证明验证结果 (原始顺序):', isProofValid_original)
        
        // 测试备用pi_b顺序
        const isProofValid_alternative = await verifierContract.verifyProof(proofA, proofB_alternative, proofC, pubSignals)
        console.log('🔍 ZK证明验证结果 (备用顺序):', isProofValid_alternative)
        
        if (!isProofValid_original && !isProofValid_alternative) {
          throw new Error('❌ ZK证明验证失败 - 两种pi_b顺序都无效')
        }
        
        // 选择有效的pi_b顺序
        const proofB = isProofValid_original ? proofB_original : proofB_alternative
        const proofBType = isProofValid_original ? '原始顺序' : '备用顺序'
        console.log(`✅ 使用${proofBType}的pi_b`)
        
        // 2. 验证时间戳
        console.log('🔍 步骤2: 验证时间戳...')
        const currentTimestamp = Math.floor(Date.now() / 1000)
        const proofTimestamp = Number(pubSignals[7])
        const timeDiff = Math.abs(currentTimestamp - proofTimestamp)
        
        console.log('🔍 时间戳验证:', {
          currentTimestamp,
          proofTimestamp,
          expiresAt: finalExpiresAt,
          timeDiff,
          expiresAtValid: finalExpiresAt > currentTimestamp,
          timestampInRange: timeDiff <= 300,
          timestampNotTooFuture: proofTimestamp <= currentTimestamp + 300,
          timestampNotTooOld: proofTimestamp >= currentTimestamp - 300
        })
        
        if (finalExpiresAt <= currentTimestamp) {
          throw new Error('❌ 过期时间无效 - 必须大于当前时间')
        }
        
        if (timeDiff > 300) {
          throw new Error(`❌ 时间戳超出范围 - 差异: ${timeDiff}秒 > 300秒`)
        }
        
        // 3. 检查重复使用
        console.log('🔍 步骤3: 检查重复使用...')
        
        // 🔧 修复: 将BigInt转换为bytes32格式
        const commitment = ethers.zeroPadValue(ethers.toBeHex(BigInt(pubSignals[0])), 32)
        const nullifier = ethers.zeroPadValue(ethers.toBeHex(BigInt(pubSignals[1])), 32)
        
        console.log('🔍 转换为bytes32格式:', {
          commitmentOriginal: pubSignals[0].toString(),
          nullifierOriginal: pubSignals[1].toString(),
          commitmentHex: commitment,
          nullifierHex: nullifier
        })
        
        const commitmentUsed = await this.contract.usedCommitments(commitment)
        const nullifierUsed = await this.contract.usedNullifiers(nullifier)
        
        console.log('🔍 重复使用检查:', {
          commitment: pubSignals[0].toString(),
          nullifier: pubSignals[1].toString(),
          commitmentUsed,
          nullifierUsed
        })
        
        if (commitmentUsed) {
          throw new Error('❌ Commitment已被使用')
        }
        
        if (nullifierUsed) {
          throw new Error('❌ Nullifier已被使用')
        }
        
        // 4. 验证合规性
        console.log('🔍 步骤4: 验证合规性...')
        const isCompliant = pubSignals[2] === BigInt(1)
        console.log('🔍 合规性检查:', {
          isCompliantRaw: pubSignals[2].toString(),
          isCompliant
        })
        
        if (!isCompliant) {
          throw new Error('❌ 不符合合规要求')
        }
        
        // 5. 验证地址匹配
        console.log('🔍 步骤5: 验证地址匹配...')
        const walletAddressFromProof = "0x" + pubSignals[6].toString(16).padStart(40, '0').toLowerCase()
        const actualAddress = (await this.signer.getAddress()).toLowerCase()
        
        console.log('🔍 地址匹配检查:', {
          walletAddressFromProof,
          actualAddress,
          match: walletAddressFromProof === actualAddress
        })
        
        if (walletAddressFromProof !== actualAddress) {
          throw new Error('❌ 地址不匹配')
        }
        
        console.log('✅ 所有参数验证通过，开始Gas估算...')
        
        // 6. 尝试Gas估算
        console.log('🔄 尝试Gas估算...')
        const gasEstimate = await this.contract.registerIdentity.estimateGas(
          proofA,
          proofB,
          proofC,
          pubSignals,
          provider,
          BigInt(finalExpiresAt)
        )
        
        console.log('⛽ Gas估算成功:', gasEstimate.toString())

        // 执行交易
        const tx = await this.contract.registerIdentity(
          proofA,
          proofB,
          proofC,
          pubSignals,
          provider,
          BigInt(finalExpiresAt),
          {
            gasLimit: gasEstimate * BigInt(120) / BigInt(100) // 增加20%的gas缓冲
          }
        )

        console.log(`✅ 链上注册交易已提交 (${proofBType}):`, { hash: tx.hash })
        
        // 等待交易确认
        const receipt = await tx.wait()
        console.log('🎉 交易已确认:', { 
          hash: tx.hash, 
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString()
        })
        
        return { hash: tx.hash }
        
      } catch (debugError) {
        console.error('❌ 详细调试发现问题:', debugError)
        throw debugError
      }

    } catch (error) {
      console.error('❌ 链上注册失败:', error)
      throw error
    }
  }

  /**
   * 检查用户是否有有效身份
   */
  async hasValidIdentity(userAddress: string): Promise<boolean> {
    try {
      const result = await this.contract.hasValidIdentity(userAddress)
      console.log('🔍 身份验证结果:', { userAddress, hasValid: result })
      return result
    } catch (error) {
      console.error('❌ 身份验证失败:', error)
      return false
    }
  }

  /**
   * 检查合规性
   */
  async checkCompliance(
    userAddress: string,
    minAge: number,
    allowedCountry: number,
    minAssets: number
  ): Promise<boolean> {
    try {
      const result = await this.contract.checkCompliance(
        userAddress,
        BigInt(minAge),
        BigInt(allowedCountry),
        BigInt(minAssets)
      )
      console.log('🔍 合规性检查结果:', { 
        userAddress, 
        requirements: { minAge, allowedCountry, minAssets },
        isCompliant: result 
      })
      return result
    } catch (error) {
      console.error('❌ 合规性检查失败:', error)
      return false
    }
  }

  /**
   * 获取用户的commitment
   */
  async getCommitment(userAddress: string): Promise<string | null> {
    try {
      const commitment = await this.contract.getCommitment(userAddress)
      console.log('🔍 获取commitment:', { userAddress, commitment: commitment.toString() })
      return commitment.toString()
    } catch (error) {
      console.error('❌ 获取commitment失败:', error)
      return null
    }
  }

  /**
   * 获取用户身份证明信息
   */
  async getIdentityProof(userAddress: string): Promise<any> {
    try {
      const identityProof = await this.contract.identityProofs(userAddress)
      console.log('🔍 获取身份证明:', { userAddress, identityProof })
      return identityProof
    } catch (error) {
      console.error('❌ 获取身份证明失败:', error)
      throw error
    }
  }

  /**
   * 获取注册事件
   */
  async getRegistrationEvents(userAddress: string, fromBlock: number = -10000): Promise<any[]> {
    try {
      const filter = this.contract.filters.IdentityRegistered(userAddress)
      const events = await this.contract.queryFilter(filter, fromBlock)
      console.log('📜 获取注册事件:', { userAddress, eventCount: events.length })
      return events
    } catch (error) {
      console.error('❌ 获取注册事件失败:', error)
      return []
    }
  }

  /**
   * 获取合约信息
   */
  async getContractInfo(): Promise<{
    verifier: string
    totalUsers: string
    platformRequirements: {
      minAge: string
      allowedCountry: string  
      minAssets: string
    }
  }> {
    try {
      const [verifier, totalUsers, requirements] = await Promise.all([
        this.contract.verifier(),
        this.contract.totalUsers(),
        this.contract.getPlatformRequirements()
      ])

      return {
        verifier,
        totalUsers: totalUsers.toString(),
        platformRequirements: {
          minAge: requirements[0].toString(),
          allowedCountry: requirements[1].toString(),
          minAssets: requirements[2].toString()
        }
      }
    } catch (error) {
      console.error('❌ 获取合约信息失败:', error)
      throw error
    }
  }
}

/**
 * 创建合约实例的工厂函数
 */
export async function createZKRWARegistryContract(
  providerOrUrl?: ethers.Provider | string,
  signerOrPrivateKey?: ethers.Signer | string,
  chainId: number = 11155111
): Promise<ZKRWARegistryContract> {
  let provider: ethers.Provider
  let signer: ethers.Signer

  // 处理provider
  if (typeof providerOrUrl === 'string') {
    provider = new ethers.JsonRpcProvider(providerOrUrl)
  } else if (providerOrUrl) {
    provider = providerOrUrl
  } else {
    // 默认使用浏览器的provider
    if (typeof window !== 'undefined' && window.ethereum) {
      provider = new ethers.BrowserProvider(window.ethereum)
    } else {
      throw new Error('未找到以太坊provider')
    }
  }

  // 处理signer
  if (typeof signerOrPrivateKey === 'string') {
    signer = new ethers.Wallet(signerOrPrivateKey, provider)
  } else if (signerOrPrivateKey) {
    signer = signerOrPrivateKey
  } else {
    // 从浏览器provider获取signer
    if (provider instanceof ethers.BrowserProvider) {
      signer = await provider.getSigner()
    } else {
      throw new Error('未找到以太坊signer')
    }
  }

  return new ZKRWARegistryContract(provider, signer, chainId)
}

// 全局类型声明
declare global {
  interface Window {
    ethereum?: any
  }
}

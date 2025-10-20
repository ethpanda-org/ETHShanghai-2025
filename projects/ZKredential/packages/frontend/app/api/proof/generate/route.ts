// API route for ZK proof generation using dedicated ZK server only

import { type NextRequest, NextResponse } from "next/server"
import { realSnarkJSService } from "@/lib/services/zk/snarkjs-service"

// ZK服务器配置
const ZK_SERVER_URL = process.env.ZK_SERVER_URL || 'http://localhost:8080';
const ZK_SERVER_TIMEOUT = 300000; // 5分钟

// 健康检查ZK服务器
async function checkZKServerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${ZK_SERVER_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5秒超时
    });
    return response.ok;
  } catch (error) {
    console.error('ZK服务器健康检查失败:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { address, credentialData, platform = 'propertyfy' } = await request.json()

    console.log('🔍 [API调试] 收到请求:', {
      hasAddress: !!address,
      hasCredentialData: !!credentialData,
      platform: platform,
      credentialDataKeys: credentialData ? Object.keys(credentialData) : [],
      addressType: typeof address,
      credentialDataType: typeof credentialData
    })

    if (!address) {
      return NextResponse.json(
        { error: "缺少钱包地址" },
        { status: 400 }
      )
    }

    if (!credentialData) {
      return NextResponse.json(
        { error: "缺少凭证数据，请从前端传递VC数据" },
        { status: 400 }
      )
    }

    console.log('🔧 [调试] 开始生成ZK证明，用户地址:', address)
    console.log('🔍 [调试] 凭证数据结构:', {
      actualAge: credentialData.actualAge,
      minAge: credentialData.minAge,
      actualNationality: credentialData.actualNationality,
      allowedCountry: credentialData.allowedCountry,
      actualNetWorth: credentialData.actualNetWorth,
      minAssets: credentialData.minAssets,
      expectedCompliance: credentialData.actualAge >= credentialData.minAge
    })

    // 首先检查ZK服务器健康状态
    const isServerHealthy = await checkZKServerHealth();
    if (!isServerHealthy) {
      console.error('❌ ZK服务器不可用');
      return NextResponse.json(
        { 
          success: false,
          error: "ZK证明服务器不可用",
          details: `请确保ZK服务器运行在 ${ZK_SERVER_URL}`,
          suggestion: "请运行 'npm run zk-server' 启动ZK证明服务器"
        },
        { status: 503 }
      );
    }

    // 准备ZK证明输入 - 新的12信号电路
    console.log('🔍 [调试] 原始输入数据分析:', {
      address,
      addressType: typeof address,
      addressLength: address ? address.length : 0,
      credentialDataKeys: Object.keys(credentialData),
      vcSignature: credentialData.vcSignature ? credentialData.vcSignature.substring(0, 20) + '...' : 'N/A',
      vcIssuer: credentialData.vcIssuer ? credentialData.vcIssuer.substring(0, 20) + '...' : 'N/A',
      walletAddress: credentialData.walletAddress ? credentialData.walletAddress.substring(0, 20) + '...' : 'N/A'
    })
    
    let zkInput;
    try {
      // 基础输入（所有平台共享）
      zkInput = {
        // 私密输入 - KYC
        actualAge: credentialData.actualAge || 0,
        actualCountry: credentialData.actualNationality || 156, // 中国
        kycLevel: credentialData.kycLevel || 3, // 默认KYC等级3
        
        // 私密输入 - 资产
        actualNetWorth: credentialData.actualNetWorth || 0,
        actualLiquidAssets: credentialData.actualLiquidAssets || 0,
        isAccreditedInvestor: credentialData.isAccreditedInvestor || 0,
        incomeLast12Months: credentialData.incomeLast12Months || 0,
        
        // 私密输入 - AML（为 realt 和 realestate 平台添加）
        amlRiskScore: credentialData.amlRiskScore || 15, // 默认低风险
        isOnSanctionsList: credentialData.isOnSanctionsList || 0,
        isPEP: credentialData.isPEP || 0,
        sourceOfFundsVerified: credentialData.sourceOfFundsVerified || 1, // 默认已验证
        transactionPatternScore: credentialData.transactionPatternScore || 85, // 默认良好
        
        // 私密输入 - 通用
        credentialHash: credentialData.vcSignature ? 
          BigInt('0x' + credentialData.vcSignature.replace(/^0x/, '').padStart(64, '0')) : 
          BigInt('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'),
        secret: credentialData.vcIssuer ? 
          BigInt('0x' + credentialData.vcIssuer.replace(/^0x/, '').padStart(64, '0')) : 
          BigInt('0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321'),
        
        // 公共输入 - KYC要求
        minAge: credentialData.minAge || 18,
        allowedCountry: credentialData.allowedCountry || 0, // 0表示不限制
        minKycLevel: credentialData.minKycLevel || 2,
        
        // 公共输入 - 资产要求
        minNetWorth: credentialData.minNetWorth || 0,
        minLiquidAssets: credentialData.minLiquidAssets || 0,
        requireAccredited: credentialData.requireAccredited || 0,
        minIncome: credentialData.minIncome || 0,
        
        // 公共输入 - AML要求（为 realt 和 realestate 平台添加）
        maxAMLRiskScore: credentialData.maxAMLRiskScore || 50, // 默认最大风险分数
        allowPEP: credentialData.allowPEP || 0, // 默认不允许PEP
        requireFundsVerification: credentialData.requireFundsVerification || 1, // 默认需要资金验证
        minTransactionScore: credentialData.minTransactionScore || 60, // 默认最低交易分数
        
        // 公共输入 - 通用
        walletAddress: credentialData.walletAddress ? 
          BigInt(credentialData.walletAddress) : 
          (address.startsWith('0x') ? BigInt(address) : BigInt('0x' + address)),
        timestamp: BigInt(Math.floor(Date.now() / 1000))
      }
      
      console.log('🔍 [调试] ZK输入转换成功 (12信号):', {
        actualAge: zkInput.actualAge,
        kycLevel: zkInput.kycLevel,
        actualNetWorth: zkInput.actualNetWorth,
        actualLiquidAssets: zkInput.actualLiquidAssets,
        walletAddressLength: zkInput.walletAddress.toString().length,
        credentialHashLength: zkInput.credentialHash.toString().length,
        secretLength: zkInput.secret.toString().length,
        complianceCheck: {
          ageCompliant: zkInput.actualAge >= zkInput.minAge,
          kycCompliant: zkInput.kycLevel >= zkInput.minKycLevel,
          netWorthCompliant: zkInput.actualNetWorth >= zkInput.minNetWorth,
          liquidAssetsCompliant: zkInput.actualLiquidAssets >= zkInput.minLiquidAssets
        }
      })
      
    } catch (conversionError: any) {
      console.error('❌ [调试] 数据转换失败:', {
        error: conversionError?.message || String(conversionError),
        stack: conversionError?.stack,
        address,
        credentialDataSample: {
          actualAge: credentialData.actualAge,
          vcSignature: credentialData.vcSignature ? 'exists' : 'missing',
          vcIssuer: credentialData.vcIssuer ? 'exists' : 'missing',
          walletAddress: credentialData.walletAddress ? 'exists' : 'missing'
        }
      })
      
      return NextResponse.json({
        success: false,
        error: "数据转换失败",
        details: conversionError?.message || String(conversionError),
        debugInfo: {
          address,
          credentialDataKeys: Object.keys(credentialData),
          conversionError: conversionError?.message || String(conversionError)
        }
      }, { status: 400 })
    }
    
    console.log('🔍 [调试] ZK输入数据准备完成 (12信号):', {
      actualAge: zkInput.actualAge,
      minAge: zkInput.minAge,
      kycLevel: zkInput.kycLevel,
      minKycLevel: zkInput.minKycLevel,
      actualNetWorth: zkInput.actualNetWorth,
      minNetWorth: zkInput.minNetWorth,
      complianceCheck: {
        ageCompliant: zkInput.actualAge >= zkInput.minAge,
        kycCompliant: zkInput.kycLevel >= zkInput.minKycLevel,
        netWorthCompliant: zkInput.actualNetWorth >= zkInput.minNetWorth
      }
    })

    console.log('🔧 [调试] ZK输入已准备，调用专用ZK服务器 (新电路)...')

    // 将BigInt转换为字符串以便JSON序列化（所有平台字段）
    const serializableZkInput = {
      // 私密输入 - KYC
      actualAge: zkInput.actualAge,
      actualCountry: zkInput.actualCountry,
      kycLevel: zkInput.kycLevel,
      
      // 私密输入 - 资产
      actualNetWorth: zkInput.actualNetWorth,
      actualLiquidAssets: zkInput.actualLiquidAssets,
      isAccreditedInvestor: zkInput.isAccreditedInvestor,
      incomeLast12Months: zkInput.incomeLast12Months,
      
      // 私密输入 - AML
      amlRiskScore: zkInput.amlRiskScore,
      isOnSanctionsList: zkInput.isOnSanctionsList,
      isPEP: zkInput.isPEP,
      sourceOfFundsVerified: zkInput.sourceOfFundsVerified,
      transactionPatternScore: zkInput.transactionPatternScore,
      
      // 私密输入 - 通用
      credentialHash: zkInput.credentialHash.toString(),
      secret: zkInput.secret.toString(),
      
      // 公共输入 - KYC要求
      minAge: zkInput.minAge,
      allowedCountry: zkInput.allowedCountry,
      minKycLevel: zkInput.minKycLevel,
      
      // 公共输入 - 资产要求
      minNetWorth: zkInput.minNetWorth,
      minLiquidAssets: zkInput.minLiquidAssets,
      requireAccredited: zkInput.requireAccredited,
      minIncome: zkInput.minIncome,
      
      // 公共输入 - AML要求
      maxAMLRiskScore: zkInput.maxAMLRiskScore,
      allowPEP: zkInput.allowPEP,
      requireFundsVerification: zkInput.requireFundsVerification,
      minTransactionScore: zkInput.minTransactionScore,
      
      // 公共输入 - 通用
      walletAddress: zkInput.walletAddress.toString(),
      timestamp: zkInput.timestamp.toString()
    }
    
    console.log('🔍 [调试] 可序列化的ZK输入（包含所有字段）:', {
      platform: platform,
      kyc: {
        actualAge: serializableZkInput.actualAge,
        actualCountry: serializableZkInput.actualCountry,
        kycLevel: serializableZkInput.kycLevel,
        minAge: serializableZkInput.minAge,
        allowedCountry: serializableZkInput.allowedCountry,
        minKycLevel: serializableZkInput.minKycLevel
      },
      asset: {
        actualNetWorth: serializableZkInput.actualNetWorth,
        actualLiquidAssets: serializableZkInput.actualLiquidAssets,
        minNetWorth: serializableZkInput.minNetWorth,
        minLiquidAssets: serializableZkInput.minLiquidAssets
      },
      aml: {
        amlRiskScore: serializableZkInput.amlRiskScore,
        isOnSanctionsList: serializableZkInput.isOnSanctionsList,
        isPEP: serializableZkInput.isPEP,
        maxAMLRiskScore: serializableZkInput.maxAMLRiskScore,
        allowPEP: serializableZkInput.allowPEP
      },
      walletAddress: serializableZkInput.walletAddress.substring(0, 10) + '...',
      timestamp: serializableZkInput.timestamp
    })

    // 调用专用ZK证明服务器（支持多平台）
    console.log(`🎯 [调试] 目标平台: ${platform}`)
    
    const zkServerResponse = await fetch(`${ZK_SERVER_URL}/generate-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        zkInput: serializableZkInput,
        platform: platform,  // ← 添加平台参数
        options: {
          allowMockProof: true, // 允许ZK服务器内部降级到模拟证明
          timeout: ZK_SERVER_TIMEOUT
        }
      }),
      signal: AbortSignal.timeout(ZK_SERVER_TIMEOUT)
    });

    if (!zkServerResponse.ok) {
      const errorText = await zkServerResponse.text();
      console.error('❌ ZK服务器响应错误:', zkServerResponse.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: "ZK服务器响应错误",
          details: `HTTP ${zkServerResponse.status}: ${errorText}`,
          serverUrl: ZK_SERVER_URL
        },
        { status: 502 }
      );
    }

    const zkServerResult = await zkServerResponse.json();
    
    console.log('🔍 [调试] ZK服务器返回结果:', {
      success: zkServerResult.success,
      hasProof: !!zkServerResult.proof,
      proofKeys: zkServerResult.proof ? Object.keys(zkServerResult.proof) : [],
      hasPublicSignals: !!(zkServerResult.proof && zkServerResult.proof.publicSignals),
      publicSignalsLength: zkServerResult.proof && zkServerResult.proof.publicSignals ? zkServerResult.proof.publicSignals.length : 0,
      error: zkServerResult.error
    })

    if (!zkServerResult.success) {
      console.error('❌ [调试] ZK服务器返回失败:', zkServerResult.error);
      return NextResponse.json(
        {
          success: false,
          error: "ZK证明生成失败",
          details: zkServerResult.error || 'ZK服务器返回失败',
          serverUrl: ZK_SERVER_URL
        },
        { status: 500 }
      );
    }

    const proof = zkServerResult.proof;
    
    // 🔧 保持ZK服务器返回的正确信号顺序 - 禁用重排序 (12信号)
    if (proof && proof.publicSignals) {
      console.log('🔍 [调试] ZK服务器返回的信号（已是正确顺序，12个）:', {
        signals: proof.publicSignals,
        length: proof.publicSignals.length,
        order: '[commitment, nullifierHash, isCompliant, minAge, allowedCountry, minKycLevel, minNetWorth, minLiquidAssets, requireAccredited, minIncome, walletAddress, timestamp]',
        serverType: zkServerResult.warning ? 'mock' : 'real'
      })
      
      // 验证信号顺序的正确性 (12信号)
      const signalValidation = {
        lengthValid: proof.publicSignals.length === 12,
        isCompliantValid: proof.publicSignals[2] === '0' || proof.publicSignals[2] === '1',
        minAgeValid: Number(proof.publicSignals[3]) > 0 && Number(proof.publicSignals[3]) < 150,
        allowedCountryValid: Number(proof.publicSignals[4]) >= 0 && Number(proof.publicSignals[4]) < 1000,
        minKycLevelValid: Number(proof.publicSignals[5]) >= 0 && Number(proof.publicSignals[5]) <= 5,
        timestampValid: Number(proof.publicSignals[11]) > 1000000000,
        commitmentValid: proof.publicSignals[0] && proof.publicSignals[0].length > 10,
        nullifierHashValid: proof.publicSignals[1] && proof.publicSignals[1].length > 10,
        walletAddressValid: proof.publicSignals[10] && proof.publicSignals[10].length > 10
      }
      
      const allValid = Object.values(signalValidation).every(v => v === true)
      
      console.log('🔍 [调试] 信号顺序验证 (12个):', {
        ...signalValidation,
        allValid,
        signalMapping: {
          '[0] commitment': proof.publicSignals[0] ? proof.publicSignals[0].toString().substring(0, 15) + '...' : 'N/A',
          '[1] nullifierHash': proof.publicSignals[1] ? proof.publicSignals[1].toString().substring(0, 15) + '...' : 'N/A',
          '[2] isCompliant': proof.publicSignals[2],
          '[3] minAge': proof.publicSignals[3],
          '[4] allowedCountry': proof.publicSignals[4],
          '[5] minKycLevel': proof.publicSignals[5],
          '[6] minNetWorth': proof.publicSignals[6],
          '[7] minLiquidAssets': proof.publicSignals[7],
          '[8] requireAccredited': proof.publicSignals[8],
          '[9] minIncome': proof.publicSignals[9],
          '[10] walletAddress': proof.publicSignals[10] ? proof.publicSignals[10].toString().substring(0, 15) + '...' : 'N/A',
          '[11] timestamp': proof.publicSignals[11]
        }
      })
      
      if (!allValid) {
        console.warn('⚠️ [调试] 信号顺序验证失败，但继续处理...')
      }
      
      // 不进行任何重排序，保持ZK服务器返回的原始正确顺序
      console.log('✅ [调试] 保持原始信号顺序，无需重排序 (12个信号)')
      
      // 最终验证
      const finalIsCompliant = proof.publicSignals[2] === '1' || proof.publicSignals[2] === 1
      const finalTimestamp = Number(proof.publicSignals[11])
      const currentTimestamp = Math.floor(Date.now() / 1000)
      
      console.log('🔍 [调试] 最终信号状态 (12信号):', {
        isCompliant: finalIsCompliant,
        timestamp: finalTimestamp,
        currentTimestamp,
        timestampDiff: Math.abs(currentTimestamp - finalTimestamp),
        timestampInRange: Math.abs(currentTimestamp - finalTimestamp) <= 300,
        readyForContract: allValid && finalIsCompliant && Math.abs(currentTimestamp - finalTimestamp) <= 300
      })
    }
    
    console.log('✅ ZK证明生成成功 (来自专用服务器)');
    console.log('📊 性能信息:', zkServerResult.performance);
    
    if (zkServerResult.warning) {
      console.warn('⚠️', zkServerResult.warning);
    }

    // 提取commitment和检查合规性（12信号）
    const commitment = proof.publicSignals[0];
    const isCompliant = proof.publicSignals[2] === '1' || proof.publicSignals[2] === 1;
    
    console.log('🔍 [调试] 最终结果检查 (12信号):', {
      commitment: commitment ? commitment.toString().substring(0, 20) + '...' : 'N/A',
      isCompliant,
      publicSignalsCount: proof.publicSignals.length,
      signalMapping: {
        '[0] commitment': proof.publicSignals[0] ? proof.publicSignals[0].toString().substring(0, 10) + '...' : 'N/A',
        '[1] nullifierHash': proof.publicSignals[1] ? proof.publicSignals[1].toString().substring(0, 10) + '...' : 'N/A',
        '[2] isCompliant': proof.publicSignals[2],
        '[3] minAge': proof.publicSignals[3],
        '[4] allowedCountry': proof.publicSignals[4],
        '[5] minKycLevel': proof.publicSignals[5],
        '[6] minNetWorth': proof.publicSignals[6],
        '[7] minLiquidAssets': proof.publicSignals[7],
        '[8] requireAccredited': proof.publicSignals[8],
        '[9] minIncome': proof.publicSignals[9],
        '[10] walletAddress': proof.publicSignals[10] ? proof.publicSignals[10].toString().substring(0, 10) + '...' : 'N/A',
        '[11] timestamp': proof.publicSignals[11]
      }
    })

    const finalResult = {
      success: true,
      proof: {
        zkProof: proof.proof,
        commitment,
        publicSignals: proof.publicSignals,
        isValid: proof.verified,
        isCompliant,
        timestamp: Date.now(),
        server: 'dedicated-zk-server',
        performance: zkServerResult.performance
      },
      message: zkServerResult.warning ? 
        "ZK证明生成成功 (使用模拟证明)" : 
        "ZK证明生成成功 (真实证明)",
      warning: zkServerResult.warning
    }
    
    console.log('✅ [调试] API返回最终结果:', {
      success: finalResult.success,
      hasZkProof: !!finalResult.proof.zkProof,
      commitment: finalResult.proof.commitment ? finalResult.proof.commitment.substring(0, 20) + '...' : 'N/A',
      isCompliant: finalResult.proof.isCompliant,
      publicSignalsLength: finalResult.proof.publicSignals.length,
      message: finalResult.message
    })
    
    return NextResponse.json(finalResult);

  } catch (error) {
    console.error("❌ ZK证明生成失败:", error)
    
    // 检查是否是网络连接问题
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        {
          success: false,
          error: "无法连接到ZK证明服务器",
          details: `请确保ZK服务器运行在 ${ZK_SERVER_URL}`,
          suggestion: "请运行 'npm run zk-server' 启动ZK证明服务器"
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "ZK证明生成失败",
        details: error instanceof Error ? error.message : "未知错误"
      },
      { status: 500 }
    )
  }
}


// 百度智能云KYC验证API

import { NextRequest, NextResponse } from 'next/server'
import { BaiduAIKYCProvider } from '@/lib/services/kyc/baidu-ai-provider'

export async function POST(request: NextRequest) {
  try {
    // 🔧 首先验证环境变量
    const apiKey = process.env.BAIDU_AI_API_KEY
    const secretKey = process.env.BAIDU_AI_SECRET_KEY
    
    if (!apiKey || !secretKey) {
      console.error('❌ 百度AI环境变量未配置:', { 
        hasApiKey: !!apiKey, 
        hasSecretKey: !!secretKey 
      })
      return NextResponse.json(
        { 
          success: false,
          error: '服务配置错误',
          details: '百度AI密钥未正确配置，请检查 BAIDU_AI_API_KEY 和 BAIDU_AI_SECRET_KEY',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      )
    }

    console.log('✅ 环境变量检查通过:', {
      apiKeyLength: apiKey.length,
      secretKeyLength: secretKey.length
    })

    const body = await request.json()
    let { sessionId, idCardFront, idCardBack, selfie } = body

    // 🔧 如果sessionId为空，自动生成一个
    if (!sessionId) {
      sessionId = `baidu_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      console.log('🔧 自动生成sessionId:', sessionId)
    }

    // 🔧 添加详细的调试信息
    console.log('📝 收到KYC验证请求:', {
      sessionId,
      hasIdCardFront: !!idCardFront,
      hasIdCardBack: !!idCardBack,
      hasSelfie: !!selfie,
      idCardFrontLength: idCardFront?.length || 0,
      idCardBackLength: idCardBack?.length || 0,
      selfieLength: selfie?.length || 0
    })

    if (!idCardFront || !idCardBack || !selfie) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必需的图片数据',
          details: {
            hasSessionId: !!sessionId,
            hasIdCardFront: !!idCardFront,
            hasIdCardBack: !!idCardBack,
            hasSelfie: !!selfie
          }
        },
        { status: 400 }
      )
    }

    console.log(`🔄 开始百度AI KYC验证，会话ID: ${sessionId}`)

    // 创建百度AI KYC提供商实例
    const provider = new BaiduAIKYCProvider({
      apiKey,
      secretKey
    })

    // 添加30秒超时保护
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('API调用超时（30秒）')), 30000)
    )

    const verifyPromise = provider.performFullKYC(
      idCardFront,
      idCardBack,
      selfie
    )

    // 使用Promise.race来实现超时控制
    const result = await Promise.race([verifyPromise, timeoutPromise])

    console.log('百度AI KYC验证完成:', {
      status: result.status,
      riskScore: result.riskScore,
      similarity: result.verificationDetails.similarity
    })

    // 存储验证结果
    if (typeof global !== 'undefined') {
      (global as any).baiduKYCResults = (global as any).baiduKYCResults || new Map()
      ;(global as any).baiduKYCResults.set(sessionId, result)
    }

    return NextResponse.json({
      success: true,
      result: {
        status: result.status,
        userData: {
          // 保持原有字段用于显示
          name: `${result.userData.firstName}${result.userData.lastName}`,
          idNumber: result.userData.idNumber,
          age: new Date().getFullYear() - new Date(result.userData.dateOfBirth).getFullYear(),
          
          // 🆕 添加VC创建所需的完整字段
          firstName: result.userData.firstName,
          lastName: result.userData.lastName,
          dateOfBirth: result.userData.dateOfBirth,
          nationality: result.userData.nationality,
          gender: result.userData.gender,
          address: result.userData.address
        },
        verificationDetails: result.verificationDetails,
        riskScore: result.riskScore,
        
        // 🆕 添加原始KYC数据用于VC创建
        rawKYCData: {
          dateOfBirth: result.userData.dateOfBirth,
          nationality: result.userData.nationality || 'CN',
          name: `${result.userData.firstName}${result.userData.lastName}`,
          idNumber: result.userData.idNumber,
          gender: result.userData.gender,
          address: result.userData.address
        }
      },
      message: result.status === 'approved' ? '身份认证成功' : '身份认证失败'
    })

  } catch (error) {
    console.error('百度AI KYC验证失败:', error)
    
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    
    // 不使用降级方案，直接返回错误
    // 让用户看到真实的错误信息并重试
    return NextResponse.json(
      {
        success: false,
        error: '验证失败',
        details: errorMessage,
        code: errorMessage.includes('qps request limit') ? 'RATE_LIMIT' : 'API_ERROR',
        suggestion: errorMessage.includes('qps request limit') 
          ? '请求频率过高，请等待1秒后重试'
          : '请检查图片质量或稍后重试'
      },
      { status: 500 }
    )
  }
}

// GET方法 - 获取验证结果
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少会话ID' },
        { status: 400 }
      )
    }

    const results = (global as any).baiduKYCResults as Map<string, any>
    const result = results?.get(sessionId)

    if (!result) {
      return NextResponse.json(
        { error: '未找到验证结果' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      result
    })

  } catch (error) {
    console.error('获取验证结果失败:', error)
    return NextResponse.json(
      { error: '获取结果失败' },
      { status: 500 }
    )
  }
}







































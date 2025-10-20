import { NextRequest, NextResponse } from "next/server"
import { kycProviderFactory } from "@/lib/services/kyc/kyc-provider-factory"
import { KYCUserData, KYCVerificationRequest } from "@/lib/services/kyc/base-kyc-provider"

// 存储会话信息
const activeSessions = new Map<string, {
  address: string
  sessionId: string
  provider: string
  createdAt: number
  returnUrl: string
  status: 'initiated' | 'in_progress' | 'completed' | 'failed'
}>()

export async function POST(request: NextRequest) {
  try {
    const { provider, userData } = await request.json()

    if (!userData || !userData.address) {
      return NextResponse.json(
        { error: "缺少用户数据" },
        { status: 400 }
      )
    }

    const walletAddress = userData.address

    // 构建KYC用户数据
    const kycUserData: KYCUserData = {
      firstName: userData.firstName || 'User',
      lastName: userData.lastName || 'Test',
      email: userData.email || `${walletAddress}@example.com`,
      dateOfBirth: userData.dateOfBirth || '',
      nationality: userData.country || 'US'
    }

    // 使用指定的提供商或默认使用stripe
    const selectedProvider = provider || 'stripe'
    
    console.log(`使用KYC提供商: ${selectedProvider}`)

    // 获取提供商实例
    const kycProvider = kycProviderFactory.getProvider(selectedProvider)

    // 创建验证会话
    const session = await kycProvider.createVerificationSession(kycUserData)

    // 生成会话ID
    const sessionId = session.sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // 存储会话信息
    activeSessions.set(sessionId, {
      address: walletAddress.toLowerCase(),
      sessionId,
      provider: selectedProvider,
      createdAt: Date.now(),
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verification`,
      status: 'initiated'
    })

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        redirectUrl: session.redirectUrl,
        status: session.status,
        expiresAt: session.expiresAt
      },
      provider: selectedProvider
    })

  } catch (error) {
    console.error("启动KYC验证错误:", error)
    return NextResponse.json(
      { 
        error: "启动KYC验证失败",
        details: error instanceof Error ? error.message : "未知错误"
      },
      { status: 500 }
    )
  }
}


// 获取会话状态
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) {
      return NextResponse.json(
        { error: "会话ID是必需的" },
        { status: 400 }
      )
    }

    const session = activeSessions.get(sessionId)
    
    if (!session) {
      return NextResponse.json(
        { error: "会话不存在" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      session: {
        sessionId: session.sessionId,
        status: session.status,
        provider: session.provider,
        createdAt: session.createdAt
      }
    })

  } catch (error) {
    console.error("获取会话状态错误:", error)
    return NextResponse.json(
      { error: "获取会话状态失败" },
      { status: 500 }
    )
  }
}






























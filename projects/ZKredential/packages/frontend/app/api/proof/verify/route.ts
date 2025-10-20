// API route for proof verification using ZK Proof Server

import { type NextRequest, NextResponse } from "next/server"

// ZK 证明服务器配置
const ZK_PROOF_SERVER_URL = process.env.ZK_PROOF_SERVER_URL || 'http://localhost:8080'

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    console.log('📥 [API] 收到证明验证请求')
    
    const { proof, publicSignals, platform = 'propertyfy' } = await request.json()
    
    console.log(`🎯 [API] 目标平台: ${platform}`)

    // 1. 验证输入
    if (!proof || !publicSignals) {
      console.error('❌ [API] 缺少必需参数')
      return NextResponse.json(
        {
          success: false,
          error: "缺少 proof 或 publicSignals 参数",
        },
        { status: 400 }
      )
    }

    // 2. 验证证明结构
    if (!proof.pi_a || !proof.pi_b || !proof.pi_c || proof.protocol !== "groth16") {
      console.error('❌ [API] 无效的证明结构')
      return NextResponse.json(
        {
          success: false,
          error: "无效的 Groth16 证明结构",
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(publicSignals) || publicSignals.length === 0) {
      console.error('❌ [API] 无效的公开信号')
      return NextResponse.json(
        {
          success: false,
          error: "无效的公开信号数组",
        },
        { status: 400 }
      )
    }

    console.log('✅ [API] 输入验证通过')
    console.log(`📊 [API] 公开信号数量: ${publicSignals.length}`)

    // 3. 调用 ZK 证明服务器进行验证
    console.log(`🔗 [API] 连接到 ZK 服务器: ${ZK_PROOF_SERVER_URL}/verify-proof`)
    console.log(`📊 [API] 公共信号数量: ${publicSignals.length}, 平台: ${platform}`)
    
    const zkServerResponse = await fetch(`${ZK_PROOF_SERVER_URL}/verify-proof`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proof: proof,
        publicSignals: publicSignals,
        platform: platform  // ← 传递平台参数
      }),
      // 设置超时为 30 秒
      signal: AbortSignal.timeout(30000)
    })

    if (!zkServerResponse.ok) {
      const errorText = await zkServerResponse.text()
      console.error(`❌ [API] ZK 服务器返回错误: ${zkServerResponse.status}`)
      console.error(`错误详情: ${errorText}`)
      
      return NextResponse.json(
        {
          success: false,
          error: `ZK 服务器错误 (${zkServerResponse.status})`,
          details: errorText
        },
        { status: 502 }
      )
    }

    const zkResult = await zkServerResponse.json()
    const elapsed = Date.now() - startTime

    console.log('📊 [API] ZK 服务器响应:', zkResult)
    console.log(`⏱️ [API] 验证耗时: ${elapsed}ms`)

    // 4. 返回验证结果
    if (zkResult.success && zkResult.verified) {
      console.log('✅ [API] ZK 证明验证通过')
      return NextResponse.json({
        success: true,
        verified: true,
        timestamp: Date.now(),
        elapsedMs: elapsed
      })
    } else {
      console.warn('⚠️ [API] ZK 证明验证失败')
      return NextResponse.json({
        success: true,
        verified: false,
        error: "证明验证未通过",
        timestamp: Date.now(),
        elapsedMs: elapsed
      })
    }

  } catch (error: any) {
    const elapsed = Date.now() - startTime
    console.error('❌ [API] 验证过程出错:', error)
    
    // 检查是否是超时错误
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return NextResponse.json(
        {
          success: false,
          error: "验证超时，请稍后重试",
          details: "ZK 证明服务器响应超时"
        },
        { status: 504 }
      )
    }

    // 检查是否是网络错误
    if (error.code === 'ECONNREFUSED' || error.message.includes('fetch failed')) {
      return NextResponse.json(
        {
          success: false,
          error: "无法连接到 ZK 证明服务器",
          details: "请确保 ZK 证明服务器正在运行 (http://localhost:8080)",
          hint: "运行命令: cd zk-proof-server && npm start"
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: "验证失败",
        details: error.message,
        elapsedMs: elapsed
      },
      { status: 500 }
    )
  }
}

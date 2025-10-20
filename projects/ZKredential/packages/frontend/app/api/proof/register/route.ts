import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 验证链上注册参数...')
    
    const body = await request.json()
    const { address, proof, commitment } = body

    // 验证必需参数
    if (!address || !proof || !commitment) {
      return NextResponse.json({
        success: false,
        error: '缺少必需参数: address, proof, commitment'
      }, { status: 400 })
    }

    console.log('📝 注册参数验证通过:', {
      address,
      commitment: commitment.substring(0, 20) + '...',
      proofKeys: Object.keys(proof)
    })

    // 这个API现在只做参数验证
    // 实际的链上注册在前端通过用户钱包完成
    
    return NextResponse.json({
      success: true,
      message: '参数验证通过，请在前端完成链上注册',
      validated: true
    })

  } catch (error: any) {
    console.error('❌ 参数验证失败:', error)
    
    return NextResponse.json({
      success: false,
      error: error.message || '参数验证失败',
      details: error.toString()
    }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'

// 模拟数据库存储
const alertsDB: any[] = []

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, priority, data } = body

    // 验证请求
    if (!type || !priority || !data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 创建警报记录
    const alert = {
      id: Date.now().toString(),
      type,
      priority,
      data,
      timestamp: new Date(),
      status: 'pending'
    }

    // 存储警报（在实际应用中应该使用数据库）
    alertsDB.push(alert)

    // 这里可以添加推送逻辑（WebSocket、邮件、短信等）
    console.log('New alert received:', alert)

    return NextResponse.json({ 
      success: true, 
      alertId: alert.id,
      message: 'Alert processed successfully'
    })

  } catch (error) {
    console.error('Error processing alert:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'pending'
  
  // 过滤警报
  const filteredAlerts = alertsDB.filter(alert => alert.status === status)
  
  return NextResponse.json({
    alerts: filteredAlerts,
    total: filteredAlerts.length
  })
}
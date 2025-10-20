import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    // Print to server terminal for debugging
    console.error('[ClientError]', JSON.stringify(body ?? {}, null, 2))
    // 额外打印关键信息到终端
    if (body?.source === 'ui:handleStart:precheck') {
      console.log('=== UI PRECHECK ===')
      console.log('connected:', body.extra?.connected)
      console.log('hasWallet:', body.extra?.hasWallet)
      console.log('publicKey:', body.extra?.publicKey)
      console.log('envProgramId:', body.extra?.envProgramId)
      console.log('idlAddress:', body.extra?.idlAddress)
      console.log('==================')
    }
    if (body?.source?.includes('useStartSession')) {
      console.log('=== HOOK PRECHECK ===')
      console.log('hasProgram:', body.extra?.hasProgram)
      console.log('hasPublicKey:', body.extra?.hasPublicKey)
      console.log('hasWallet:', body.extra?.hasWallet)
      console.log('====================')
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[ClientError/RouteFailed]', e?.message || e)
    return NextResponse.json({ ok: false, error: e?.message || 'unknown' }, { status: 500 })
  }
}



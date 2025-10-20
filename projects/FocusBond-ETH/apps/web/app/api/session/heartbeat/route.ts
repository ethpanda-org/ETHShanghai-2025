import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory store for demo purposes
// In production, use a database like Redis
const sessionStore = new Map<string, { nonce: number; lastHeartbeat: number }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { walletAddress, nonce, sessionId } = body

    // Validate required fields
    if (!walletAddress || typeof nonce !== 'number' || !sessionId) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, nonce, sessionId' },
        { status: 400 }
      )
    }

    // Validate wallet address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return NextResponse.json(
        { error: 'Invalid wallet address format' },
        { status: 400 }
      )
    }

    // Get or create session data
    const sessionKey = `${walletAddress}:${sessionId}`
    const currentSession = sessionStore.get(sessionKey)
    const currentTime = Date.now()

    // Validate nonce (should be incrementing)
    if (currentSession) {
      if (nonce <= currentSession.nonce) {
        return NextResponse.json(
          { error: 'Invalid nonce - must be greater than previous nonce' },
          { status: 400 }
        )
      }
    }

    // Update session with new heartbeat
    sessionStore.set(sessionKey, {
      nonce,
      lastHeartbeat: currentTime
    })

    // Clean up old sessions (older than 24 hours)
    const twentyFourHoursAgo = currentTime - (24 * 60 * 60 * 1000)
    for (const [key, session] of sessionStore.entries()) {
      if (session.lastHeartbeat < twentyFourHoursAgo) {
        sessionStore.delete(key)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Heartbeat recorded successfully',
      timestamp: currentTime,
      nextNonce: nonce + 1
    })

  } catch (error) {
    console.error('Heartbeat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const walletAddress = searchParams.get('walletAddress')
  const sessionId = searchParams.get('sessionId')

  if (!walletAddress || !sessionId) {
    return NextResponse.json(
      { error: 'Missing walletAddress or sessionId query parameters' },
      { status: 400 }
    )
  }

  const sessionKey = `${walletAddress}:${sessionId}`
  const session = sessionStore.get(sessionKey)

  if (!session) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  return NextResponse.json({
    walletAddress,
    sessionId,
    nonce: session.nonce,
    lastHeartbeat: session.lastHeartbeat,
    isActive: Date.now() - session.lastHeartbeat < 60000 // Active if last heartbeat was within 1 minute
  })
}
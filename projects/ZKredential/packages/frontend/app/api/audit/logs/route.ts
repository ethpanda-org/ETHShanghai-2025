// API route for audit logs

import { type NextRequest, NextResponse } from "next/server"
import { AuditService } from "@/lib/services/audit-service"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const walletAddress = searchParams.get("walletAddress") || undefined
    const eventType = searchParams.get("eventType") || undefined
    const limit = Number.parseInt(searchParams.get("limit") || "100")

    const service = new AuditService()
    const logs = await service.getLogs(walletAddress, eventType, limit)

    return NextResponse.json({
      success: true,
      logs,
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch logs",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { eventType, walletAddress, data } = await request.json()

    const service = new AuditService()
    await service.logEvent(eventType, walletAddress, data)

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to log event",
      },
      { status: 500 },
    )
  }
}

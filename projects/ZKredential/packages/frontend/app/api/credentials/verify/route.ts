// API route for credential verification

import { type NextRequest, NextResponse } from "next/server"
import { CredentialService } from "@/lib/services/credential-service"
import type { Credential } from "@/lib/types/credential"

export async function POST(request: NextRequest) {
  try {
    const credential: Credential = await request.json()

    const service = new CredentialService()
    const isValid = await service.verifyCredential(credential)

    if (isValid) {
      const attributes = service.extractAttributes(credential)

      return NextResponse.json({
        success: true,
        isValid: true,
        attributes,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          isValid: false,
          error: "Credential verification failed",
        },
        { status: 400 },
      )
    }
  } catch (error) {
    console.error("[v0] API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

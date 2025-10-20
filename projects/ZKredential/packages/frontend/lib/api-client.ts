// API client for backend services

export class ApiClient {
  private baseUrl: string

  constructor(baseUrl = "") {
    this.baseUrl = baseUrl
  }

  // Verify credential
  async verifyCredential(credential: any) {
    const response = await fetch(`${this.baseUrl}/api/credentials/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credential),
    })

    if (!response.ok) {
      throw new Error("Credential verification failed")
    }

    return response.json()
  }

  // Generate proof
  async generateProof(request: any) {
    const response = await fetch(`${this.baseUrl}/api/proof/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      throw new Error("Proof generation failed")
    }

    return response.json()
  }

  // Verify proof
  async verifyProof(proof: any, walletAddress: string) {
    const response = await fetch(`${this.baseUrl}/api/proof/verify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ proof, walletAddress }),
    })

    if (!response.ok) {
      throw new Error("Proof verification failed")
    }

    return response.json()
  }

  // Get audit logs
  async getAuditLogs(params?: { walletAddress?: string; eventType?: string; limit?: number }) {
    const searchParams = new URLSearchParams()
    if (params?.walletAddress) searchParams.set("walletAddress", params.walletAddress)
    if (params?.eventType) searchParams.set("eventType", params.eventType)
    if (params?.limit) searchParams.set("limit", params.limit.toString())

    const response = await fetch(`${this.baseUrl}/api/audit/logs?${searchParams.toString()}`)

    if (!response.ok) {
      throw new Error("Failed to fetch audit logs")
    }

    return response.json()
  }

  // Log audit event
  async logAuditEvent(eventType: string, walletAddress: string, data: any) {
    const response = await fetch(`${this.baseUrl}/api/audit/logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ eventType, walletAddress, data }),
    })

    if (!response.ok) {
      throw new Error("Failed to log audit event")
    }

    return response.json()
  }
}

// Export singleton instance
export const apiClient = new ApiClient()

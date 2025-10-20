// Credential types and interfaces

// W3C Verifiable Credential standard format
export interface W3CVerifiableCredential {
  "@context": string[]
  id: string
  type: string[]
  issuer: {
    id: string
    name?: string
  }
  issuanceDate: string
  expirationDate?: string
  credentialSubject: {
    id: string // DID of the subject
    dateOfBirth?: string
    nationality?: string
    kycLevel?: 'basic' | 'advanced' | 'premium'
    accreditedInvestor?: boolean
    netWorth?: number
    idNumber?: string // 加密存储
    fullName?: string // 加密存储
    [key: string]: any
  }
  proof: {
    type: string
    created: string
    proofPurpose: string
    verificationMethod: string
    proofValue: string
  }
}

// 兼容旧格式的Credential接口
export interface Credential {
  id: string
  provider: "zkPass" | "PolygonID" | "LitProtocol" | "CentralizedKYC" | "BaiduAI"
  publicData: {
    age: number
    nationality: string
    idType?: string
    verified: boolean
    accreditedInvestor?: boolean
    netWorth?: number
  }
  privateData?: {
    // Encrypted data, not exposed
    [key: string]: any
  }
  signature: string
  issuer: string
  issuedAt: number
  expiresAt: number
}

export interface CredentialMetadata {
  walletAddress: string
  credentialId: string
  provider: string
  issuedAt: number
  expiresAt: number
  status: "active" | "expired" | "revoked"
}

export interface Attributes {
  age?: number
  nationality?: string
  accreditedInvestor?: boolean
  netWorth?: number
}

export interface ProofRequest {
  credential: Credential
  selectedAttributes: string[]
  walletAddress: string
}

export interface ZKProof {
  proof: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
    curve: string
  }
  publicSignals: any[]
  commitment: string
  timestamp: number
}

export interface VerificationResult {
  isValid: boolean
  walletAddress: string
  commitment: string
  txHash?: string
  blockNumber?: number
  timestamp: number
}

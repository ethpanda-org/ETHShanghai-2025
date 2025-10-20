export enum UserVerificationStatus {
  NOT_CONNECTED = 'not_connected',
  NOT_VERIFIED = 'not_verified',
  VERIFIED_VALID = 'verified_valid',
  VERIFIED_EXPIRED = 'verified_expired',
  VERIFIED_REVOKED = 'verified_revoked',
  PARTIAL_COMPLETE = 'partial_complete'
}

export interface IdentityInfo {
  commitment: string;
  nullifierHash: string;
  provider: string;
  timestamp: number;
  expiresAt: number;
  isActive: boolean;
  isRevoked: boolean;
}

export interface VCInfo {
  hasVC: boolean;
  isValid: boolean;
  isExpired: boolean;
  createdAt?: number;
  lastUsed?: number;
  usageCount?: number;
  expiresAt?: number;
  vcId?: string;
  provider?: string;
  timestamp?: number;
}

export interface VerificationStatusResult {
  status: UserVerificationStatus;
  message: string;
  identityInfo?: IdentityInfo;
  vcInfo?: VCInfo;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number;
  hoursUntilExpiry?: number;
  expiredDays?: number;
}

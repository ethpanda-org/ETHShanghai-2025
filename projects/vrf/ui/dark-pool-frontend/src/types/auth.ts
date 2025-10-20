/**
 * Authentication types
 */

export interface AuthInitRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface AuthInitResponse {
  anonymousId: string;
  sessionToken: string;
  expiresAt: string;
}

export interface WalletInfo {
  address: string;
  chainId: number;
  isConnected: boolean;
  provider: 'metamask' | 'walletconnect' | 'coinbase' | 'unknown';
}

export interface AnonymousIdentity {
  id: string;
  walletAddress: string;
  publicKey: string;
  createdAt: Date;
  lastActive: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  isConnecting: boolean;
  wallet: WalletInfo | null;
  identity: AnonymousIdentity | null;
  sessionToken: string | null;
  error: string | null;
}
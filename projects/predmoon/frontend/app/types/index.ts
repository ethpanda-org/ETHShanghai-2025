export interface ApiResponse<T = any> {
  readonly code: number;
  readonly msg: string;
  readonly data: T;
}

export interface PageResult<T> {
  readonly total: number;
  readonly list: T[];
}

export interface Token {
  userId: number;
  accessToken: string;
  refreshToken?: string;
  expiresTime?: number;
}

export interface UserInfo {
  id: string;
  proxyWallet: string;
  nickname?: string;
  email?: string;
  avatar?: string;
  inviteCode?: string;
  traderType: number;
  inviteCount: number;
}

export interface Web3Config {
  chain: {
    id: number
    rpcurls: string[]
    scanUrl: string
  }
  contract: {
    name: string
    version: number
    address: `0x${string}`
    decimal: number
  }
  main: {
    name: string
    version: number
    address: `0x${string}`
    decimal: number
  }
  meme: {
    name: string
    version: number
    address: `0x${string}`
    decimal: number
  }
}

export interface WebSocketMessage {
  type: string
  content: any
  time: Date
}

export interface SiweMessage {
  address: `0x${string}`
  chainId: number
  domain: string
  nonce: string
  uri: string
  version: '1'
  issuedAt: Date
  expirationTime: Date
  statement: string
}

declare module '@safe-global/safe-apps-sdk' {
  export interface SafeInfo {
    safeAddress: string;
    chainId: number;
    owners: string[];
    threshold: number;
    isReadOnly: boolean;
    network: string;
  }

  export interface SafeTransactionData {
    to: string;
    value: string;
    data: string;
    operation?: number;
  }

  export interface SafeAppsSDK {
    safe: {
      getInfo(): Promise<SafeInfo>;
      getEnvironmentInfo(): Promise<any>;
      calculateMessageHash(message: string): Promise<string>;
    };
    txs: {
      send(params: { txs: SafeTransactionData[] }): Promise<{ safeTxHash: string }>;
    };
  }

  export default class SafeAppsSDK {
    constructor(options?: {
      allowedDomains?: RegExp[];
      debug?: boolean;
    });
    
    safe: {
      getInfo(): Promise<SafeInfo>;
      getEnvironmentInfo(): Promise<any>;
      calculateMessageHash(message: string): Promise<string>;
    };
    
    txs: {
      send(params: { txs: SafeTransactionData[] }): Promise<{ safeTxHash: string }>;
    };
  }
}
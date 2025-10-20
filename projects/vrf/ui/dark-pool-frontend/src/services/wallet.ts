import { ethers } from 'ethers';
import { EncryptionUtils } from '../utils/index.js';

/**
 * Wallet service for interacting with blockchain
 */

export class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;

  async initialize() {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    this.provider = new ethers.BrowserProvider(window.ethereum);
    this.signer = await this.provider.getSigner();
  }

  async getAddress(): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.signer.getAddress();
  }

  async signMessage(message: string): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.signer.signMessage(message);
  }

  async signTypedData(domain: any, types: any, data: any): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }
    return await this.signer.signTypedData(domain, types, data);
  }

  async sendTransaction(transaction: {
    to: string;
    value?: string;
    data?: string;
    gasLimit?: string;
  }): Promise<ethers.TransactionResponse> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    const tx = await this.signer.sendTransaction(transaction);
    return tx;
  }

  async getBalance(address?: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    const addr = address || await this.getAddress();
    const balance = await this.provider.getBalance(addr);
    return ethers.formatEther(balance);
  }

  async getNetwork(): Promise<ethers.Network> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return await this.provider.getNetwork();
  }

  async switchChain(chainId: number): Promise<void> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Chain not added, need to add it
        throw new Error('Chain not added to wallet');
      }
      throw error;
    }
  }

  // Privacy-preserving methods
  async createAnonymousIdentity(): Promise<{
    anonymousId: string;
    publicKey: string;
    signature: string;
  }> {
    const address = await this.getAddress();
    const message = `Create anonymous identity for ${address}`;
    const signature = await this.signMessage(message);
    const publicKey = EncryptionUtils.generateSecureRandom(32);
    const anonymousId = EncryptionUtils.hash(address + signature + publicKey);

    return {
      anonymousId,
      publicKey,
      signature
    };
  }

  async encryptTransactionData(data: any): Promise<string> {
    const serialized = JSON.stringify(data);
    return EncryptionUtils.encrypt(serialized);
  }

  async parseTransactionLogs(logs: any[]): Promise<any[]> {
    // Parse logs with privacy considerations
    return logs.map(log => ({
      ...log,
      data: log.data ? '***' : undefined,
      topics: log.topics?.map((t: string) => t.slice(0, 10) + '...') || []
    }));
  }

  // Event listeners
  onAccountsChanged(callback: (accounts: string[]) => void) {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void) {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  onDisconnect(callback: () => void) {
    if (window.ethereum) {
      window.ethereum.on('disconnect', callback);
    }
  }

  // Cleanup
  disconnect() {
    this.provider = null;
    this.signer = null;
  }
}

export const walletService = new WalletService();
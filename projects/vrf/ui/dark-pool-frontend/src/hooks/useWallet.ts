import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { type WalletInfo } from '../types/auth.js';
import { NETWORKS } from '../config/networks.js';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const useWallet = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectWallet = useCallback(async (provider: 'metamask' | 'walletconnect' = 'metamask') => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!window.ethereum) {
        throw new Error('Wallet not installed');
      }

      const providerInstance = new ethers.BrowserProvider(window.ethereum);
      const accounts = await providerInstance.send('eth_requestAccounts', []);
      const network = await providerInstance.getNetwork();

      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const walletInfo: WalletInfo = {
        address: accounts[0],
        chainId: Number(network.chainId),
        isConnected: true,
        provider: provider
      };

      setWallet(walletInfo);

      // Listen for account changes
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet(null);
        } else {
          setWallet(prev => prev ? { ...prev, address: accounts[0] } : null);
        }
      });

      // Listen for chain changes
      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setError(null);
  }, []);

  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!wallet || !window.ethereum) {
      throw new Error('Wallet not connected');
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(message);
      return signature;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to sign message');
    }
  }, [wallet]);

  const switchChain = useCallback(async (chainId: number) => {
    if (!window.ethereum) {
      throw new Error('Wallet not connected');
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (err: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [NETWORKS.localhost],
          });
        } catch (addError: any) {
          setError(addError.message || 'Failed to add network');
        }
      } else {
        setError(err.message || 'Failed to switch chain');
      }
    }
  }, []);

  useEffect(() => {
    // Check if wallet is already connected on mount
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const accounts = await provider.send('eth_accounts', []);
          const network = await provider.getNetwork();

          if (accounts.length > 0) {
            setWallet({
              address: accounts[0],
              chainId: Number(network.chainId),
              isConnected: true,
              provider: 'metamask'
            });
          }
        } catch (err) {
          console.error('Failed to check wallet connection:', err);
        }
      }
    };

    checkConnection();
  }, []);

  return {
    wallet,
    isConnecting,
    error,
    connectWallet,
    disconnectWallet,
    signMessage,
    switchChain
  };
};
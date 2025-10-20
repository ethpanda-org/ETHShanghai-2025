import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export function useWeb3() {
  const [account, setAccount] = useState(null);
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const SEPOLIA_CHAIN_ID = 11155111;

  // 检查是否安装了 MetaMask
  const isMetaMaskInstalled = typeof window !== 'undefined' && window.ethereum;

  // 连接钱包
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      setError('请先安装 MetaMask');
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const network = await provider.getNetwork();

      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setChainId(Number(network.chainId));
    } catch (err) {
      console.error('连接钱包失败:', err);
      setError(err.message);
    } finally {
      setIsConnecting(false);
    }
  }, [isMetaMaskInstalled]);

  // 断开连接
  const disconnect = useCallback(() => {
    setAccount(null);
    setProvider(null);
    setSigner(null);
    setChainId(null);
  }, []);

  // 切换到 Sepolia 网络
  const switchToSepolia = useCallback(async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chainId in hex
      });
    } catch (err) {
      // 如果网络不存在,添加网络
      if (err.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: '0xaa36a7',
                chainName: 'Sepolia Test Network',
                nativeCurrency: {
                  name: 'Sepolia ETH',
                  symbol: 'ETH',
                  decimals: 18,
                },
                rpcUrls: ['https://sepolia.infura.io/v3/'],
                blockExplorerUrls: ['https://sepolia.etherscan.io'],
              },
            ],
          });
        } catch (addError) {
          console.error('添加网络失败:', addError);
          setError(addError.message);
        }
      } else {
        console.error('切换网络失败:', err);
        setError(err.message);
      }
    }
  }, []);

  // 监听账户变化
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAccount(accounts[0]);
      }
    };

    const handleChainChanged = (chainId) => {
      setChainId(Number(chainId));
      // 刷新页面以确保状态同步
      window.location.reload();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [disconnect]);

  // 自动连接(如果之前已连接)
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const checkConnection = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        
        if (accounts.length > 0) {
          const signer = await provider.getSigner();
          const network = await provider.getNetwork();
          
          setProvider(provider);
          setSigner(signer);
          setAccount(accounts[0]);
          setChainId(Number(network.chainId));
        }
      } catch (err) {
        console.error('检查连接状态失败:', err);
      }
    };

    checkConnection();
  }, [isMetaMaskInstalled]);

  return {
    account,
    provider,
    signer,
    chainId,
    isConnected: !!account,
    isConnecting,
    error,
    isMetaMaskInstalled,
    isSepolia: chainId === SEPOLIA_CHAIN_ID,
    connect,
    disconnect,
    switchToSepolia,
  };
}


import { useEffect, useCallback } from 'react';
import { useWeb3Store } from '../stores/web3Store';

export const useWeb3 = () => {
  const {
    isConnected,
    isConnecting,
    account,
    balance,
    network,
    chainId,
    provider,
    signer,
    connect,
    disconnect,
    getBalance,
    getNetworkName,
    switchNetwork,
    addNetwork,
  } = useWeb3Store();

  // 检查钱包连接状态
  const checkConnection = useCallback(async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0 && !isConnected) {
          await connect();
        }
      } catch (error) {
        console.error('检查连接状态失败:', error);
      }
    }
  }, [isConnected, connect]);

  // 刷新余额
  const refreshBalance = async () => {
    if (isConnected && account) {
      await getBalance();
    }
  };

  // 刷新网络信息
  const refreshNetwork = async () => {
    if (provider) {
      try {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const networkName = getNetworkName(chainId);
        useWeb3Store.setState({ network: networkName, chainId });
      } catch (error) {
        console.error('刷新网络信息失败:', error);
      }
    }
  };

  // 格式化地址显示
  const formatAddress = (address: string | null) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  // 格式化余额显示
  const formatBalance = (balance: string | null) => {
    if (!balance) return '0.0000';
    return parseFloat(balance).toFixed(4);
  };

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);

  return {
    // 状态
    isConnected,
    isConnecting,
    account,
    balance,
    network,
    chainId,
    provider,
    signer,
    
    // 方法
    connectWallet: connect,
    disconnectWallet: disconnect,
    getBalance,
    refreshBalance,
    refreshNetwork,
    switchNetwork,
    addNetwork,
    
    // 工具方法
    formatAddress,
    formatBalance,
    checkConnection,
  };
};
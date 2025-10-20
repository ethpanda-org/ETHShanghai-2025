import { create } from 'zustand';
import { ethers } from 'ethers';

interface Web3State {
  isConnected: boolean;
  isConnecting: boolean;
  account: string | null;
  balance: string | null;
  network: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getBalance: () => Promise<void>;
  getNetworkName: (chainId: number) => string;
  handleAccountsChanged: (accounts: string[]) => void;
  handleChainChanged: (chainId: string) => void;
  switchNetwork: (chainId: number) => Promise<void>;
  addNetwork: (networkConfig: any) => Promise<void>;
}

export const useWeb3Store = create<Web3State>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  account: null,
  balance: null,
  network: null,
  chainId: null,
  provider: null,
  signer: null,

  connect: async () => {
    try {
      set({ isConnecting: true });
      
      if (typeof window.ethereum !== 'undefined') {
        // 创建 ethers provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // 请求连接钱包
        await provider.send('eth_requestAccounts', []);
        
        // 获取 signer
        const signer = await provider.getSigner();
        const account = await signer.getAddress();
        
        // 获取网络信息
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);
        const networkName = get().getNetworkName(chainId);

        set({
          isConnected: true,
          isConnecting: false,
          account,
          network: networkName,
          chainId,
          provider,
          signer,
        });

        // 获取余额
        await get().getBalance();

        // 获取当前状态以确保使用相同的函数引用
        const state = get();
        
        // 监听账户和网络变化
        window.ethereum.on('accountsChanged', state.handleAccountsChanged);
        window.ethereum.on('chainChanged', state.handleChainChanged);
      } else {
        throw new Error('请安装 MetaMask 钱包');
      }
    } catch (error) {
      console.error('连接钱包失败:', error);
      set({ isConnecting: false });
      throw error;
    }
  },

  disconnect: async () => {
    try {
      const state = get();
      
      console.log('开始断开连接流程...');
      
      // 设置断开连接状态
      set({ isConnecting: true });
      
      // 移除事件监听器 - 使用相同的函数引用
      if (window.ethereum) {
        console.log('移除事件监听器...');
        window.ethereum.removeListener('accountsChanged', state.handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', state.handleChainChanged);
      }

      // 尝试通知钱包断开连接
      if (window.ethereum) {
        console.log('尝试通知钱包断开连接...');
        
        // 对于 MetaMask，我们需要清除权限
        if (window.ethereum.isMetaMask) {
          try {
            // 请求清除权限（这会让用户需要重新授权）
            await window.ethereum.request({
              method: 'wallet_revokePermissions',
              params: [{ eth_accounts: {} }]
            });
            console.log('MetaMask 权限已撤销');
          } catch (revokeError) {
            console.log('撤销权限失败或不支持:', revokeError);
            // 如果撤销权限失败，尝试其他方法
          }
        }
        
        // 通用的断开连接方法
        if (window.ethereum.disconnect) {
          await window.ethereum.disconnect();
          console.log('钱包 disconnect 方法调用成功');
        }
      }

      // 清理本地状态
      console.log('清理本地状态...');
      set({
        isConnected: false,
        isConnecting: false,
        account: null,
        balance: null,
        network: null,
        chainId: null,
        provider: null,
        signer: null,
      });

      // 清理本地存储
      localStorage.removeItem('walletconnect');
      localStorage.removeItem('WALLETCONNECT_DEEPLINK_CHOICE');
      
      console.log('钱包已成功断开连接');
    } catch (error) {
      console.error('断开连接时出错:', error);
      // 即使出错也要清理状态
      set({
        isConnected: false,
        isConnecting: false,
        account: null,
        balance: null,
        network: null,
        chainId: null,
        provider: null,
        signer: null,
      });
      throw error; // 重新抛出错误以便上层处理
    }
  },

  getBalance: async () => {
    try {
      const { account, provider } = get();
      if (account && provider) {
        const balance = await provider.getBalance(account);
        const balanceInEth = ethers.formatEther(balance);
        set({ balance: parseFloat(balanceInEth).toFixed(4) });
      }
    } catch (error) {
      console.error('获取余额失败:', error);
    }
  },

  getNetworkName: (chainId: number) => {
    const networks: { [key: number]: string } = {
      1: 'Ethereum Mainnet',
      3: 'Ropsten Testnet',
      4: 'Rinkeby Testnet',
      5: 'Goerli Testnet',
      42: 'Kovan Testnet',
      56: 'BSC Mainnet',
      97: 'BSC Testnet',
      137: 'Polygon Mainnet',
      80001: 'Polygon Mumbai',
      11155111: 'Sepolia Testnet',
      17000: 'Holesky Testnet',
      31337: 'Localhost',
      1337: 'Ganache',
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
  },

  handleAccountsChanged: async (accounts: string[]) => {
    if (accounts.length === 0) {
      // 用户在钱包中断开了连接
      await get().disconnect();
    } else {
      // 用户切换了账户
      const currentAccount = get().account;
      if (currentAccount && accounts[0] !== currentAccount) {
        // 重新连接新账户
        try {
          await get().connect();
        } catch (error) {
          console.error('切换账户失败:', error);
          await get().disconnect();
        }
      }
    }
  },

  handleChainChanged: async (chainId: string) => {
    console.warn('Chain changed to:', chainId);
    const { provider } = get();
    if (provider) {
      try {
        const network = await provider.getNetwork();
        const newChainId = Number(network.chainId);
        const networkName = get().getNetworkName(newChainId);
        set({ network: networkName, chainId: newChainId });
        await get().getBalance();
      } catch (error) {
        console.error('处理网络变化失败:', error);
      }
    }
  },

  switchNetwork: async (targetChainId: number) => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      }
    } catch (error: any) {
      // 如果网络不存在，尝试添加网络
      if (error.code === 4902) {
        throw new Error('网络不存在，请手动添加网络');
      }
      throw error;
    }
  },

  addNetwork: async (networkConfig: any) => {
    try {
      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [networkConfig],
        });
      }
    } catch (error) {
      console.error('添加网络失败:', error);
      throw error;
    }
  },
}));
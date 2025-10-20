'use client';
import { http, createConfig } from 'wagmi';
import { sepolia, mainnet, type Chain } from 'viem/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';
import { defineChain } from 'viem';

// 本地开发链配置
const localhost = defineChain({
  id: 1337,
  name: 'Localhost',
  network: 'localhost',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:8545'],
    },
    public: {
      http: ['http://127.0.0.1:8545'],
    },
  },
  blockExplorers: {
    default: { name: 'Local', url: 'http://localhost:8545' },
  },
});

const isLocalDev = (
  process.env.NODE_ENV === 'development' && (
    process.env.NEXT_PUBLIC_USE_LOCAL === 'true' || 
    (typeof window !== 'undefined' && window.location.hostname === 'localhost') ||
    (typeof window !== 'undefined' && window.location.hostname === '127.0.0.1')
  )
) || (typeof window !== 'undefined' && window.location.hostname === 'localhost');

const chainId = isLocalDev ? 1337 : Number(process.env.NEXT_PUBLIC_CHAIN_ID || 11155111);
const rpcUrl = isLocalDev ? 'http://127.0.0.1:8545' : (process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.sepolia.org');

// 检查WalletConnect项目ID
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  console.warn('⚠️ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID 未设置，WalletConnect功能可能无法正常工作');
  console.warn('请访问 https://cloud.walletconnect.com/ 获取项目ID');
}

// 定义链配置 - 确保类型正确
const chains: readonly [Chain, ...Chain[]] = isLocalDev 
  ? [localhost, sepolia, mainnet] 
  : [sepolia, mainnet];

// 构建连接器数组 - 只在客户端添加 WalletConnect
const getConnectors = () => {
  const baseConnectors = [
    injected(),
    metaMask(),
  ];
  
  // 只在客户端环境且有有效的 projectId 时添加 WalletConnect
  if (typeof window !== 'undefined' && walletConnectProjectId && walletConnectProjectId !== 'your_walletconnect_project_id_here') {
    baseConnectors.push(
      // @ts-ignore - WalletConnect 连接器类型暂时不兼容 wagmi v2，但运行时正常
      walletConnect({
        projectId: walletConnectProjectId,
        showQrModal: true,
      })
    );
  } else if (typeof window !== 'undefined') {
    console.warn('WalletConnect连接器未启用，请配置有效的项目ID');
  }
  
  return baseConnectors;
};

const connectors = getConnectors();

export const wagmiConfig = createConfig({
  chains,
  connectors,
  transports: {
    [localhost.id]: http(rpcUrl),
    [sepolia.id]: http(rpcUrl),
    [mainnet.id]: http(),
  },
  ssr: true,
});

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { optimismSepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'AetherPay',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID',
  chains: [optimismSepolia],
  ssr: true,
});
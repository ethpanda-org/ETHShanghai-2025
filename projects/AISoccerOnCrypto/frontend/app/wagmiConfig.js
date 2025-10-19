import { sepolia } from '@wagmi/core/chains';
import { injected } from '@wagmi/connectors';
import { http, createConfig } from '@wagmi/core';
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'SS',
  projectId: 'YOUR_PROJECT_ID',
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
})
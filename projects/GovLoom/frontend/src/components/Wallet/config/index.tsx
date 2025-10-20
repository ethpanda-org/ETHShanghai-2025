import { defaultWagmiConfig } from '@web3modal/wagmi/react/config'

import { cookieStorage, createStorage } from 'wagmi'
import { mainnet, sepolia, bscTestnet } from 'wagmi/chains'

// Get projectId from https://cloud.walletconnect.com
export const projectId = '49c5efff1afd555c3821e1f4f4ff7b60'

if (!projectId) throw new Error('Project ID is not defined')

const metadata = {
    name: 'Web3Modal',
    description: 'Web3Modal Example',
    url: 'https://web3modal.com', // origin must match your domain & subdomain
    icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Create wagmiConfig
const chains = [mainnet, sepolia, bscTestnet] as const
export const config = defaultWagmiConfig({
    chains,
    // transports: {
    //     [sepolia.id]: http()
    // },
    projectId,
    metadata,
    ssr: true,
    storage: createStorage({
        storage: cookieStorage
    }),
})

import { 
	ethereum, 
	sepolia, 
	polygon, 
	bsc, 
	bscTestnet, 
	optimism, 
	avalanche, 
	base, 
	arbitrum,
	linea, 
	zkSync, 
	scroll, 
	celo,
	coreMainnet,
	// mode,
	defineChain 
} from 'thirdweb/chains';
import type { Chain, ChainIdMapping } from '@/types';

const mode = defineChain({
	id: 34443,
	name: 'Mode',
	nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	rpc: 'https://mainnet.mode.network',
});

const ronin = defineChain({
	id: 2020,
	name: 'Ronin',
	nativeCurrency: { name: 'RON', symbol: 'RON', decimals: 18 },
	rpc: 'https://api.roninchain.com/rpc',
});

const mantle = defineChain({
	id: 5000,
	name: 'Mantle',
	nativeCurrency: { name: 'MNT', symbol: 'MNT', decimals: 18 },
	rpc: 'https://rpc.mantle.xyz',
});

const unichain = defineChain({
	id: 130,
	name: 'Unichain',
	nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	rpc: 'https://rpc.unichain.org',
});

const ink = defineChain({
	id: 57073,
	name: 'Ink',
	nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	rpc: 'https://rpc-gel.inkonchain.com',
});

const berachain = defineChain({
	id: 80094,
	name: 'Berachain',
	nativeCurrency: { name: 'BERA', symbol: 'BERA', decimals: 18 },
	rpc: 'https://rpc.berachain.com',
});

const worldChain = defineChain({
	id: 480,
	name: 'World Chain',
	nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	rpc: 'https://worldchain-mainnet.g.alchemy.com/public',
});

// Add the missing chains that were commented out
const hashKey = defineChain({
	id: 177,
	name: 'HashKey Chain HSK',
	nativeCurrency: { name: 'HSK', symbol: 'HSK', decimals: 18 },
	rpc: 'https://mainnet.hsk.xyz',
});

const exSat = defineChain({
	id: 7200,
	name: 'exSat Network',
	nativeCurrency: { name: 'exSat', symbol: 'XSAT', decimals: 18 },
	rpc: 'https://rpc-sg.exsat.network',
});

const merlin = defineChain({
	id: 4200,
	name: 'Merlin Mainnet',
	nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
	rpc: 'https://rpc.zklink.io',
});

const zkLink = defineChain({
	id: 810180,
	name: 'zkLink Nova',
	nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	rpc: 'https://rpc.zklink.io',
});

const aiLayer = defineChain({
	id: 2649,
	name: 'aiLayer',
	nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
	rpc: 'https://mainnet-rpc.ailayer.xyz',
});

const bsquare = defineChain({
	id: 223,
	name: 'B² Network',
	nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
	rpc: 'https://rpc.ankr.com/b2',
});

const goat = defineChain({
	id: 2345,
	name: 'GOAT Network',
	nativeCurrency: { name: 'Bitcoin', symbol: 'GOAT', decimals: 18 },
	rpc: 'https://rpc.ankr.com/goat_mainnet',
});

const hemi = defineChain({
	id: 43111,
	name: 'Hemi Network',
	nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
	rpc: 'https://rpc.hemi.network/rpc',
});

const plume = defineChain({
	id: 98866,
	name: 'Plume Network',
	nativeCurrency: { name: 'Plume', symbol: 'PLUME', decimals: 18 },
	rpc: 'https://rpc.plume.org',
});

const bitLayer = defineChain({
	id: 200901,
	name: 'Bitlayer',
	nativeCurrency: { name: 'Bitcoin', symbol: 'BTC', decimals: 18 },
	rpc: 'https://rpc.ankr.com/bitlayer',
});

// Map chain IDs to thirdweb chain objects
export const CHAIN_ID_TO_CHAIN: ChainIdMapping = {
	1: ethereum,
	10: optimism,
	56: bsc,
	97: bscTestnet,
	1116: coreMainnet,
	130: unichain,
	137: polygon,
	177: hashKey,
	223: bsquare,
	324: zkSync,
	480: worldChain,
	534352: scroll,
	2020: ronin,
	4200: merlin,
	5000: mantle,
	8453: base,
	2649: aiLayer,
	34443: mode,
	11155111: sepolia,
	42161: arbitrum,
	42220: celo,
	43111: hemi,
	43114: avalanche,
	2345: goat,
	57073: ink,
	59144: linea,
	7200: exSat,
	80094: berachain,
	98866: plume,
	200901: bitLayer,
	810180: zkLink,
} as const;

// Export the custom chains so they can be used in other components
export { 
	hashKey, 
	exSat, 
	merlin, 
	zkLink, 
	aiLayer, 
	bsquare, 
	goat, 
	hemi, 
	plume, 
	bitLayer,
	mode
};

/**
 * Get the thirdweb chain object for a given chain ID
 * @param chainId - The chain ID to look up
 * @returns The thirdweb chain object or undefined if not supported
 */
export function getChainObject(chainId: number) {
	return CHAIN_ID_TO_CHAIN[chainId as keyof typeof CHAIN_ID_TO_CHAIN];
}

/**
 * Utility functions for chain operations (non-hook functions)
 */
export class ChainUtils {
	/**
	 * Get chain information from local chains array by chain ID
	 * @param chains - Array of chains from store
	 * @param chainId - The chain ID to find
	 * @returns Chain | undefined
	 */
	static getChainFromLocal(chains: Chain[], chainId: number | string): Chain | undefined {
		const id = typeof chainId === 'string' ? parseInt(chainId) : chainId;
		return chains.find(chain => chain.chain_id === id);
	}

	/**
	 * Get chain name by chain ID from local chains
	 * @param chains - Array of chains from store
	 * @param chainId - The chain ID
	 * @returns string
	 */
	static getChainName(chains: Chain[], chainId: number | string): string {
		const chain = ChainUtils.getChainFromLocal(chains, chainId);
		return chain?.chain_name || chain?.display_name || 'Unsupport Chain';
	}

	/**
	 * Get chain logo URL by chain ID from local chains
	 * @param chains - Array of chains from store
	 * @param chainId - The chain ID
	 * @returns string
	 */
	static getChainLogo(chains: Chain[], chainId: number | string): string {
		const chain = ChainUtils.getChainFromLocal(chains, chainId);
		return chain?.logo_url || '';
	}

	/**
	 * Get native token symbol by chain ID from local chains
	 * @param chains - Array of chains from store
	 * @param chainId - The chain ID
	 * @returns string
	 */
	static getNativeToken(chains: Chain[], chainId: number | string): string {
		const chain = ChainUtils.getChainFromLocal(chains, chainId);
		return chain?.native_token || 'ETH';
	}

	/**
	 * Check if chain is testnet by chain ID from local chains
	 * @param chains - Array of chains from store
	 * @param chainId - The chain ID
	 * @returns boolean
	 */
	static isTestnet(chains: Chain[], chainId: number | string): boolean {
		const chain = ChainUtils.getChainFromLocal(chains, chainId);
		return chain?.is_testnet || false;
	}

	/**
	 * Format chain display name with testnet indicator
	 * @param chains - Array of chains from store
	 * @param chainId - The chain ID
	 * @returns string
	 */
	static getDisplayName(chains: Chain[], chainId: number | string): string {
		const chain = ChainUtils.getChainFromLocal(chains, chainId);
		if (!chain) return 'Unsupport Chain';

		const name = chain.display_name || chain.chain_name;
		return chain.is_testnet ? `${name} (Testnet)` : name;
	}
}

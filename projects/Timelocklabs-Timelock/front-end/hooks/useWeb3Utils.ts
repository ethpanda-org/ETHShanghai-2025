/**
 * Web3 utility hooks and patterns
 * Provides reusable Web3 utilities and helper functions
 */

'use client';

// React imports
import { useCallback, useEffect, useMemo, useRef } from 'react';

// External libraries
import { ethers } from 'ethers';

// Internal hooks
import { useAsyncOperation } from './useCommonHooks';
import { useAbortController } from './useHookUtils';
import { useWeb3React } from './useWeb3React';

// Type imports
import type { Address, GasEstimation, Hash, NetworkInfo, TokenBalance, TokenInfo } from '@/types';

/**
 * Configuration for Web3 utilities
 */
interface Web3UtilsConfig {
	/** Default timeout for Web3 calls in milliseconds */
	timeout?: number;
	/** Whether to cache results */
	enableCaching?: boolean;
	/** Whether to show toast notifications */
	showToasts?: boolean;
}

/**
 * Hook for Web3 utility functions with enhanced error handling and caching
 *
 * @param config Optional configuration for Web3 utilities
 * @returns Object containing Web3 utility methods
 */
export function useWeb3Utils(config: Web3UtilsConfig = {}) {
	const { timeout = 10000, enableCaching = true, showToasts = false } = config;
	const { provider, chainId, chainMetadata } = useWeb3React();
	const { createController, abort } = useAbortController();
	const cacheRef = useRef<Map<string, { data: unknown; timestamp: number }>>(new Map());

	const { execute } = useAsyncOperation({
		showToasts,
		errorMessage: 'Web3 operation failed',
	});

	/**
	 * Get cached result or execute function
	 */
	const withCache = useCallback(
		<T>(
			key: string,
			fn: () => Promise<T>,
			ttl = 60000 // 1 minute default TTL
		): Promise<T> => {
			if (!enableCaching) {
				return fn();
			}

			const cached = cacheRef.current.get(key) as { data: T; timestamp: number } | undefined;
			const now = Date.now();

			if (cached && now - cached.timestamp < ttl) {
				return Promise.resolve(cached.data);
			}

			return fn().then(result => {
				cacheRef.current.set(key, { data: result as unknown, timestamp: now });
				return result;
			});
		},
		[enableCaching]
	);

	/**
	 * Create timeout promise for Web3 calls
	 */
	const withTimeout = useCallback(
		<T>(promise: Promise<T>, timeoutMs = timeout): Promise<T> => {
			const timeoutPromise = new Promise<never>((_, reject) => {
				setTimeout(() => reject(new Error('Operation timeout')), timeoutMs);
			});

			return Promise.race([promise, timeoutPromise]);
		},
		[timeout]
	);

	/**
	 * Get network information
	 */
	const getNetworkInfo = useCallback(async (): Promise<NetworkInfo> => {
		return execute(async () => {
			if (!provider) {
				throw new Error('Provider not available');
			}

			return withCache('network-info', async () => {
				const network = (await withTimeout(provider.getNetwork())) as {
					chainId: number;
					name: string;
				};

				return {
					chainId: network.chainId,
					name: network.name,
					symbol: 'ETH', // Default to ETH, could be enhanced to detect native token
					decimals: 18, // Default to 18 decimals for ETH-compatible chains
					rpcUrl: provider.connection?.url || '', // Get RPC URL if available
					isTestnet: [1, 3, 4, 5, 42, 11155111].includes(network.chainId) === false,
				};
			});
		});
	}, [provider, execute, withCache, withTimeout]);

	/**
	 * Get ETH balance for an address
	 */
	const getEthBalance = useCallback(
		async (address: Address): Promise<string> => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				if (!ethers.utils.isAddress(address)) {
					throw new Error('Invalid address');
				}

				return withCache(
					`eth-balance-${address}`,
					async () => {
						const balance = (await withTimeout(provider.getBalance(address))) as ethers.BigNumber;
						return ethers.utils.formatEther(balance);
					},
					30000
				); // 30 second TTL for balance
			});
		},
		[provider, execute, withCache, withTimeout]
	);

	/**
	 * Get token balance for an address
	 */
	const getTokenBalance = useCallback(
		async (tokenAddress: Address, holderAddress: Address): Promise<TokenBalance> => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				if (!ethers.utils.isAddress(tokenAddress) || !ethers.utils.isAddress(holderAddress)) {
					throw new Error('Invalid address');
				}

				const cacheKey = `token-balance-${tokenAddress}-${holderAddress}`;

				return withCache(
					cacheKey,
					async () => {
						const tokenContract = new ethers.Contract(
							tokenAddress,
							[
								'function balanceOf(address) view returns (uint256)',
								'function decimals() view returns (uint8)',
								'function symbol() view returns (string)',
								'function name() view returns (string)',
							],
							provider
						);

						const [balance, decimals, symbol, name] = await Promise.all([
							withTimeout(tokenContract.balanceOf(holderAddress)),
							withTimeout(tokenContract.decimals()),
							withTimeout(tokenContract.symbol()),
							withTimeout(tokenContract.name()),
						]);

						const balanceTyped = balance as ethers.BigNumber;
						const decimalsTyped = decimals as number;
						const symbolTyped = symbol as string;
						const nameTyped = name as string;

						const formattedBalance = ethers.utils.formatUnits(balanceTyped, decimalsTyped);

						return {
							token: {
								address: tokenAddress,
								symbol: symbolTyped,
								name: nameTyped,
								decimals: decimalsTyped,
							},
							balance: balanceTyped.toString(),
							formattedBalance,
						};
					},
					30000
				); // 30 second TTL
			});
		},
		[provider, execute, withCache, withTimeout]
	);

	/**
	 * Get token information
	 */
	const getTokenInfo = useCallback(
		async (tokenAddress: Address): Promise<TokenInfo> => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				if (!ethers.utils.isAddress(tokenAddress)) {
					throw new Error('Invalid token address');
				}

				return withCache(`token-info-${tokenAddress}`, async () => {
					const tokenContract = new ethers.Contract(
						tokenAddress,
						[
							'function name() view returns (string)',
							'function symbol() view returns (string)',
							'function decimals() view returns (uint8)',
							'function totalSupply() view returns (uint256)',
						],
						provider
					);

					const [name, symbol, decimals, totalSupply] = await Promise.all([
						withTimeout(tokenContract.name()),
						withTimeout(tokenContract.symbol()),
						withTimeout(tokenContract.decimals()),
						withTimeout(tokenContract.totalSupply()),
					]);

					const nameTyped = name as string;
					const symbolTyped = symbol as string;
					const decimalsTyped = decimals as number;
					const totalSupplyTyped = totalSupply as ethers.BigNumber;

					return {
						address: tokenAddress,
						name: nameTyped,
						symbol: symbolTyped,
						decimals: decimalsTyped,
						totalSupply: ethers.utils.formatUnits(totalSupplyTyped, decimalsTyped),
					};
				});
			});
		},
		[provider, execute, withCache, withTimeout]
	);

	/**
	 * Estimate gas for a transaction
	 */
	const estimateGas = useCallback(
		async (transaction: { to: Address; data?: string; value?: string; from?: Address }): Promise<GasEstimation> => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				const [gasLimit, gasPrice, feeData] = await Promise.all([
					withTimeout(provider.estimateGas(transaction)),
					withTimeout(provider.getGasPrice()),
					withTimeout(provider.getFeeData()).catch(() => null), // EIP-1559 support
				]);

				const gasLimitTyped = gasLimit as ethers.BigNumber;
				const gasPriceTyped = gasPrice as ethers.BigNumber;
				const feeDataTyped = feeData as {
					maxFeePerGas?: ethers.BigNumber;
					maxPriorityFeePerGas?: ethers.BigNumber;
				} | null;

				const estimatedCost = gasLimitTyped.mul(gasPriceTyped);

				return {
					gasLimit: gasLimitTyped.toString(),
					gasPrice: gasPriceTyped.toString(),
					estimatedCost: ethers.utils.formatEther(estimatedCost),
					maxFeePerGas: feeDataTyped?.maxFeePerGas?.toString(),
					maxPriorityFeePerGas: feeDataTyped?.maxPriorityFeePerGas?.toString(),
				};
			});
		},
		[provider, execute, withTimeout]
	);

	/**
	 * Get transaction receipt
	 */
	const getTransactionReceipt = useCallback(
		async (hash: Hash) => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				if (!hash.match(/^0x[a-fA-F0-9]{64}$/)) {
					throw new Error('Invalid transaction hash');
				}

				return withTimeout(provider.getTransactionReceipt(hash));
			});
		},
		[provider, execute, withTimeout]
	);

	/**
	 * Wait for transaction confirmation
	 */
	const waitForTransaction = useCallback(
		async (
			hash: Hash,
			confirmations = 1,
			timeoutMs = 300000 // 5 minutes
		) => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				if (!hash.match(/^0x[a-fA-F0-9]{64}$/)) {
					throw new Error('Invalid transaction hash');
				}

				return withTimeout(provider.waitForTransaction(hash, confirmations), timeoutMs);
			});
		},
		[provider, execute, withTimeout]
	);

	/**
	 * Get current block number
	 */
	const getBlockNumber = useCallback(async (): Promise<number> => {
		return execute(async () => {
			if (!provider) {
				throw new Error('Provider not available');
			}

			return withCache(
				'block-number',
				async () => {
					return withTimeout(provider.getBlockNumber());
				},
				10000
			); // 10 second TTL
		});
	}, [provider, execute, withCache, withTimeout]);

	/**
	 * Get block information
	 */
	const getBlock = useCallback(
		async (blockNumber?: number) => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				const blockTag = blockNumber || 'latest';
				const cacheKey = `block-${blockTag}`;

				return withCache(
					cacheKey,
					async () => {
						return withTimeout(provider.getBlock(blockTag));
					},
					blockNumber ? 60000 : 10000
				); // Cache specific blocks longer
			});
		},
		[provider, execute, withCache, withTimeout]
	);

	/**
	 * Resolve ENS name to address
	 */
	const resolveENS = useCallback(
		async (ensName: string): Promise<Address | null> => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				if (!ensName.endsWith('.eth')) {
					throw new Error('Invalid ENS name');
				}

				return withCache(`ens-${ensName}`, async () => {
					const address = await withTimeout(provider.resolveName(ensName));
					return address as Address | null;
				});
			});
		},
		[provider, execute, withCache, withTimeout]
	);

	/**
	 * Reverse resolve address to ENS name
	 */
	const reverseResolveENS = useCallback(
		async (address: Address): Promise<string | null> => {
			return execute(async () => {
				if (!provider) {
					throw new Error('Provider not available');
				}

				if (!ethers.utils.isAddress(address)) {
					throw new Error('Invalid address');
				}

				return withCache(`reverse-ens-${address}`, async () => {
					return withTimeout(provider.lookupAddress(address));
				});
			});
		},
		[provider, execute, withCache, withTimeout]
	);

	/**
	 * Format address for display
	 */
	const formatAddress = useCallback((address: string, length = 6): string => {
		if (!address || !ethers.utils.isAddress(address)) {
			return '';
		}

		return `${address.slice(0, length + 2)}...${address.slice(-4)}`;
	}, []);

	/**
	 * Validate address format
	 */
	const isValidAddress = useCallback((address: string): boolean => {
		return ethers.utils.isAddress(address);
	}, []);

	/**
	 * Convert address to checksum format
	 */
	const toChecksumAddress = useCallback((address: string): Address => {
		if (!ethers.utils.isAddress(address)) {
			throw new Error('Invalid address');
		}

		return ethers.utils.getAddress(address) as Address;
	}, []);

	/**
	 * Clear cache
	 */
	const clearCache = useCallback((pattern?: string) => {
		if (!pattern) {
			cacheRef.current.clear();
			return;
		}

		const regex = new RegExp(pattern);
		for (const [key] of cacheRef.current) {
			if (regex.test(key)) {
				cacheRef.current.delete(key);
			}
		}
	}, []);

	/**
	 * Get cache statistics
	 */
	const getCacheStats = useCallback(() => {
		return {
			size: cacheRef.current.size,
			keys: Array.from(cacheRef.current.keys()),
		};
	}, []);

	// Cleanup cache on unmount
	useEffect(() => {
		return () => {
			cacheRef.current.clear();
		};
	}, []);

	// Memoize network information
	const currentNetwork = useMemo(
		() => ({
			chainId,
			name: chainMetadata?.name,
			isConnected: !!provider,
		}),
		[chainId, chainMetadata?.name, provider]
	);

	return {
		// Network utilities
		getNetworkInfo,
		currentNetwork,

		// Balance utilities
		getEthBalance,
		getTokenBalance,
		getTokenInfo,

		// Transaction utilities
		estimateGas,
		getTransactionReceipt,
		waitForTransaction,

		// Block utilities
		getBlockNumber,
		getBlock,

		// ENS utilities
		resolveENS,
		reverseResolveENS,

		// Address utilities
		formatAddress,
		isValidAddress,
		toChecksumAddress,

		// Cache utilities
		clearCache,
		getCacheStats,

		// Actions
		abort,
	};
}

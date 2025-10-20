'use client';
import Image from 'next/image';
import { useSwitchActiveWalletChain, useActiveWalletChain, useActiveWalletConnectionStatus } from 'thirdweb/react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, Network } from 'lucide-react';
import { useAuthStore } from '@/store/userStore';
import { useEffect, useRef, useState } from 'react';
import { useApi } from '@/hooks/useApi';
import { getChainObject } from '@/utils/chainUtils';

export function ChainSwitcher() {
	const switchChain = useSwitchActiveWalletChain();
	const { id: chainId } = useActiveWalletChain() || {};

	const connectionStatus = useActiveWalletConnectionStatus();
	const isConnected = connectionStatus === 'connected';
	const { chains, fetchChains, _hasHydrated, login } = useAuthStore();
	const { data: switchChainResponse, isLoading: isSwitchingChain } = useApi();
	const hasFetchedChains = useRef(false);

	const [currentChain, setCurrentChain] = useState(() => {
		if (Array.isArray(chains)) {
			return chains.find(chain => chain.chain_id === chainId) || undefined;
		}
		return undefined;
	});

	// 使用单独的 useEffect 来重置 fetch 状态当 chains 变为非空时
	useEffect(() => {
		if (chainId && chains && chains.length > 0) {
			setCurrentChain(chains.find(chain => chain.chain_id === chainId) || undefined);
			hasFetchedChains.current = false; // 允许下次重新获取
		}
	}, [chains, chainId]);

	useEffect(() => {
		if (_hasHydrated && !hasFetchedChains.current && (!chains || chains.length === 0)) {
			hasFetchedChains.current = true;
			fetchChains();
		}
	}, [fetchChains, _hasHydrated, chains]);

	useEffect(() => {
		if (switchChainResponse && switchChainResponse.success) {
			login({
				user: switchChainResponse.data.user,
				accessToken: switchChainResponse.data.access_token,
				refreshToken: switchChainResponse.data.refresh_token,
				expiresAt: switchChainResponse.data.expires_at,
			});
		} else if (switchChainResponse && switchChainResponse.error) {
			console.error('Backend chain switch failed:', switchChainResponse.error.message);
		}
	}, [switchChainResponse, login]);

	if (!_hasHydrated) {
		return (
			<Button variant='outline' size='sm' disabled className='h-9'>
				<Skeleton className='h-4 w-4 rounded-full mr-1' />
				<Skeleton className='h-4 w-20 hidden sm:inline-block' />
				<ChevronDown className='ml-2 h-3 w-3 text-gray-400' />
			</Button>
		);
	}

	if (!isConnected) {
		return (
			<Button variant='outline' size='sm' disabled>
				<Network className='mr-2 h-4 w-4' />
				No Network
			</Button>
		);
	}

	const handleChainSwitch = async (newChainId: number) => {
		try {
			// Get the thirdweb chain object for the given chain ID
			const chainObject = getChainObject(newChainId);

			if (!chainObject) {
				console.error(`Chain ID ${newChainId} is not supported by thirdweb`);
				return;
			}

			// 1. Switch chain in wallet
			try {
				await switchChain(chainObject);
			} catch (error: unknown) {
				// If the chain is not configured, try to add it
				if (error instanceof Error && error.name.includes('ChainNotConfigured')) {
					const chainToAdd = Array.isArray(chains) ? chains.find(c => c.chain_id === newChainId) : undefined;

					const windowWithEthereum = window as Window &
						typeof globalThis & {
							ethereum?: {
								request: (args: { method: string; params?: Record<string, unknown>[] | undefined }) => Promise<unknown>;
							};
						};
					if (chainToAdd && typeof window !== 'undefined' && windowWithEthereum.ethereum) {
						try {
							await windowWithEthereum.ethereum.request({
								method: 'wallet_addEthereumChain',
								params: [
									{
										chainId: '0x89', // 16进制形式的 chainId（Polygon 主网为 137）
										chainName: 'Polygon Mainnet',
										nativeCurrency: {
											name: 'MATIC',
											symbol: 'MATIC',
											decimals: 18,
										},
										rpcUrls: ['https://polygon-rpc.com/'],
										blockExplorerUrls: ['https://polygonscan.com/'],
									},
								],
							});
							// Try switching again after adding
							await switchChain(chainObject);
						} catch (addError) {
							console.error('Failed to add chain to wallet:', addError);
							return;
						}
					} else {
						console.error('Chain info not found or ethereum provider missing');
						return;
					}
				} else {
					console.error('Failed to switch chain:', error);
					return;
				}
			}
		} catch (error) {
			console.error('Failed to switch chain or sign message:', error);
			// Handle user rejecting signature or other errors
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild className=' cursor-pointer h-9'>
				<Button variant='outline' size='sm' disabled={isSwitchingChain}>
					<span className='mr-1 rounded-full overflow-hidden'>{currentChain?.logo_url && <Image src={currentChain.logo_url} alt={currentChain.chain_name ?? ''} width={16} height={16} />}</span>
					<span className='hidden sm:inline'>{currentChain?.display_name ?? 'Unsupported Chain'}</span>
					<ChevronDown className='ml-2 h-3 w-3' />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='end' className='w-48'>
				{Array.isArray(chains) &&
					chains.map(chain => (
						<DropdownMenuItem
							key={chain.id}
							onClick={() => handleChainSwitch(chain.chain_id)}
							className={`${chainId === chain.id ? 'bg-accent' : ''} cursor-pointer`}
							disabled={isSwitchingChain}>
							<span className='mr-1 rounded-full overflow-hidden'>
								<Image src={chain.logo_url} alt={chain.chain_name} width={20} height={20} />
							</span>
							<div className='flex flex-col'>
								<span className='font-medium'>{chain.display_name}</span>
								{chainId === chain.id && <span className='text-xs text-muted-foreground'>Connected</span>}
							</div>
						</DropdownMenuItem>
					))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

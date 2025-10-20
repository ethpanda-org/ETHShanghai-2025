import { useQuery } from '@tanstack/react-query';
import { useMemo, useRef, useState, useEffect } from 'react';
import { ethers5Adapter } from 'thirdweb/adapters/ethers5';
import { useActiveAccount, useActiveWalletChain, useActiveWalletConnectionStatus, useConnect, useEnsName } from 'thirdweb/react';
import { createThirdwebClient } from 'thirdweb';

/**
 * Starting refactor useWeb3React to make it easy to replace for wagmi or thirdweb
 */
export function useWeb3React(): {
	activeAccount: ReturnType<typeof useActiveAccount>;
	account: string | undefined;
	isActive: boolean;
	chainId: number | undefined;
	chainMetadata: ReturnType<typeof useActiveWalletChain>;
	provider: ReturnType<typeof ethers5Adapter.provider.toEthers> | undefined;
	signer: any;
	isActivating: boolean;
	ENSName: string | null | undefined;
	connector: undefined;
	signMessage: ({ message, originalMessage, chainId }: { message: string; originalMessage?: string | undefined; chainId?: number | undefined }) => Promise<`0x${string}`>;
	sendTransaction: ({ to, data, value }: { to: string; data?: string | undefined; value?: string | number | bigint | undefined }) => Promise<any>;
	client: ReturnType<typeof createThirdwebClient>;
} {

	const client = useMemo(() => createThirdwebClient({
		clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || '....',
		secretKey: process.env.NEXT_PUBLIC_THIRDWEB_SECRET_KEY || '....',
	  }), []); // 只创建一次

	const activeAccount = useActiveAccount();

	const activeChain = useActiveWalletChain();
	const status = useActiveWalletConnectionStatus();

	const { isConnecting } = useConnect();

	// 优化 ENS 查询 - 添加防抖和更长的缓存
	const ensQueryRef = useRef<NodeJS.Timeout | null>(null);
	const [shouldQueryEns, setShouldQueryEns] = useState(false);

	// 防抖 ENS 查询
	useEffect(() => {
		if (activeAccount?.address) {
			if (ensQueryRef.current) {
				clearTimeout(ensQueryRef.current);
			}
			ensQueryRef.current = setTimeout(() => {
				setShouldQueryEns(true);
			}, 1000); // 1秒防抖
		} else {
			setShouldQueryEns(false);
		}

		return () => {
			if (ensQueryRef.current) {
				clearTimeout(ensQueryRef.current);
			}
		};
	}, [activeAccount?.address]);

	const { data } = useEnsName({
		client: client,
		address: shouldQueryEns ? activeAccount?.address : undefined,
	});

	const provider = useMemo(() => {
		if (activeChain) {
			return ethers5Adapter.provider.toEthers({
				client: client,
				chain: activeChain,
			});
		}
	}, [client, activeChain]);

	const signer = useQuery({
		queryKey: ['GET_THIRD_WEB_SIGNER', activeChain, activeAccount],
		queryFn: async () => {
			return ethers5Adapter.signer.toEthers({
				client: client,
				chain: activeChain!,
				account: activeAccount!,
			});
		},
		enabled: !!activeChain && !!activeAccount,
		retry: 1,
	});

	const signMessage =
		activeAccount ?
			activeAccount.signMessage
		:	() => {
				throw new Error('No account');
			};

	const sendTransaction =
		activeAccount ?
			async ({ to, data, value }: { to: string; data?: string | undefined; value?: string | number | bigint | undefined }) => {
				// Ensure data is a hex string if provided
				let hexData: `0x${string}` | undefined = undefined;
				if (data !== undefined) {
					hexData = data.startsWith('0x') ? (data as `0x${string}`) : (`0x${Buffer.from(data, 'utf8').toString('hex')}` as `0x${string}`);
				}
				return await activeAccount.sendTransaction({
					to,
					data: hexData,
					value,
				} as any);
			}
		:	() => {
				throw new Error('No account');
			};

	return {
		activeAccount,
		account: activeAccount?.address,
		isActive: status === 'connected',
		chainId: activeChain?.id,
		chainMetadata: activeChain,
		provider,
		signer: signer.data,
		isActivating: isConnecting,
		ENSName: data,
		connector: undefined,
		signMessage,
		sendTransaction,
		client
	};
}

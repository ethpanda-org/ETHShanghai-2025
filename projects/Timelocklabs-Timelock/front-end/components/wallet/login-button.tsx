'use client';

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ConnectWallet } from './connect-wallet';
import { Button } from '@/components/ui/button';
import { useActiveWalletConnectionStatus, useActiveAccount, useActiveWallet, useActiveWalletChain, useDisconnect } from 'thirdweb/react';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { isSafeWallet } from '@/utils/walletUtils';

/**
 * 登录按钮状态枚举
 */
type LoginState = 'disconnected' | 'errorSigningIn' | 'signing' | 'signed';

interface LoginButtonProps {
	fullWidth?: boolean;
}

export function LoginButton({ fullWidth = true }: LoginButtonProps) {
	const t = useTranslations('walletLogin');
	const activeAccount = useActiveAccount();
	const { address, signMessage } = activeAccount || {};
	const connectionStatus = useActiveWalletConnectionStatus();
	const { disconnect } = useDisconnect();
	const wallet = useActiveWallet();
	const activeChain = useActiveWalletChain();
	const isConnected = connectionStatus === 'connected';
	const { request: walletConnect } = useApi();
	const { request: getAuthNonce } = useApi();
	const login = useAuthStore(state => state.login);
	const isAuthenticated = useAuthStore(state => state.isAuthenticated);
	const router = useRouter();

	const [loginState, setLoginState] = useState<LoginState>('disconnected');
	const [signatureAttempted, setSignatureAttempted] = useState(false);

	const isWalletSafe = useMemo(() => isSafeWallet(wallet), [wallet]);

	// 根据钱包连接状态和其他条件确定当前状态
	const currentState = useMemo((): LoginState => {
		if (!isConnected) return 'disconnected';
		if (signatureAttempted) return 'signed';
		// 优先检查 loginState，只有在真正签名中时才显示 signing
		if (loginState === 'signing') return 'signing';
		// 如果 loginState 是 connected，即使 apiLoading，也要显示错误状态
		if (loginState === 'errorSigningIn') return 'errorSigningIn';

		return 'disconnected';
	}, [isConnected, loginState, signatureAttempted]);

	// 防抖处理的 ref
	const debounceRef = useRef<NodeJS.Timeout | null>(null);
	const isSigningRef = useRef(false);

	// 处理用户签名（带防抖处理）
	const handleSignature = useCallback(async () => {
		if (!isConnected || !address || !signMessage) {
			toast.error(t('pleaseConnectWallet'));
			return;
		}

		// 防抖处理：如果正在签名中，直接返回
		if (isSigningRef.current) {
			console.log('签名正在进行中，忽略重复点击');
			return;
		}

		// 清除之前的防抖定时器
		if (debounceRef.current) {
			clearTimeout(debounceRef.current);
		}

		// 设置防抖定时器
		debounceRef.current = setTimeout(async () => {
			isSigningRef.current = true;
			setLoginState('signing');
			setSignatureAttempted(false);
			try {
				await performSignature();
			} finally {
				isSigningRef.current = false;
			}
		}, 300); // 300ms 防抖延迟
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConnected, address, signMessage, t]);

	// 错误的方法
	const getErrorMsg = useCallback(
		(errorMessage: string) => {
			let errorMsg = '';
			if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorMessage.includes('user') || errorMessage.includes('cancel')) {
				errorMsg = t('safeWalletSignatureRejected');
			} else if (errorMessage.includes('timeout')) {
				errorMsg = t('safeWalletSignatureTimeout');
			} else if (errorMessage.includes('not available') || errorMessage.includes('SDK')) {
				errorMsg = t('safeWalletSDKError');
			} else if (errorMessage.includes('Strategy timeout')) {
				errorMsg = t('safeWalletStrategyTimeout');
			} else {
				errorMsg = t('safeWalletSignatureError');
			}
			return errorMsg;
		},
		[t]
	);

	// 实际执行签名的函数
	const performSignature = useCallback(async () => {
		try {
			const currentChainId = activeChain?.id || 1;

			let requestPayload;

			if (isWalletSafe) {
				// For Safe wallets, skip nonce and signature steps
				requestPayload = {
					chain_id: 11155111,
					wallet_address: address,
					wallet_type: 'safe',
				};
			} else {
				// Step 1: Get nonce from the backend (only for EOA wallets)
				const nonceResponse = await getAuthNonce('/api/v1/auth/nonce', {
					wallet_address: address,
				});

				if (!nonceResponse?.success || !nonceResponse.data?.message || !nonceResponse.data?.nonce) {
					throw new Error('Failed to get nonce from server');
				}

				const { message, nonce } = nonceResponse.data;

				// Step 2: Sign the message (only for EOA wallets)
				if (!signMessage) {
					throw new Error('signMessage is not available');
				}
				const signature = await signMessage({ message });

				// For EOA wallets, send full signature data
				requestPayload = {
					wallet_address: address,
					signature,
					message,
					nonce,
					wallet_type: 'eoa',
				};
			}

			const connectResponse = await walletConnect('/api/v1/auth/wallet-connect', requestPayload);

			if (connectResponse?.success) {
				setSignatureAttempted(true);
				setLoginState('signed');
				login({
					user: connectResponse.data.user,
					accessToken: connectResponse.data.access_token,
					refreshToken: connectResponse.data.refresh_token,
					expiresAt: connectResponse.data.expires_at,
				});
			}

			setTimeout(() => {
				router.replace('/home');
			}, 1000);
		} catch (error) {
			const errorMessage = (error as { message?: string }).message || 'Unknown error';
			console.error('Signature error:', errorMessage);
			const errorMsg = getErrorMsg(errorMessage);
			setLoginState('errorSigningIn');
			setTimeout(() => {
				if (wallet) {
					disconnect(wallet);
				}
			}, 3000);
			toast.error(t('errorSigningIn', { error: errorMsg }));
		} finally {
			isSigningRef.current = false;
		}
	}, [address, signMessage, walletConnect, getAuthNonce, t, isWalletSafe, activeChain, router, disconnect, getErrorMsg, login, wallet]);

	// 处理钱包断开连接
	const handleWalletDisconnect = useCallback(() => {
		setLoginState('disconnected');
		setSignatureAttempted(false);
		// 如果用户已经认证，执行登出操作
		if (isAuthenticated) {
			const logout = useAuthStore.getState().logout;
			logout();
		}
	}, [isAuthenticated]);

	// 页面初始化时如果发现钱包连接则断开连接（仅在组件首次挂载时执行）
	useEffect(() => {
		// 如果用户已经认证，也执行登出操作
		if (isAuthenticated) {
			if (wallet) {
				disconnect(wallet);
			}
			const logout = useAuthStore.getState().logout;
			logout();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [wallet]); // 空依赖数组，确保只在组件挂载时执行一次

	useEffect(() => {
		if (isConnected && address && !isAuthenticated) {
			handleSignature();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [address, isConnected, handleSignature]);

	// 根据当前状态渲染不同的按钮
	const renderButton = (currentState: LoginState) => {
		switch (currentState) {
			case 'disconnected':
				return (
					<>
						<div
							style={{ display: connectionStatus === 'unknown' ? 'flex' : 'none' }}
							className='w-full h-12 bg-white text-black font-medium rounded-md items-center justify-center'>
							<Loader2 className='w-4 h-4 mr-2 animate-spin' />
							<span>{t('initializing')}</span>
						</div>
						<div style={{ display: connectionStatus !== 'unknown' ? 'block' : 'none' }}>
							<ConnectWallet icon={false} fullWidth={fullWidth} onDisconnect={handleWalletDisconnect} />
						</div>
					</>
				);
			case 'errorSigningIn':
				return (
					<>
						<Button onClick={handleSignature} className='w-full h-12 bg-white text-black font-medium rounded-md transition-colors' disabled={false}>
							{t('retrySignature')}
						</Button>
					</>
				);

			case 'signing':
				return (
					<div className='w-full h-12 bg-white text-black font-medium rounded-md opacity-90 flex items-center justify-center pointer-events-none select-none hover:cursor-not-allowed'>
						<Loader2 className='w-4 h-4 mr-2 animate-spin' />
						{t('signing')}
					</div>
				);

			case 'signed':
				return (
					<div className='w-full h-12 bg-white text-black font-medium rounded-md opacity-90 flex items-center justify-center pointer-events-none select-none hover:cursor-not-allowed'>
						✓ {t('loginSuccess')}
					</div>
				);

			default:
				return null;
		}
	};

	return <div className='w-full'>{renderButton(currentState)}</div>;
}

'use client';

import { ConnectButton } from 'thirdweb/react';
import { createWallet } from 'thirdweb/wallets';
import { memo, useEffect } from 'react';
import { useAuthStore } from '@/store/userStore';
import { useRouter } from 'next/navigation';
import { cn } from '@/utils/utils';
import type { BaseComponentProps, VoidCallback } from '@/types';
import { 
	ethereum,
	sepolia,
	polygon,
	coreMainnet,
	scroll,
	linea,
	bsc, 
	optimism, 
	base, 
	arbitrum, 
} from 'thirdweb/chains';
import { 
	hashKey, 
	exSat, 
	merlin, 
	zkLink, 
	aiLayer, 
	bsquare, 
	goat, 
	hemi, 
	plume, 
	mode,
	bitLayer 
} from '@/utils/chainUtils';
import { useActiveWalletConnectionStatus } from 'thirdweb/react';
import { useWeb3React } from '@/hooks/useWeb3React';
import { useTranslations } from 'next-intl';

const wallets = [
	createWallet('io.metamask'), 
	createWallet('com.coinbase.wallet'), 
	createWallet('com.okex.wallet'), 
	createWallet('global.safe'),
	createWallet('com.safepal'),
	createWallet("walletConnect"),
];

const supportedChains = [
	ethereum, 
	sepolia, 
	polygon,
	coreMainnet,
	mode,
	bsc, 
	scroll,
	linea,
	optimism, 
	base, 
	arbitrum, 
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
];
interface ConnectWalletProps extends BaseComponentProps {
	icon?: boolean;
	fullWidth?: boolean;
	headerStyle?: boolean;
	onConnect?: VoidCallback;
	onDisconnect?: VoidCallback;
}

// 样式常量，便于维护和自定义
const WALLET_STYLES = {
	button: {
		base: {
			backgroundColor: '#000000',
			color: '#ffffff',
			border: 'none',
			borderRadius: '0.375rem',
			fontWeight: '500',
			transition: 'background-color 0.2s ease',
			cursor: 'pointer',
			width: '100%',
		},
		hover: {
			backgroundColor: '#374151',
		},
		fullWidth: {
			backgroundColor: '#F5F5F5',
			color: '#000000',
			height: '48px',
			width: '100%',
		},
		header: {
			height: '36px',
			width: '139px',
		},
	},
	connected: {
		hideFirstChild: { display: 'none' },
		hideLastSpan: { display: 'none' },
		centerText: { textAlign: 'center' as const },
	},
} as const;

/**
 * Connect wallet component with thirdweb integration
 *
 * @param props - ConnectWallet component props
 * @returns JSX.Element
 */
export const ConnectWallet = memo(function ConnectWallet({ fullWidth, headerStyle, onConnect, onDisconnect, className }: ConnectWalletProps) {
	const logout = useAuthStore(state => state.logout);
	const router = useRouter();
	const t = useTranslations('walletLogin');

	const wrapperClass = cn('connect-wallet-container', fullWidth ? 'w-full' : 'w-auto', className);
	const { client } = useWeb3React();

	const connectionStatus = useActiveWalletConnectionStatus();

	useEffect(() => {
		if (connectionStatus === 'disconnected') {
			router.replace('/login');
		}
	}, [connectionStatus, router]);

	return (
		<div className={wrapperClass}>
			<ConnectButton
				client={client}
				chains={supportedChains}
				connectButton={{
					label: t('connectWallet'),
				}}
				connectModal={{
					size: 'compact',
					...(headerStyle && { title: t('connectWallet') }),
				}}
				wallets={wallets}
				theme='dark'
				onConnect={() => {
					onConnect?.();
				}}
				onDisconnect={() => {
					logout();
					router.replace('/login');
					onDisconnect?.();
				}}
			/>
			<style jsx global>{`
				/* 连接按钮基础样式 - 覆盖所有可能的按钮元素，包括行内样式 */
				.connect-wallet-container [data-testid='connect-button'],
				.connect-wallet-container button[data-theme],
				.connect-wallet-container button,
				.connect-wallet-container [data-testid='connect-button'][style],
				.connect-wallet-container button[data-theme][style],
				.connect-wallet-container button[style] {
					border: ${WALLET_STYLES.button.base.border} !important;
					border-radius: ${WALLET_STYLES.button.base.borderRadius} !important;
					font-weight: ${WALLET_STYLES.button.base.fontWeight} !important;
					transition: ${WALLET_STYLES.button.base.transition} !important;
					cursor: ${WALLET_STYLES.button.base.cursor} !important;
					width: 200px !important;
				}

				/* 全宽模式样式 - 覆盖所有可能的按钮元素，包括行内样式 */
				.connect-wallet-container.w-full [data-testid='connect-button'],
				.connect-wallet-container.w-full button[data-theme],
				.connect-wallet-container.w-full button,
				.connect-wallet-container.w-full [data-testid='connect-button'][style],
				.connect-wallet-container.w-full button[data-theme][style],
				.connect-wallet-container.w-full button[style] {
					height: ${WALLET_STYLES.button.fullWidth.height} !important;
					width: ${WALLET_STYLES.button.fullWidth.width} !important;
					min-width: 0 !important;
					max-width: none !important;
					background-color: ${WALLET_STYLES.button.fullWidth.backgroundColor} !important;
					color: ${WALLET_STYLES.button.fullWidth.color} !important;
				}

				/* 头部模式样式 - 覆盖所有可能的按钮元素 */
				.connect-wallet-container.w-auto [data-testid='connect-button'],
				.connect-wallet-container.w-auto button[data-theme],
				.connect-wallet-container.w-auto button {
					height: ${WALLET_STYLES.button.header.height} !important;
					width: ${WALLET_STYLES.button.header.width} !important;
				}

				/* 悬停效果 - 覆盖所有可能的按钮元素 */
				.connect-wallet-container [data-testid='connect-button']:hover,
				.connect-wallet-container button[data-theme]:hover,
				.connect-wallet-container button:hover {
					background-color: ${WALLET_STYLES.button.hover.backgroundColor} !important;
				}

				/* 已连接按钮基础样式 */
				.connect-wallet-container .tw-connected-wallet {
					background-color: ${WALLET_STYLES.button.base.backgroundColor} !important;
					color: ${WALLET_STYLES.button.base.color} !important;
					border: ${WALLET_STYLES.button.base.border} !important;
					border-radius: ${WALLET_STYLES.button.base.borderRadius} !important;
					font-weight: ${WALLET_STYLES.button.base.fontWeight} !important;
					transition: ${WALLET_STYLES.button.base.transition} !important;
					cursor: ${WALLET_STYLES.button.base.cursor} !important;
					box-sizing: border-box !important;
				}

				/* 已连接按钮全宽模式样式 */
				.connect-wallet-container.w-full .tw-connected-wallet {
					height: ${WALLET_STYLES.button.fullWidth.height} !important;
					width: ${WALLET_STYLES.button.fullWidth.width} !important;
					background-color: ${WALLET_STYLES.button.fullWidth.backgroundColor} !important;
					color: ${WALLET_STYLES.button.fullWidth.color} !important;
				}

				/* 已连接按钮头部模式样式 */
				.connect-wallet-container.w-auto .tw-connected-wallet {
					height: ${WALLET_STYLES.button.header.height} !important;
					width: ${WALLET_STYLES.button.header.width} !important;
					min-width: ${WALLET_STYLES.button.header.width} !important;
					max-width: ${WALLET_STYLES.button.header.width} !important;
				}

				/* 已连接按钮悬停效果 */
				.connect-wallet-container .tw-connected-wallet:hover {
					background-color: ${WALLET_STYLES.button.hover.backgroundColor} !important;
				}

				/* 隐藏头像 - 仅在全宽模式下 */
				.connect-wallet-container.w-full .tw-connected-wallet > div:first-child {
					display: none !important;
				}

				/* 为 w-auto 模式添加钱包图标 */
				.connect-wallet-container.w-auto .tw-connected-wallet > div:first-child {
					display: none !important;
				}

				.connect-wallet-container.w-auto .tw-connected-wallet {
					position: relative !important;
				}

				.connect-wallet-container.w-auto .tw-connected-wallet::before {
					content: '' !important;
					position: absolute !important;
					left: 12px !important;
					top: 50% !important;
					transform: translateY(-50%) !important;
					width: 16px !important;
					height: 16px !important;
					background-image: url('/wallet-user.png') !important;
					background-size: contain !important;
					background-repeat: no-repeat !important;
					background-position: center !important;
				}

				/* 为 w-auto 模式的地址文本添加左边距以避免与图标重叠 */
				.connect-wallet-container.w-auto .tw-connected-wallet__address {
					padding-left: 28px !important;
					padding-right: 8px !important;
				}

				/* 隐藏余额信息 */
				.connect-wallet-container .tw-connected-wallet .tw-connected-wallet__balance {
					display: none !important;
				}

				/* 地址容器居中 */
				.connect-wallet-container .tw-connected-wallet > div:last-child {
					display: flex !important;
					justify-content: center !important;
					align-items: center !important;
					width: 100% !important;
				}

				/* 地址文本居中 */
				.connect-wallet-container .tw-connected-wallet__address {
					text-align: center !important;
					width: 100% !important;
					font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif !important;
				}

				.connect-wallet-container .tw-connected-wallet__address span {
					display: block !important;
					text-align: center !important;
					width: 100% !important;
					font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif !important;
				}
			`}</style>
		</div>
	);
});

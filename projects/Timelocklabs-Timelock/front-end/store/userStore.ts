import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { AppStateSchema, type AppState, type User, type TimelockContractItem } from './schema';
import type { Chain } from '@/types';
import { zodMiddleware } from './zodMiddleware';
import { cookieUtil } from '../utils/cookieUtil';
const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL;

const DEFAULT_TIMESTAMP = '2024-01-01T00:00:00Z';
const DEFAULT_LOGO = 'https://raw.githubusercontent.com/timelock-labs/assets/main/chains/eth-mainnet.png';

const STATIC_CHAINS = [
	{
		id: 1,
		chain_id: 1,
		chain_name: 'Ethereum Mainnet',
		display_name: 'Ethereum Mainnet',
		logo_url: DEFAULT_LOGO,
		native_token: 'Ether',
		native_currency_symbol: 'ETH',
		is_testnet: false,
		is_active: true,
		created_at: DEFAULT_TIMESTAMP,
		updated_at: DEFAULT_TIMESTAMP,
		block_explorer_urls: 'https://etherscan.io',
	},
	{
		id: 56,
		chain_id: 56,
		chain_name: 'BNB Smart Chain',
		display_name: 'BNB Smart Chain',
		logo_url: 'https://raw.githubusercontent.com/timelock-labs/assets/main/chains/bsc-mainnet.png',
		native_token: 'BNB',
		native_currency_symbol: 'BNB',
		is_testnet: false,
		is_active: true,
		created_at: DEFAULT_TIMESTAMP,
		updated_at: DEFAULT_TIMESTAMP,
		block_explorer_urls: 'https://bscscan.com',
	},
	{
		id: 177,
		chain_id: 177,
		chain_name: 'HashKey Chain',
		display_name: 'HashKey Chain',
		logo_url: 'https://raw.githubusercontent.com/timelock-labs/assets/main/chains/hashkey-mainnet.jpg',
		native_token: 'HSK',
		native_currency_symbol: 'HSK',
		is_testnet: false,
		is_active: true,
		created_at: DEFAULT_TIMESTAMP,
		updated_at: DEFAULT_TIMESTAMP,
		block_explorer_urls: 'https://hashkeyscan.io',
	},
	{
		id: 11155111,
		chain_id: 11155111,
		chain_name: 'Ethereum Sepolia Testnet',
		display_name: 'Sepolia Testnet',
		logo_url: 'https://raw.githubusercontent.com/timelock-labs/assets/main/chains/eth-sepolia.png',
		native_token: 'Ether',
		native_currency_symbol: 'ETH',
		is_testnet: true,
		is_active: true,
		created_at: DEFAULT_TIMESTAMP,
		updated_at: DEFAULT_TIMESTAMP,
		block_explorer_urls: 'https://sepolia.etherscan.io',
	},
	{
		id: 97,
		chain_id: 97,
		chain_name: 'BNB Smart Chain Testnet',
		display_name: 'BNB Testnet',
		logo_url: 'https://raw.githubusercontent.com/timelock-labs/assets/main/chains/bsc-testnet.png',
		native_token: 'BNB',
		native_currency_symbol: 'tBNB',
		is_testnet: true,
		is_active: true,
		created_at: DEFAULT_TIMESTAMP,
		updated_at: DEFAULT_TIMESTAMP,
		block_explorer_urls: 'https://testnet.bscscan.com',
	},
] satisfies Chain[];

// 定义 Store 的 actions (方法)
type AppActions = {
	login: (data: { user: User; accessToken: string; refreshToken: string; expiresAt: string }) => void;
	logout: () => void;
	fetchChains: () => Promise<void>;
	refreshAccessToken: () => Promise<void>;
	// 模拟一个错误的 action
	loginWithInvalidData: () => void;
	setAllTimelocks: (timelocks: TimelockContractItem[]) => void;
};

// 创建 store，并包裹 zodMiddleware
export const useAuthStore = create<AppState & AppActions>()(
	persist(
		zodMiddleware<AppState, AppActions>(AppStateSchema, (set, get) => ({
			user: null,
			isAuthenticated: false,
			accessToken: cookieUtil.get('accessToken'),
			refreshToken: cookieUtil.get('refreshToken'),
			expiresAt: null, // 初始化为 null，稍后会从 cookie 中获取
			// 初始化状态
			chains: [],
			allTimelocks: [],
			_hasHydrated: false,

			login: data => {
				// 写入到 cookie
				cookieUtil.set('accessToken', data.accessToken);
				cookieUtil.set('refreshToken', data.refreshToken);
				cookieUtil.set('expiresAt', data.expiresAt);
				// The persist middleware will automatically save the state.
				set({
					user: data.user,
					isAuthenticated: true,
					accessToken: data.accessToken,
					refreshToken: data.refreshToken,
					expiresAt: new Date(data.expiresAt).getTime(),
				});
			},
			logout: () => {
				// 从 cookie 中删除
				cookieUtil.remove('accessToken');
				cookieUtil.remove('refreshToken');
				cookieUtil.remove('expiresAt');
				// The persist middleware will automatically clear the persisted state.
				set({
					user: null,
					isAuthenticated: false,
					accessToken: null,
					refreshToken: null,
					expiresAt: null,
					allTimelocks: [],
				});
			},
			fetchChains: async () => {
				set({ chains: STATIC_CHAINS.map(chain => ({ ...chain })) });
			},
			refreshAccessToken: async () => {
				const state = get();
				if (!state.refreshToken) {
					console.warn('No refresh token available.');
					return;
				}

				try {
					const response = await fetch(`${baseURL}/api/v1/auth/refresh`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							refresh_token: state.refreshToken,
						}),
					});

					if (response.ok) {
						const data = await response.json();
						// 更新 cookie
						cookieUtil.set('accessToken', data.data.access_token);
						cookieUtil.set('refreshToken', data.data.refresh_token);
						cookieUtil.set('expiresAt', data.data.expires_at);
						// Persist middleware will automatically save the updated tokens.
						set({
							accessToken: data.data.access_token,
							refreshToken: data.data.refresh_token,
							expiresAt: new Date(data.data.expires_at).getTime(),
						});
					} else {
						console.error('Failed to refresh access token:', response.statusText);
						// Optionally, log out the user if refresh fails
						get().logout();
					}
				} catch (error) {
					console.error('Error refreshing access token:', error);
					get().logout();
				}
			},
			loginWithInvalidData: () => {
				// This action deliberately sets data that does not conform to the schema
				set({ user: { id: '123', name: 'x', email: 'bad-email' } });
			},
			setAllTimelocks: timelocks => set({ allTimelocks: timelocks }),
		})),
		{
			name: 'auth-storage', // 使用唯一的键名以避免冲突
			storage: createJSONStorage(() => localStorage), // 按要求使用 localStorage
			// partialize 是必须的，它告诉 middleware 只持久化数据状态，而不是 action (方法)
			partialize: state => ({
				user: state.user,
				isAuthenticated: state.isAuthenticated,
				accessToken: state.accessToken,
				refreshToken: state.refreshToken,
				expiresAt: state.expiresAt,
				chains: state.chains,
				allTimelocks: state.allTimelocks,
			}),
			// onRehydrateStorage 会在从 storage 恢复状态后执行
			onRehydrateStorage: () => state => {
				if (state) {
					state.isAuthenticated = !!state.accessToken; // 确保认证状态在加载时是正确的
					state._hasHydrated = true; // 设置水合状态为 true
				}
			},
		}
	)
);

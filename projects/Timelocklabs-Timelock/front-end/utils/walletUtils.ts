/**
 * Wallet utility functions
 * Provides reusable wallet-related helper functions
 */

import type { Wallet } from 'thirdweb/wallets';

/**
 * Check if the current wallet is a Safe wallet
 * @param wallet - The thirdweb wallet instance
 * @returns true if the wallet is a Safe wallet, false otherwise
 */
export function isSafeWallet(wallet: Wallet | undefined | null): boolean {
	if (!wallet) return false;
	const walletId = wallet?.id;
	return walletId === 'global.safe';
}

/**
 * Get wallet type string for API calls
 * @param wallet - The thirdweb wallet instance
 * @returns 'safe' for Safe wallets, 'eoa' for other wallets
 */
export function getWalletType(wallet: Wallet | undefined | null): 'safe' | 'eoa' {
	return isSafeWallet(wallet) ? 'safe' : 'eoa';
}

/**
 * Check if the wallet supports multi-signature operations
 * @param wallet - The thirdweb wallet instance
 * @returns true if the wallet supports multi-sig, false otherwise
 */
export function isMultiSigWallet(wallet: Wallet | undefined | null): boolean {
	return isSafeWallet(wallet);
}
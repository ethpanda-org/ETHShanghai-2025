/**
 * User-related API types
 */

import type { Address } from '../common';

/**
 * User data structure
 */
export interface User {
	id: string;
	name: string;
	email: string;
	walletAddress?: Address;
}

/**
 * Authentication state
 */
export interface AuthState {
	user: User | null;
	accessToken: string | null;
	refreshToken: string | null;
	isAuthenticated: boolean;
	expiresAt: number | null;
}

/**
 * Chain-related API types
 */

import type { Timestamp } from '../common';

/**
 * Chain information
 */
export interface Chain {
	id: number;
	chain_id: number;
	chain_name: string;
	display_name: string;
	logo_url: string;
	native_token: string;
	is_testnet: boolean;
	is_active: boolean;
	created_at: Timestamp;
	updated_at: Timestamp;
	native_currency_symbol: string;
	block_explorer_urls?: string;
}

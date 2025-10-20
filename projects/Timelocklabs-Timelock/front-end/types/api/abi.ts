/**
 * ABI API types
 */

/**
 * ABI item structure
 */
export interface ABIItem {
	id: number;
	name: string;
	description: string;
	abi_content: string;
	created_at: string;
	is_shared: boolean;
}

/**
 * ABI list response structure
 */
export interface ABIListResponse {
	abis: ABIItem[];
}

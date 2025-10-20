/**
 * Assets API types
 */

/**
 * Asset item structure
 */
export interface Asset {
	id: string;
	name: string;
	symbol: string;
	balance: string;
	value: string;
	price: string;
	change24h: string;
}

/**
 * Assets data response structure
 */
export interface AssetsData {
	assets: Asset[];
	totalValue: string;
	totalChange24h: string;
}

/**
 * Assets API hook return type
 */
export interface UseAssetsApiReturn {
	data: AssetsData | null;
	isLoading: boolean;
	error: Error | null;
	refetchAssets: () => void;
	hasAssets: boolean;
}

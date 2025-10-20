/**
 * Base API types and interfaces
 */

/**
 * Generic API error structure
 */
export interface ApiError {
	code: string;
	message: string;
	details?: string;
}

/**
 * Generic API response wrapper
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ApiResponse<T = any> {
	data: T | null;
	success: boolean;
	error?: ApiError;
}

/**
 * API request options
 */
export interface ApiRequestOptions {
	headers?: Record<string, string>;
	method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

/**
 * Hook return type for API operations
 */
export interface UseApiReturn {
	data: ApiResponse | null;
	error: Error | null;
	isLoading: boolean;
	request: (url: string, body?: object, options?: ApiRequestOptions) => Promise<ApiResponse>;
}

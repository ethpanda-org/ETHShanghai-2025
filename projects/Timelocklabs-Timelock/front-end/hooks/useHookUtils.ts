/**
 * Common hook utilities and patterns
 * Provides reusable utility functions that can be shared across different hooks
 */

'use client';

import { useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import type { VoidCallback, AsyncCallback, ApiRequestOptions, HttpMethod } from '@/types';

/**
 * Utility for creating consistent error messages
 */
export const createErrorMessage = (error: unknown, defaultMessage = 'An error occurred'): string => {
	if (error instanceof Object && 'message' in error) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (error as any).message;
	}
	if (typeof error === 'string') {
		return error;
	}
	return defaultMessage;
};

/**
 * Utility for creating API endpoints with parameters
 */
export const createApiEndpoint = (baseEndpoint: string, params?: Record<string, string | number | boolean | undefined>): string => {
	if (!params) return baseEndpoint;

	const searchParams = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value !== undefined && value !== null && value !== '') {
			searchParams.append(key, String(value));
		}
	});

	const queryString = searchParams.toString();
	return queryString ? `${baseEndpoint}?${queryString}` : baseEndpoint;
};

/**
 * Utility for creating dynamic API endpoints with variables
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createDynamicEndpoint = <T extends Record<string, any>>(template: string | ((variables: T) => string), variables: T): string => {
	return typeof template === 'function' ? template(variables) : template;
};

/**
 * Utility for creating standardized API request options
 */
export const createApiRequestOptions = (method: HttpMethod = 'GET', options: Partial<ApiRequestOptions> = {}): ApiRequestOptions => {
	return {
		method,
		headers: {
			'Content-Type': 'application/json',
			...options.headers,
		},
		...options,
	};
};

/**
 * Utility for handling async operations with consistent error handling
 */
export const withErrorHandling = async <T>(asyncFn: AsyncCallback<T>, errorMessage?: string): Promise<T> => {
	try {
		return await asyncFn();
	} catch (error) {
		const message = createErrorMessage(error, errorMessage);
		console.error('Async operation failed:', message, error);
		throw new Error(message);
	}
};

/**
 * Utility for creating toast notifications with consistent patterns
 */
export const createToastNotification = {
	loading: (message: string) => toast.loading(message),
	success: (message: string, id?: string | number) => (id ? toast.success(message, { id }) : toast.success(message)),
	error: (message: string, id?: string | number) => (id ? toast.error(message, { id }) : toast.error(message)),
	dismiss: (id?: string | number) => (id ? toast.dismiss(id) : toast.dismiss()),
};

/**
 * Hook for debouncing function calls
 */
export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(callback: T, delay: number): T => {
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	return useCallback(
		(...args: Parameters<T>) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				callback(...args);
			}, delay);
		},
		[callback, delay]
	) as T;
};

/**
 * Hook for throttling function calls
 */
export const useThrottledCallback = <T extends (...args: unknown[]) => unknown>(callback: T, delay: number): T => {
	const lastCallRef = useRef<number>(0);
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	return useCallback(
		(...args: Parameters<T>) => {
			const now = Date.now();
			const timeSinceLastCall = now - lastCallRef.current;

			if (timeSinceLastCall >= delay) {
				lastCallRef.current = now;
				callback(...args);
			} else {
				if (timeoutRef.current) {
					clearTimeout(timeoutRef.current);
				}

				timeoutRef.current = setTimeout(() => {
					lastCallRef.current = Date.now();
					callback(...args);
				}, delay - timeSinceLastCall);
			}
		},
		[callback, delay]
	) as T;
};

/**
 * Utility for creating abort controllers for cancellable requests
 */
export const useAbortController = () => {
	const abortControllerRef = useRef<AbortController | null>(null);

	const createController = useCallback(() => {
		// Cancel previous request if still pending
		abortControllerRef.current?.abort();

		abortControllerRef.current = new AbortController();
		return abortControllerRef.current;
	}, []);

	const abort = useCallback(() => {
		if (abortControllerRef.current) {
			abortControllerRef.current.abort();
			abortControllerRef.current = null;
		}
	}, []);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
		};
	}, []);

	return { createController, abort };
};

/**
 * Utility for creating consistent mutation state objects
 */
export const createMutationState = <T>(data: T | null, error: Error | null, isLoading: boolean) => ({
	data,
	error,
	isLoading,
	isSuccess: !error && !isLoading && data !== null,
	isError: !!error,
	isIdle: !isLoading && !error && data === null,
});

/**
 * Utility for creating consistent query state objects
 */
export const createQueryState = <T>(data: T | null, error: Error | null, isLoading: boolean, isInitialized: boolean) => ({
	data,
	error,
	isLoading,
	isInitialized,
	isSuccess: !error && isInitialized && data !== null,
	isError: !!error,
	isEmpty: isInitialized && !isLoading && !error && data === null,
});

/**
 * Utility for validating required fields
 */
export const validateRequiredFields = <T extends object>(data: T, requiredFields: (keyof T)[]): string[] => {
	const errors: string[] = [];

	requiredFields.forEach(field => {
		const value = data[field];
		if (value == null || value === '') {
			errors.push(`${String(field)} is required`);
		}
	});

	return errors;
};

/**
 * Utility for formatting API errors consistently
 */
export const formatApiError = (error: unknown): { message: string; code?: string } => {
	if (error instanceof Error) {
		return {
			message: error.message,
			code: String((error as { code?: string | number }).code || ''),
		};
	}

	if (typeof error === 'object' && error !== null) {
		const errorObj = error as { message?: string; error?: string; code?: string | number };
		return {
			message: errorObj.message || errorObj.error || 'Unknown error occurred',
			code: String(errorObj.code),
		};
	}

	return {
		message: typeof error === 'string' ? error : 'Unknown error occurred',
	};
};

/**
 * Utility for creating consistent loading states with timeout
 */
export const useLoadingTimeout = (isLoading: boolean, timeoutMs = 30000, onTimeout?: VoidCallback) => {
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

	useEffect(() => {
		if (isLoading) {
			timeoutRef.current = setTimeout(() => {
				onTimeout?.();
			}, timeoutMs);
		} else {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
				timeoutRef.current = undefined;
			}
		}

		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [isLoading, timeoutMs, onTimeout]);
};

/**
 * Utility for creating retry logic
 */
export const createRetryLogic = <T>(asyncFn: AsyncCallback<T>, maxRetries = 3, retryDelay = 1000): AsyncCallback<T> => {
	return async () => {
		let lastError: Error;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await asyncFn();
			} catch (error) {
				lastError = error instanceof Error ? error : new Error(String(error));

				if (attempt < maxRetries) {
					await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
				}
			}
		}

		throw lastError!;
	};
};

/**
 * Utility for creating optimistic updates
 */
export const createOptimisticUpdate = <T>(currentData: T | null, optimisticData: T, updateFn: (current: T | null, optimistic: T) => T): T => {
	return updateFn(currentData, optimisticData);
};

/**
 * Utility for creating cache keys
 */
export const createCacheKey = (prefix: string, params?: Record<string, unknown>): string => {
	if (!params) return prefix;

	const sortedParams = Object.keys(params)
		.sort()
		.reduce(
			(acc, key) => {
				acc[key] = params[key];
				return acc;
			},
			{} as Record<string, unknown>
		);

	return `${prefix}:${JSON.stringify(sortedParams)}`;
};

/**
 * Utility for deep comparison of objects (for dependency arrays)
 */
export const deepEqual = (a: unknown, b: unknown): boolean => {
	if (a === b) return true;

	if (a == null || b == null) return false;

	if (typeof a !== typeof b) return false;

	if (typeof a !== 'object') return false;

	const keysA = Object.keys(a);
	const keysB = Object.keys(b);

	if (keysA.length !== keysB.length) return false;

	for (const key of keysA) {
		if (!keysB.includes(key)) return false;
		if (!deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) return false;
	}

	return true;
};

/**
 * Utility for creating stable references
 */
export const useStableCallback = <T extends (...args: unknown[]) => unknown>(callback: T): T => {
	const callbackRef = useRef<T>(callback);

	useEffect(() => {
		callbackRef.current = callback;
	});

	return useCallback((...args: Parameters<T>) => {
		return callbackRef.current(...args);
	}, []) as T;
};

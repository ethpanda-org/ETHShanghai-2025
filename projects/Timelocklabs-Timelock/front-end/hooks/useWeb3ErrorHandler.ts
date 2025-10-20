/**
 * Web3 error handling utilities
 * Provides standardized error handling patterns for Web3 operations
 */

'use client';

// React imports
import { useCallback, useMemo } from 'react';

// Internal hooks
import { createErrorMessage, createToastNotification } from './useHookUtils';

/**
 * Common Web3 error types and their user-friendly messages
 */
const WEB3_ERROR_PATTERNS = {
	// User rejection errors
	USER_REJECTED: {
		patterns: [/user rejected/i, /user denied/i, /user cancelled/i, /rejected by user/i, /transaction was rejected/i],
		message: 'Transaction was rejected by user',
		severity: 'warning' as const,
	},

	// Insufficient funds errors
	INSUFFICIENT_FUNDS: {
		patterns: [/insufficient funds/i, /insufficient balance/i, /not enough/i, /exceeds balance/i],
		message: 'Insufficient funds for this transaction',
		severity: 'error' as const,
	},

	// Gas-related errors
	GAS_LIMIT: {
		patterns: [/gas limit/i, /out of gas/i, /gas required exceeds/i, /intrinsic gas too low/i],
		message: 'Transaction failed due to gas limit. Try increasing the gas limit.',
		severity: 'error' as const,
	},

	GAS_PRICE: {
		patterns: [/gas price/i, /max fee per gas/i, /max priority fee/i, /gas too low/i],
		message: 'Gas price too low. Try increasing the gas price.',
		severity: 'error' as const,
	},

	// Network errors
	NETWORK_ERROR: {
		patterns: [/network error/i, /connection error/i, /timeout/i, /failed to fetch/i, /network request failed/i],
		message: 'Network error. Please check your connection and try again.',
		severity: 'error' as const,
	},

	// Contract errors
	CONTRACT_REVERT: {
		patterns: [/execution reverted/i, /revert/i, /contract call failed/i, /transaction failed/i],
		message: 'Transaction was reverted by the contract',
		severity: 'error' as const,
	},

	// Nonce errors
	NONCE_ERROR: {
		patterns: [/nonce/i, /transaction nonce is too low/i, /already known/i],
		message: 'Transaction nonce error. Please try again.',
		severity: 'error' as const,
	},

	// Wallet connection errors
	WALLET_NOT_CONNECTED: {
		patterns: [/wallet not connected/i, /no account/i, /connect wallet/i, /no provider/i],
		message: 'Please connect your wallet first',
		severity: 'warning' as const,
	},

	// Chain errors
	WRONG_CHAIN: {
		patterns: [/wrong chain/i, /unsupported chain/i, /switch network/i, /chain not supported/i],
		message: 'Please switch to the correct network',
		severity: 'warning' as const,
	},

	// Permission errors
	PERMISSION_DENIED: {
		patterns: [/permission denied/i, /unauthorized/i, /access denied/i, /not allowed/i],
		message: 'Permission denied for this operation',
		severity: 'error' as const,
	},
} as const;

/**
 * Configuration for Web3 error handling
 */
interface Web3ErrorHandlerConfig {
	/** Whether to show toast notifications for errors */
	showToasts?: boolean;
	/** Whether to log errors to console */
	logErrors?: boolean;
	/** Custom error message overrides */
	customMessages?: Record<string, string>;
}

/**
 * Parsed error information
 */
interface ParsedWeb3Error {
	/** Original error */
	originalError: unknown;
	/** Error type */
	type: keyof typeof WEB3_ERROR_PATTERNS | 'UNKNOWN';
	/** User-friendly message */
	message: string;
	/** Error severity */
	severity: 'error' | 'warning' | 'info';
	/** Whether this error should be retryable */
	isRetryable: boolean;
	/** Suggested actions for the user */
	suggestions?: string[];
}

/**
 * Hook for handling Web3 errors with standardized patterns
 *
 * @param config Optional configuration for error handling
 * @returns Object containing error handling utilities
 */
export function useWeb3ErrorHandler(config: Web3ErrorHandlerConfig = {}) {
	const { showToasts = true, logErrors = true, customMessages = {} } = config;

	/**
	 * Parse Web3 error and extract meaningful information
	 */
	const parseError = useCallback(
		(error: unknown): ParsedWeb3Error => {
			const errorMessage = createErrorMessage(error);
			// Check against known error patterns
			for (const [type, errorConfig] of Object.entries(WEB3_ERROR_PATTERNS)) {
				const isMatch = errorConfig.patterns.some(pattern => pattern.test(errorMessage));

				if (isMatch) {
					const customMessage = customMessages[type];
					const message = customMessage || errorConfig.message;

					return {
						originalError: error,
						type: type as keyof typeof WEB3_ERROR_PATTERNS,
						message,
						severity: errorConfig.severity,
						isRetryable: getRetryability(type as keyof typeof WEB3_ERROR_PATTERNS),
						suggestions: getSuggestions(type as keyof typeof WEB3_ERROR_PATTERNS),
					};
				}
			}

			// Unknown error
			return {
				originalError: error,
				type: 'UNKNOWN',
				message: errorMessage,
				severity: 'error',
				isRetryable: false,
			};
		},
		[customMessages]
	);

	/**
	 * Handle Web3 error with appropriate user feedback
	 */
	const handleError = useCallback(
		(error: unknown, context?: string): ParsedWeb3Error => {
			const parsedError = parseError(error);

			// Log error if enabled
			if (logErrors) {
				console.error(`Web3 Error${context ? ` (${context})` : ''}:`, {
					type: parsedError.type,
					message: parsedError.message,
					originalError: parsedError.originalError,
				});
			}

			// Show toast notification if enabled
			if (showToasts) {
				const toastMessage = context ? `${context}: ${parsedError.message}` : parsedError.message;

				if (parsedError.severity === 'error') {
					createToastNotification.error(toastMessage);
				} else if (parsedError.severity === 'warning') {
					createToastNotification.error(toastMessage); // Use error toast for warnings too
				}
			}

			return parsedError;
		},
		[parseError, logErrors, showToasts]
	);

	/**
	 * Create error handler for async operations
	 */
	const createErrorHandler = useCallback(
		(context: string) => {
			return (error: unknown) => handleError(error, context);
		},
		[handleError]
	);

	/**
	 * Wrap async function with error handling
	 */
	const withErrorHandling = useCallback(
		<T>(asyncFn: () => Promise<T>, context?: string): Promise<T> => {
			return asyncFn().catch(error => {
				const parsedError = handleError(error, context);
				throw new Error(parsedError.message);
			});
		},
		[handleError]
	);

	/**
	 * Check if error is retryable
	 */
	const isRetryableError = useCallback(
		(error: unknown): boolean => {
			const parsedError = parseError(error);
			return parsedError.isRetryable;
		},
		[parseError]
	);

	/**
	 * Get error suggestions
	 */
	const getErrorSuggestions = useCallback(
		(error: unknown): string[] => {
			const parsedError = parseError(error);
			return parsedError.suggestions || [];
		},
		[parseError]
	);

	/**
	 * Format error for display
	 */
	const formatErrorForDisplay = useCallback(
		(error: unknown): string => {
			const parsedError = parseError(error);
			return parsedError.message;
		},
		[parseError]
	);

	// Memoize error type checkers
	const errorCheckers = useMemo(
		() => ({
			isUserRejection: (error: unknown) => parseError(error).type === 'USER_REJECTED',
			isInsufficientFunds: (error: unknown) => parseError(error).type === 'INSUFFICIENT_FUNDS',
			isGasError: (error: unknown) => {
				const type = parseError(error).type;
				return type === 'GAS_LIMIT' || type === 'GAS_PRICE';
			},
			isNetworkError: (error: unknown) => parseError(error).type === 'NETWORK_ERROR',
			isContractError: (error: unknown) => parseError(error).type === 'CONTRACT_REVERT',
			isWalletError: (error: unknown) => {
				const type = parseError(error).type;
				return type === 'WALLET_NOT_CONNECTED' || type === 'WRONG_CHAIN';
			},
		}),
		[parseError]
	);

	return {
		// Core error handling
		parseError,
		handleError,
		createErrorHandler,
		withErrorHandling,

		// Error analysis
		isRetryableError,
		getErrorSuggestions,
		formatErrorForDisplay,

		// Error type checkers
		...errorCheckers,
	};
}

/**
 * Get retryability for error type
 */
function getRetryability(errorType: keyof typeof WEB3_ERROR_PATTERNS): boolean {
	const retryableErrors: (keyof typeof WEB3_ERROR_PATTERNS)[] = ['NETWORK_ERROR', 'GAS_PRICE', 'NONCE_ERROR'];

	return retryableErrors.includes(errorType);
}

/**
 * Get suggestions for error type
 */
function getSuggestions(errorType: keyof typeof WEB3_ERROR_PATTERNS): string[] {
	const suggestions: Record<keyof typeof WEB3_ERROR_PATTERNS, string[]> = {
		USER_REJECTED: ['Try the transaction again', 'Make sure you want to proceed with the transaction'],
		INSUFFICIENT_FUNDS: ['Add more funds to your wallet', 'Reduce the transaction amount', 'Check if you have enough ETH for gas fees'],
		GAS_LIMIT: ['Increase the gas limit', 'Try again with a higher gas limit', 'Contact support if the issue persists'],
		GAS_PRICE: ['Increase the gas price', 'Wait for network congestion to reduce', 'Try again later'],
		NETWORK_ERROR: ['Check your internet connection', 'Try refreshing the page', 'Switch to a different RPC endpoint'],
		CONTRACT_REVERT: ['Check the contract requirements', 'Verify your transaction parameters', 'Contact the contract developer'],
		NONCE_ERROR: ['Try the transaction again', 'Reset your wallet if the issue persists'],
		WALLET_NOT_CONNECTED: ['Connect your wallet', 'Refresh the page and try again'],
		WRONG_CHAIN: ['Switch to the correct network', 'Check the required network in your wallet'],
		PERMISSION_DENIED: ['Check your wallet permissions', 'Make sure you have the required access'],
	};

	return suggestions[errorType] || [];
}

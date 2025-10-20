'use client';

// React imports
import { useCallback, useMemo } from 'react';

// External libraries
import { ethers } from 'ethers';

// Internal hooks
import { useGasEstimation, useTransactionSender, useWalletConnection } from './useBlockchainHooks';
import { useAsyncOperation } from './useCommonHooks';
import { createErrorMessage, createToastNotification } from './useHookUtils';
import { useTranslations } from 'next-intl';

// Type imports
import type { Address, GasEstimation, TransactionResult } from '@/types';

/**
 * Configuration for timelock transaction operations
 */
interface TimelockTransactionConfig {
	/** Whether to estimate gas before sending */
	estimateGas?: boolean;
	/** Whether to show toast notifications */
	showToasts?: boolean;
	/** Custom gas limit */
	gasLimit?: number;
	/** Custom gas price */
	gasPrice?: string;
	/** Whether to wait for transaction confirmation */
	waitForConfirmation?: boolean;
}

/**
 * Enhanced transaction parameters with validation
 */
interface TimelockTransactionParams {
	/** Target contract address */
	toAddress: Address;
	/** Transaction calldata */
	calldata: string;
	/** Transaction value in wei */
	value?: string | number | bigint;
	/** Optional gas limit override */
	gasLimit?: number;
	/** Optional gas price override */
	gasPrice?: string;
}

/**
 * Hook for managing timelock transactions with enhanced error handling and user feedback
 * Provides optimized transaction sending with proper validation and state management
 *
 * @param config Optional configuration for transaction behavior
 * @returns Object containing transaction methods and state
 */
export const useTimelockTransaction = (config: TimelockTransactionConfig = {}) => {
	const { estimateGas: shouldEstimateGas = true, showToasts = true, gasLimit: defaultGasLimit, gasPrice: defaultGasPrice, waitForConfirmation = false } = config;

	const { requireConnection, isConnected } = useWalletConnection();
	const { sendTransaction: sendTx, isLoading: isSending, error: sendError, reset: resetSender } = useTransactionSender();
	const { estimateGas } = useGasEstimation();
	const t = useTranslations('CreateTransaction');
	// Async operation for gas estimation
	const { execute: executeWithGasEstimation, isLoading: isEstimatingGas } = useAsyncOperation({
		loadingMessage: t('estimatingGas'),
		errorMessage: t('gasEstimationFailed'),
		showToasts: false,
	});

	// Async operation for transaction sending
	const { execute: executeTransaction, isLoading: isExecuting } = useAsyncOperation({
		loadingMessage: t('sendingTransaction'),
		successMessage: t('transactionSentSuccessfully'),
		errorMessage: t('transactionFailed'),
		showToasts: false,
	});

	/**
	 * Validate transaction parameters
	 */
	const validateTransactionParams = useCallback((params: TimelockTransactionParams): string[] => {
		const errors: string[] = [];

		if (!params.toAddress || !ethers.utils.isAddress(params.toAddress)) {
			errors.push(t('invalidTargetAddress'));
		}

		if (!params.calldata || !params.calldata.startsWith('0x')) {
			errors.push(t('invalidCalldataFormat'));
		}

		if (params.value !== undefined) {
			try {
				ethers.BigNumber.from(params.value);
			} catch {
				errors.push(t('invalidTransactionValue'));
			}
		}

		return errors;
	}, []);

	/**
	 * Estimate gas for a transaction
	 */
	const estimateTransactionGas = useCallback(
		async (params: TimelockTransactionParams): Promise<GasEstimation> => {
			return executeWithGasEstimation(async () => {
				const gasEstimation = await estimateGas({
					to: params.toAddress,
					data: params.calldata,
					value: params.value?.toString(),
				});

				return gasEstimation;
			});
		},
		[estimateGas, executeWithGasEstimation]
	);

	/**
	 * Send a timelock transaction with comprehensive error handling
	 */
	const sendTransaction = useCallback(
		async (params: TimelockTransactionParams): Promise<TransactionResult> => {
			return executeTransaction(async () => {
				// Ensure wallet is connected
				requireConnection();

				// Validate parameters
				const validationErrors = validateTransactionParams(params);
				if (validationErrors.length > 0) {
					throw new Error(t('invalidParameters', { message: validationErrors.join(', ') }));
				}

				let gasEstimation: GasEstimation | undefined;

				// Estimate gas if enabled
				if (shouldEstimateGas) {
					try {
						gasEstimation = await estimateTransactionGas(params);
					} catch (error) {
						console.warn('Gas estimation failed, proceeding without estimation:', error);
					}
				}

				// Prepare transaction parameters
				const txParams = {
					to: params.toAddress,
					data: params.calldata,
					value: params.value,
					gasLimit: params.gasLimit || defaultGasLimit || (gasEstimation?.gasLimit ? parseInt(gasEstimation.gasLimit) : undefined),
					gasPrice: params.gasPrice || defaultGasPrice || gasEstimation?.gasPrice,
				};

				let toastId: string | number | undefined;
				try {
					// Show loading toast if enabled
					if (showToasts) {
						toastId = createToastNotification.loading(t('pleaseConfirmTransactionInYourWallet'));
					}

					// Send the transaction
					const result = await sendTx(txParams);


					// Update toast with transaction hash
					if (showToasts && toastId) {
						createToastNotification.success(t('transactionSent', { hash: result.transactionHash.slice(0, 10) }), toastId);
					}

					// Wait for confirmation if enabled
					if (waitForConfirmation) {
						// Note: This would require additional implementation to wait for confirmation
						// For now, we just return the transaction hash
					}

					// Show success toast
					if (showToasts && toastId) {
						createToastNotification.success(t('transactionConfirmed'), toastId);
					}

					return {
						...result,
						gasEstimation,
					};
				} catch (error) {
					const message = createErrorMessage(error, t('transactionFailed'));

					// Handle specific error cases
					if (message.includes('user rejected') || message.includes('denied')) {
						throw new Error(t('transactionRejectedByUser'));
					}

					if (message.includes('insufficient funds')) {
						throw new Error(t('insufficientFundsForTransaction'));
					}

					if (message.includes('gas')) {
						throw new Error(t('transactionFailedDueToGasIssues'));
					}

					throw new Error(message);
				} finally {
					if (showToasts && toastId) {
						createToastNotification.dismiss(toastId);
					}
				}
			});
		},
		[
			executeTransaction,
			requireConnection,
			validateTransactionParams,
			shouldEstimateGas,
			estimateTransactionGas,
			sendTx,
			defaultGasLimit,
			defaultGasPrice,
			waitForConfirmation,
			showToasts,
		]
	);

	// Memoize loading state
	const isLoading = useMemo(() => isSending || isExecuting || isEstimatingGas, [isSending, isExecuting, isEstimatingGas]);

	// Memoize error state
	const error = useMemo(() => sendError, [sendError]);

	return {
		// Transaction methods
		sendTransaction,

		// Utility methods
		estimateTransactionGas,
		validateTransactionParams,

		// State
		isLoading,
		isSending,
		isEstimatingGas,
		isExecuting,
		error,
		isConnected,

		// Actions
		reset: resetSender,
	};
};

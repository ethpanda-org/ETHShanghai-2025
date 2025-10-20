/**
 * Hook for managing async operations with toast notifications
 */

'use client';

import { useCallback } from 'react';
import { createToastNotification } from '../useHookUtils';
import { useLoadingState } from './useLoadingState';
import type { AsyncCallback } from '@/types';

export function useAsyncOperation(
	options: {
		loadingMessage?: string;
		successMessage?: string;
		errorMessage?: string;
		showToasts?: boolean;
	} = {}
) {
	const { loadingMessage = 'Processing...', successMessage = 'Operation completed successfully', errorMessage = 'Operation failed', showToasts = true } = options;

	const { isLoading, error, withLoading, reset } = useLoadingState();

	const execute = useCallback(
		async <T>(
			asyncFn: AsyncCallback<T>,
			customMessages?: {
				loading?: string;
				success?: string;
				error?: string;
			}
		): Promise<T> => {
			const messages = {
				loading: customMessages?.loading || loadingMessage,
				success: customMessages?.success || successMessage,
				error: customMessages?.error || errorMessage,
			};

			let toastId: string | number | undefined;

			try {
				if (showToasts) {
					toastId = createToastNotification.loading(messages.loading);
				}

				const result = await withLoading(asyncFn);

				if (showToasts && toastId) {
					createToastNotification.success(messages.success, toastId);
				}

				return result;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : messages.error;

				if (showToasts && toastId) {
					createToastNotification.error(errorMsg, toastId);
				}

				throw err;
			}
		},
		[withLoading, loadingMessage, successMessage, errorMessage, showToasts]
	);

	return {
		execute,
		isLoading,
		error,
		reset,
	};
}

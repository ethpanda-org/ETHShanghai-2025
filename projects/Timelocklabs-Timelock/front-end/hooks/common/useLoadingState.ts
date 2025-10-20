/**
 * Hook for managing loading states with error handling
 */

'use client';

import { useState, useCallback } from 'react';
import type { VoidCallback, AsyncCallback, LoadingState } from '@/types';
import { createErrorMessage } from '../useHookUtils';

export function useLoadingState(initialLoading = false): LoadingState & {
	setLoading: (loading: boolean) => void;
	setError: (error: Error | null) => void;
	reset: VoidCallback;
	withLoading: <T>(asyncFn: AsyncCallback<T>) => Promise<T>;
} {
	const [isLoading, setIsLoading] = useState(initialLoading);
	const [error, setError] = useState<Error | null>(null);

	const setLoading = useCallback((loading: boolean) => {
		setIsLoading(loading);
		if (loading) {
			setError(null); // Clear error when starting new operation
		}
	}, []);

	const reset = useCallback(() => {
		setIsLoading(false);
		setError(null);
	}, []);

	const withLoading = useCallback(
		async <T>(asyncFn: AsyncCallback<T>): Promise<T> => {
			setLoading(true);
			try {
				const result = await asyncFn();
				return result;
			} catch (err) {
				const errorMessage = createErrorMessage(err);
				setError(new Error(errorMessage));
				throw errorMessage;
			} finally {
				setIsLoading(false);
			}
		},
		[setLoading]
	);

	return {
		isLoading,
		error,
		setLoading,
		setError,
		reset,
		withLoading,
	};
}

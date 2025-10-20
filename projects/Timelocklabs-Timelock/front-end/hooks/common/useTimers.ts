/**
 * Timer-related utility hooks
 */

'use client';

import { useEffect, useRef } from 'react';
import type { VoidCallback } from '@/types';

/**
 * Hook for managing interval
 */
export function useInterval(callback: VoidCallback, delay: number | null) {
	const savedCallback = useRef<VoidCallback | undefined>(undefined);

	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		if (delay === null) return;

		const tick = () => {
			savedCallback.current?.();
		};

		const id = setInterval(tick, delay);
		return () => clearInterval(id);
	}, [delay]);
}

/**
 * Hook for managing timeout
 */
export function useTimeout(callback: VoidCallback, delay: number) {
	const savedCallback = useRef<VoidCallback | undefined>(undefined);

	useEffect(() => {
		savedCallback.current = callback;
	}, [callback]);

	useEffect(() => {
		const tick = () => {
			savedCallback.current?.();
		};

		const id = setTimeout(tick, delay);
		return () => clearTimeout(id);
	}, [delay]);
}

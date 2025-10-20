/**
 * Utility hooks for state management
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { VoidCallback } from '@/types';

/**
 * Hook for debouncing values
 */
export function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

/**
 * Hook for managing previous value
 */
export function usePrevious<T>(value: T): T | undefined {
	const ref = useRef<T | undefined>(undefined);

	useEffect(() => {
		ref.current = value;
	});

	return ref.current;
}

/**
 * Hook for managing boolean toggle state
 */
export function useToggle(initialValue = false): [boolean, VoidCallback, VoidCallback, VoidCallback] {
	const [value, setValue] = useState(initialValue);

	const toggle = useCallback(() => setValue(prev => !prev), []);
	const setTrue = useCallback(() => setValue(true), []);
	const setFalse = useCallback(() => setValue(false), []);

	return [value, toggle, setTrue, setFalse];
}

/**
 * Hook for managing counter state
 */
export function useCounter(initialValue = 0, step = 1) {
	const [count, setCount] = useState(initialValue);

	const increment = useCallback(() => setCount(prev => prev + step), [step]);
	const decrement = useCallback(() => setCount(prev => prev - step), [step]);
	const reset = useCallback(() => setCount(initialValue), [initialValue]);
	const set = useCallback((value: number) => setCount(value), []);

	return {
		count,
		increment,
		decrement,
		reset,
		set,
	};
}

/**
 * Hook for managing array state with common operations
 */
export function useArray<T>(initialArray: T[] = []) {
	const [array, setArray] = useState<T[]>(initialArray);

	const push = useCallback((element: T) => {
		setArray(prev => [...prev, element]);
	}, []);

	const filter = useCallback((callback: (item: T, index: number) => boolean) => {
		setArray(prev => prev.filter(callback));
	}, []);

	const update = useCallback((index: number, newElement: T) => {
		setArray(prev => prev.map((item, i) => (i === index ? newElement : item)));
	}, []);

	const remove = useCallback((index: number) => {
		setArray(prev => prev.filter((_, i) => i !== index));
	}, []);

	const clear = useCallback(() => {
		setArray([]);
	}, []);

	const reset = useCallback(() => {
		setArray(initialArray);
	}, [initialArray]);

	return {
		array,
		set: setArray,
		push,
		filter,
		update,
		remove,
		clear,
		reset,
	};
}

/**
 * Hook for managing local storage with type safety
 */

'use client';

import { useState, useCallback } from 'react';
import type { VoidCallback } from '@/types';

export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void, VoidCallback] {
	const [storedValue, setStoredValue] = useState<T>(() => {
		if (typeof window === 'undefined') {
			return defaultValue;
		}

		try {
			const item = window.localStorage.getItem(key);
			return item ? JSON.parse(item) : defaultValue;
		} catch (error) {
			console.warn(`Error reading localStorage key "${key}":`, error);
			return defaultValue;
		}
	});

	const setValue = useCallback(
		(value: T | ((prev: T) => T)) => {
			try {
				const valueToStore = value instanceof Function ? value(storedValue) : value;
				setStoredValue(valueToStore);

				if (typeof window !== 'undefined') {
					window.localStorage.setItem(key, JSON.stringify(valueToStore));
				}
			} catch (error) {
				console.warn(`Error setting localStorage key "${key}":`, error);
			}
		},
		[key, storedValue]
	);

	const removeValue = useCallback(() => {
		try {
			setStoredValue(defaultValue);
			if (typeof window !== 'undefined') {
				window.localStorage.removeItem(key);
			}
		} catch (error) {
			console.warn(`Error removing localStorage key "${key}":`, error);
		}
	}, [key, defaultValue]);

	return [storedValue, setValue, removeValue];
}

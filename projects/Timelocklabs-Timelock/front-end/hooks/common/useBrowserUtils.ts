/**
 * Browser-related utility hooks
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for managing clipboard operations
 */
export function useClipboard() {
	const [copiedText, setCopiedText] = useState<string | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	const copy = useCallback(async (text: string) => {
		if (!navigator?.clipboard) {
			console.warn('Clipboard not supported');
			return false;
		}

		try {
			await navigator.clipboard.writeText(text);
			setCopiedText(text);
			setIsCopied(true);

			// Reset copied state after 2 seconds
			setTimeout(() => setIsCopied(false), 2000);

			return true;
		} catch (error) {
			console.warn('Copy failed:', error);
			setIsCopied(false);
			return false;
		}
	}, []);

	const paste = useCallback(async (): Promise<string | null> => {
		if (!navigator?.clipboard) {
			console.warn('Clipboard not supported');
			return null;
		}

		try {
			const text = await navigator.clipboard.readText();
			return text;
		} catch (error) {
			console.warn('Paste failed:', error);
			return null;
		}
	}, []);

	return {
		copy,
		paste,
		copiedText,
		isCopied,
	};
}

/**
 * Hook for handling clicks outside of a specified element
 */
export function useClickOutside<T extends HTMLElement>(ref: React.RefObject<T | null>, handler: () => void) {
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (ref.current && !ref.current.contains(event.target as Node)) {
				handler();
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [ref, handler]);
}

/**
 * Hook for managing media queries
 */
export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const media = window.matchMedia(query);
		setMatches(media.matches);

		const listener = (event: MediaQueryListEvent) => {
			setMatches(event.matches);
		};

		media.addEventListener('change', listener);
		return () => media.removeEventListener('change', listener);
	}, [query]);

	return matches;
}

/**
 * Hook for managing window size
 */
export function useWindowSize() {
	const [windowSize, setWindowSize] = useState<{
		width: number | undefined;
		height: number | undefined;
	}>({
		width: undefined,
		height: undefined,
	});

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const handleResize = () => {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight,
			});
		};

		window.addEventListener('resize', handleResize);
		handleResize(); // Set initial size

		return () => window.removeEventListener('resize', handleResize);
	}, []);

	return windowSize;
}

/**
 * Hook for managing document title
 */
export function useDocumentTitle(title: string) {
	useEffect(() => {
		if (typeof document !== 'undefined') {
			const previousTitle = document.title;
			document.title = title;

			return () => {
				document.title = previousTitle;
			};
		}
		return undefined;
	}, [title]);
}

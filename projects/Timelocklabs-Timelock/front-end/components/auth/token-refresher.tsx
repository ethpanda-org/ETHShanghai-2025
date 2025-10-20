'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/userStore';

export function TokenRefresher() {
	const { expiresAt, refreshToken, refreshAccessToken, isAuthenticated } = useAuthStore();
	const timerRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		if (!isAuthenticated || !refreshToken || !expiresAt) {
			// Clear any existing timer if not authenticated or tokens are missing
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			return;
		}

		const scheduleRefresh = () => {
			const expirationTime = new Date(expiresAt).getTime();
			const now = Date.now();
			// Refresh 1 minute before expiration
			const timeUntilRefresh = expirationTime - now - 60 * 1000;

			if (timeUntilRefresh > 0) {
				timerRef.current = setTimeout(() => {
					refreshAccessToken();
				}, timeUntilRefresh);
			} else {
				// If already expired or very close, refresh immediately
				refreshAccessToken();
			}
		};

		scheduleRefresh();

		// Cleanup function to clear the timer when component unmounts or dependencies change
		return () => {
			if (timerRef.current) {
				clearTimeout(timerRef.current);
				timerRef.current = null;
			}
		};
	}, [expiresAt, refreshToken, refreshAccessToken, isAuthenticated]);

	return null; // This component doesn't render anything visible
}

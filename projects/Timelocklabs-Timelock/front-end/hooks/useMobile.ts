/**
 * Mobile device detection hook
 * Provides utilities for detecting mobile devices and responsive breakpoints
 */

'use client';

import { useState, useEffect } from 'react';
import { useMediaQuery } from './useCommonHooks';

/**
 * Default mobile breakpoint in pixels
 */
const MOBILE_BREAKPOINT = 768;

/**
 * Configuration for mobile detection
 */
interface MobileDetectionConfig {
	/** Custom breakpoint in pixels */
	breakpoint?: number;
	/** Whether to use server-side safe detection */
	serverSafe?: boolean;
}

/**
 * Hook for detecting mobile devices with customizable breakpoints
 *
 * @param config Optional configuration for mobile detection
 * @returns Boolean indicating if the current viewport is mobile
 */
export function useIsMobile(config: MobileDetectionConfig = {}): boolean {
	const { breakpoint = MOBILE_BREAKPOINT } = config;
	const [isMobile, setIsMobile] = useState<boolean>(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const mediaQuery = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);

		const handleChange = () => {
			setIsMobile(window.innerWidth < breakpoint);
		};

		// Set initial value
		handleChange();

		// Listen for changes
		mediaQuery.addEventListener('change', handleChange);

		return () => {
			mediaQuery.removeEventListener('change', handleChange);
		};
	}, [breakpoint]);

	return !!isMobile;
}

/**
 * Hook for detecting tablet devices
 *
 * @returns Boolean indicating if the current viewport is tablet size
 */
export function useIsTablet(): boolean {
	return useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
}

/**
 * Hook for detecting desktop devices
 *
 * @returns Boolean indicating if the current viewport is desktop size
 */
export function useIsDesktop(): boolean {
	return useMediaQuery('(min-width: 1024px)');
}

/**
 * Hook for getting current device type
 *
 * @returns Object containing device type information
 */
export function useDeviceType() {
	const isMobile = useIsMobile();
	const isTablet = useIsTablet();
	const isDesktop = useIsDesktop();

	return {
		isMobile,
		isTablet,
		isDesktop,
		deviceType:
			isMobile ? 'mobile'
			: isTablet ? 'tablet'
			: 'desktop',
	};
}

/**
 * Hook for responsive values based on device type
 *
 * @param values Object containing values for different device types
 * @returns Value for the current device type
 */
export function useResponsiveValue<T>(values: { mobile: T; tablet?: T; desktop: T }): T {
	const { isMobile, isTablet } = useDeviceType();

	if (isMobile) return values.mobile;
	if (isTablet && values.tablet !== undefined) return values.tablet;
	return values.desktop;
}

/**
 * Hook for touch device detection
 *
 * @returns Boolean indicating if the device supports touch
 */
export function useIsTouchDevice(): boolean {
	const [isTouch, setIsTouch] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;

		const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
		setIsTouch(hasTouch);
	}, []);

	return isTouch;
}

// Re-export for backward compatibility
export { useIsMobile as default };

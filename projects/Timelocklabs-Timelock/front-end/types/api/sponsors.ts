/**
 * Sponsors API types
 */

import type { Partner } from '@/types';

export interface SponsorsData {
	sponsors: Partner[];
	partners: Partner[];
}

/**
 * Sponsors API response wrapper
 */
export interface SponsorsApiResponse {
	data: SponsorsData;
	success: boolean;
}

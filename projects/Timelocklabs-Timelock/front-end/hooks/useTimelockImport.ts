'use client';

// React imports
import { useCallback, useMemo, useState } from 'react';

// External libraries
import { ethers } from 'ethers';

// Internal hooks
import { useAsyncOperation } from '@/hooks/useCommonHooks';
import { useContractValidation, useWalletConnection } from '@/hooks/useBlockchainHooks';
import { createErrorMessage, useAbortController } from '@/hooks/useHookUtils';
import { useWeb3React } from '@/hooks/useWeb3React';

// Type imports
import type { Address, ContractStandard, TimelockParameters } from '@/types';

// Re-export types for backward compatibility
export type { TimelockParameters };

/**
 * Contract ABIs for different timelock standards
 */
const TIMELOCK_ABIS = {
	compound: [
		'function admin() view returns (address)',
		'function pendingAdmin() view returns (address)',
		'function delay() view returns (uint256)',
		'function GRACE_PERIOD() view returns (uint256)',
		'function MINIMUM_DELAY() view returns (uint256)',
		'function MAXIMUM_DELAY() view returns (uint256)',
		'function queuedTransactions(bytes32) view returns (bool)',
	],
	openzeppelin: [
		// TODO: Add OpenZeppelin timelock ABI when implemented
		'function hasRole(bytes32, address) view returns (bool)',
		'function getMinDelay() view returns (uint256)',
	],
} as const;

/**
 * Configuration for timelock import operations
 */
interface TimelockImportConfig {
	/** Whether to cache parameters in component state */
	cacheParameters?: boolean;
	/** Whether to show toast notifications */
	showToasts?: boolean;
	/** Timeout for contract calls in milliseconds */
	timeout?: number;
}

/**
 * Hook for importing and analyzing timelock contracts with enhanced validation
 * Provides optimized contract analysis with proper error handling and caching
 *
 * @param config Optional configuration for import behavior
 * @returns Object containing import methods and state
 */
export const useTimelockImport = (config: TimelockImportConfig = {}) => {
	const { cacheParameters = true, showToasts = true, timeout = 10000 } = config;

	const [parameters, setParameters] = useState<TimelockParameters | null>(null);
	const { provider } = useWeb3React();
	const { isConnected } = useWalletConnection();
	const { validateContract, getContractInfo } = useContractValidation();
	const { createController, abort } = useAbortController();

	// Async operations with proper error handling
	const { execute: executeValidation, isLoading: isValidating } = useAsyncOperation({
		loadingMessage: 'Validating contract...',
		errorMessage: 'Contract validation failed',
		showToasts,
	});

	const { execute: executeParameterFetch, isLoading: isFetching } = useAsyncOperation({
		loadingMessage: 'Fetching contract parameters...',
		errorMessage: 'Failed to fetch parameters',
		showToasts,
	});

	/**
	 * Detect timelock standard by checking contract functions
	 */
	const detectTimelockStandard = useCallback(
		async (contractAddress: Address): Promise<ContractStandard | null> => {
			if (!provider) {
				throw new Error('Provider not available');
			}

			const controller = createController();

			try {
				// Check if contract exists
				const contractInfo = await getContractInfo(contractAddress);
				if (!contractInfo.hasCode) {
					return null;
				}

				// Try Compound timelock first
				try {
					const compoundValidation = await validateContract(contractAddress, [...TIMELOCK_ABIS.compound]);
					if (compoundValidation.isValid) {
						return 'compound';
					}
				} catch (error) {
					console.debug('Compound validation failed:', error);
				}

				// Try OpenZeppelin timelock (when implemented)
				try {
					const ozValidation = await validateContract(contractAddress, [...TIMELOCK_ABIS.openzeppelin]);
					if (ozValidation.isValid) {
						return 'openzeppelin';
					}
				} catch (error) {
					console.debug('OpenZeppelin validation failed:', error);
				}

				return null;
			} catch (error) {
				if (controller.signal.aborted) {
					throw new Error('Operation was cancelled');
				}
				throw error;
			}
		},
		[provider, createController, getContractInfo, validateContract]
	);

	/**
	 * Get Compound timelock parameters with timeout protection
	 */
	const getCompoundParameters = useCallback(
		async (contractAddress: Address): Promise<Partial<TimelockParameters>> => {
			if (!provider) {
				throw new Error('Provider not available');
			}

			const contract = new ethers.Contract(contractAddress, [...TIMELOCK_ABIS.compound], provider);
			const controller = createController();

			try {
				// Create timeout promise
				const timeoutPromise = new Promise((_, reject) => {
					setTimeout(() => reject(new Error('Contract call timeout')), timeout);
				});

				// Fetch parameters with timeout protection
				const parametersPromise = Promise.all([
					contract.admin(),
					contract.pendingAdmin(),
					contract.delay(),
					contract.GRACE_PERIOD().catch(() => ethers.BigNumber.from(14 * 24 * 60 * 60)), // Default 14 days
					contract.MINIMUM_DELAY().catch(() => ethers.BigNumber.from(2 * 24 * 60 * 60)), // Default 2 days
					contract.MAXIMUM_DELAY().catch(() => ethers.BigNumber.from(30 * 24 * 60 * 60)), // Default 30 days
				]);

				const [admin, pendingAdmin, delay, gracePeriod, minDelay, maxDelay] = (await Promise.race([parametersPromise, timeoutPromise])) as [
					string,
					string,
					ethers.BigNumber,
					ethers.BigNumber,
					ethers.BigNumber,
					ethers.BigNumber,
				];

				if (controller.signal.aborted) {
					throw new Error('Operation was cancelled');
				}

				return {
					admin,
					pendingAdmin: pendingAdmin === ethers.constants.AddressZero ? undefined : pendingAdmin,
					minDelay: delay.toNumber(),
					gracePeriod: gracePeriod.toNumber(),
					minimumDelay: minDelay.toNumber(),
					maximumDelay: maxDelay.toNumber(),
				};
			} catch (error) {
				if (controller.signal.aborted) {
					throw new Error('Operation was cancelled');
				}

				const message = createErrorMessage(error, 'Failed to fetch Compound parameters');
				console.error('Error getting Compound parameters:', error);
				throw new Error(message);
			}
		},
		[provider, createController, timeout]
	);

	/**
	 * Get OpenZeppelin timelock parameters (placeholder for future implementation)
	 */
	const getOpenZeppelinParameters = useCallback(async (): Promise<Partial<TimelockParameters>> => {
		// TODO: Implement OpenZeppelin parameter fetching
		throw new Error('OpenZeppelin timelock import not yet implemented');
	}, []);

	/**
	 * Fetch timelock parameters from blockchain with comprehensive validation
	 */
	const fetchTimelockParameters = useCallback(
		async (contractAddress: Address): Promise<TimelockParameters> => {
			return executeParameterFetch(async () => {
				// Validate address format
				if (!ethers.utils.isAddress(contractAddress)) {
					throw new Error('Invalid contract address format');
				}

				// Detect timelock standard
				const standard = await executeValidation(async () => {
					return detectTimelockStandard(contractAddress);
				});

				if (!standard) {
					const result: TimelockParameters = {
						isValid: false,
						standard: null,
						contractAddress,
						minDelay: 0,
						error: 'Contract is not a recognized timelock standard',
					};

					if (cacheParameters) {
						setParameters(result);
					}

					return result;
				}

				// Fetch parameters based on standard
				let params: Partial<TimelockParameters>;

				try {
					if (standard === 'compound') {
						params = await getCompoundParameters(contractAddress);
					} else if (standard === 'openzeppelin') {
						params = await getOpenZeppelinParameters();
					} else {
						throw new Error(`Unsupported timelock standard: ${standard}`);
					}
				} catch (error) {
					const result: TimelockParameters = {
						isValid: false,
						standard,
						contractAddress,
						minDelay: 0,
						error: createErrorMessage(error, 'Failed to fetch timelock parameters'),
					};

					if (cacheParameters) {
						setParameters(result);
					}

					return result;
				}

				// Create successful result
				const result: TimelockParameters = {
					isValid: true,
					standard,
					contractAddress,
					minDelay: params.minDelay || 0,
					...params,
				};

				if (cacheParameters) {
					setParameters(result);
				}

				return result;
			});
		},
		[executeParameterFetch, executeValidation, detectTimelockStandard, getCompoundParameters, getOpenZeppelinParameters, cacheParameters]
	);

	/**
	 * Validate contract address and check if it's a contract
	 */
	const validateContractAddress = useCallback(
		async (address: Address): Promise<boolean> => {
			try {
				if (!ethers.utils.isAddress(address)) {
					return false;
				}

				if (!provider) {
					throw new Error('Provider not available');
				}

				const contractInfo = await getContractInfo(address);
				return contractInfo.hasCode;
			} catch (error) {
				console.error('Error validating contract address:', error);
				return false;
			}
		},
		[provider, getContractInfo]
	);

	/**
	 * Check if a specific timelock standard is supported
	 */
	const isStandardSupported = useCallback((standard: ContractStandard): boolean => {
		return standard === 'compound'; // Only Compound is currently supported
	}, []);

	/**
	 * Get supported timelock standards
	 */
	const getSupportedStandards = useCallback((): ContractStandard[] => {
		return ['compound']; // Only Compound is currently supported
	}, []);

	/**
	 * Clear stored parameters and reset state
	 */
	const clearParameters = useCallback(() => {
		setParameters(null);
		abort(); // Cancel any pending operations
	}, [abort]);

	/**
	 * Refresh parameters for the current contract
	 */
	const refreshParameters = useCallback(async (): Promise<TimelockParameters | null> => {
		if (!parameters?.contractAddress) {
			return null;
		}

		return fetchTimelockParameters(parameters.contractAddress);
	}, [parameters?.contractAddress, fetchTimelockParameters]);

	// Memoize loading state
	const isLoading = useMemo(() => isValidating || isFetching, [isValidating, isFetching]);

	// Memoize available standards
	const availableStandards = useMemo(() => getSupportedStandards(), [getSupportedStandards]);

	return {
		// Data
		parameters,
		availableStandards,

		// Methods
		fetchTimelockParameters,
		validateContractAddress,
		detectTimelockStandard,
		isStandardSupported,
		getSupportedStandards,
		refreshParameters,
		clearParameters,

		// State
		isLoading,
		isValidating,
		isFetching,
		isConnected,

		// Actions
		abort,
	};
};

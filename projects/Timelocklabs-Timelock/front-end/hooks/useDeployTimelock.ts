'use client';

// React imports
import { useCallback, useMemo } from 'react';

// External libraries
import type { ContractInterface } from 'ethers';

// Internal contracts
import { compoundTimelockAbi } from '@/contracts/abis/CompoundTimelock';
import { compoundTimelockBytecode } from '@/contracts/bytecodes/CompoundTimelock';

// Internal hooks
import { useAsyncOperation } from './useCommonHooks';
import { useContractDeployment } from './useBlockchainHooks';
import { validateRequiredFields } from './useHookUtils';
import { useTranslations } from 'next-intl';

// Type imports
import type { CompoundTimelockParams, ContractStandard, DeploymentResult, OpenZeppelinTimelockParams } from '@/types';

/**
 * Configuration for timelock deployment
 */
interface TimelockDeploymentConfig {
	/** Whether to validate parameters before deployment */
	validateParams?: boolean;
	/** Custom gas limit for deployment */
	gasLimit?: number;
	/** Custom gas price for deployment */
	gasPrice?: string;
}

/**
 * Hook for deploying timelock contracts using standardized blockchain patterns
 * Provides optimized deployment methods with proper error handling and validation
 *
 * @param config Optional configuration for deployment behavior
 * @returns Object containing deployment methods and state
 */
export const useDeployTimelock = (config: TimelockDeploymentConfig = {}) => {
	const { validateParams = true, gasLimit, gasPrice } = config;
	const { deployContract, isLoading, error, reset } = useContractDeployment();
	const t = useTranslations('common');

	// Separate async operation for parameter validation
	const { execute: executeWithValidation, isLoading: isValidating } = useAsyncOperation({
		loadingMessage: t('validatingDeploymentParameters'),
		errorMessage: t('parameterValidationFailed'),
		showToasts: false,
	});

	// Memoize deployment options
	const deploymentOptions = useMemo(
		() => ({
			gasLimit,
			gasPrice,
		}),
		[gasLimit, gasPrice]
	);

	/**
	 * Validate Compound timelock parameters
	 */
	const validateCompoundParams = useCallback((params: CompoundTimelockParams): string[] => {
		const errors = validateRequiredFields(params, ['admin', 'minDelay']);

		if (params.minDelay < 0) {
			errors.push(t('minimumDelayMustBeNonNegative'));
		}

		if (params.minDelay > 30 * 24 * 60 * 60) {
			// 30 days in seconds
			errors.push(t('minimumDelayCannotExceed30Days'));
		}

		return errors;
	}, []);

	/**
	 * Deploy Compound timelock contract with validation and error handling
	 */
	const deployCompoundTimelock = useCallback(
		async (params: CompoundTimelockParams): Promise<DeploymentResult> => {
			return executeWithValidation(async () => {
				// Validate parameters if enabled
				if (validateParams) {
					const validationErrors = validateCompoundParams(params);
					if (validationErrors.length > 0) {
						throw new Error(t('validationFailed', { message: validationErrors.join(', ') }));
					}
				}

				// Deploy the contract
				const result = await deployContract(compoundTimelockAbi as ContractInterface, compoundTimelockBytecode, [params.admin, BigInt(params.minDelay)], deploymentOptions);

				return {
					...result,
					standard: 'compound' as ContractStandard,
					parameters: params,
				};
			});
		},
		[deployContract, executeWithValidation, validateParams, validateCompoundParams, deploymentOptions]
	);

	/**
	 * Deploy OpenZeppelin timelock contract (placeholder for future implementation)
	 */
	const deployOpenZeppelinTimelock = useCallback(
		// async (_params: OpenZeppelinTimelockParams): Promise<DeploymentResult> => {
		async (): Promise<DeploymentResult> => {
			return executeWithValidation(async () => {
				// TODO: Implement OpenZeppelin timelock deployment
				// This is a placeholder for future implementation
				throw new Error(t('openZeppelinTimelockDeploymentNotImplemented'));
			});
		},
		[executeWithValidation]
	);

	/**
	 * Get deployment cost estimation
	 */
	const estimateDeploymentCost = useCallback(
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		async (standard: ContractStandard, _params: CompoundTimelockParams | OpenZeppelinTimelockParams) => {
			if (standard === 'compound') {
				// This would typically use gas estimation
				// For now, return a placeholder
				return {
					gasLimit: gasLimit || 2000000,
					gasPrice: gasPrice || '20000000000', // 20 gwei
					estimatedCost: '0.04', // ETH
				};
			}

			throw new Error(t('costEstimationNotAvailableForTimelock', { standard }));
		},
		[gasLimit, gasPrice]
	);

	/**
	 * Check if deployment is supported for the given standard
	 */
	const isDeploymentSupported = useCallback((standard: ContractStandard): boolean => {
		return standard === 'compound';
	}, []);

	return {
		// Deployment methods
		deployCompoundTimelock,
		deployOpenZeppelinTimelock,

		// Utility methods
		estimateDeploymentCost,
		isDeploymentSupported,
		validateCompoundParams,

		// State
		isLoading: isLoading || isValidating,
		isValidating,
		error,

		// Actions
		reset,
	};
};

/**
 * Blockchain-specific hook utilities
 * Provides reusable blockchain operation patterns
 */

'use client';

// React imports
import { useCallback, useEffect, useState } from 'react';

// External libraries
import { ethers } from 'ethers';
import { useActiveAccount } from 'thirdweb/react';

// Internal hooks
import { useAsyncOperation } from './useCommonHooks';
import { useWeb3ErrorHandler } from './useWeb3ErrorHandler';
import { useWeb3React } from './useWeb3React';
import { useTranslations } from 'next-intl';

// Type imports
import type { Address, ContractValidationResult, DeploymentResult, TransactionResult } from '@/types';

/**
 * Hook for managing wallet connection state
 *
 * @returns Object containing wallet connection info and utilities
 */
export function useWalletConnection() {
	const activeAccount = useActiveAccount();
	const { account, isActive, chainId, chainMetadata } = useWeb3React();
	const t = useTranslations('common');
	const isConnected = isActive && !!account;

	const requireConnection = useCallback(() => {
		if (!isConnected) {
			throw new Error(t('pleaseConnectWalletFirst'));
		}
	}, [isConnected]);

	return {
		isConnected,
		address: account as Address | undefined,
		chainId,
		chainMetadata,
		activeAccount,
		requireConnection,
	};
}

/**
 * Hook for contract deployment operations
 *
 * @returns Object containing deployment methods and state
 */
export function useContractDeployment() {
	const { requireConnection } = useWalletConnection();
	const t = useTranslations('common');
	const { signer } = useWeb3React();
	const { handleError } = useWeb3ErrorHandler();
	const { execute, isLoading, error, reset } = useAsyncOperation({
		loadingMessage: t('deployingContract'),
		successMessage: t('contractDeployedSuccessfully'),
		errorMessage: t('contractDeploymentFailed'),
	});

	const deployContract = useCallback(
		async (
			abi: ethers.ContractInterface,
			bytecode: string,
			args: unknown[] = [],
			options?: {
				gasLimit?: number;
				gasPrice?: string;
			}
		): Promise<DeploymentResult> => {
			requireConnection();

			if (!signer) {
				throw new Error(t('signerNotAvailable'));
			}

			return execute(
				async () => {
					try {
						// Validate bytecode
						const validBytecode = bytecode.startsWith('0x') ? bytecode : `0x${bytecode}`;

						if (validBytecode.length < 100) {
							throw new Error(t('bytecodeInvalidOrTooShort'));
						}

						// Create contract factory
						const factory = new ethers.ContractFactory(abi, validBytecode, signer);

						// Deploy contract
						const contract = await factory.deploy(...args, options);
						const deployTx = contract.deployTransaction;

						// Wait for deployment
						const receipt = await deployTx.wait();

						if (!receipt?.contractAddress || receipt.status === 0) {
							throw new Error(t('contractDeploymentFailedOrContractAddressNotFound'));
						}

						return {
							transactionHash: receipt.transactionHash,
							contractAddress: receipt.contractAddress as Address,
						};
					} catch (error) {
						handleError(error, t('contractDeploymentFailed'));
						throw error;
					}
				},
				{
					loading: t('deployingContract'),
					success: t('contractDeployedSuccessfully'),
				}
			);
		},
		[requireConnection, signer, execute, handleError]
	);

	return {
		signer,
		deployContract,
		isLoading,
		error,
		reset,
	};
}

/**
 * Hook for sending transactions
 *
 * @returns Object containing transaction methods and state
 */
export function useTransactionSender() {
	const { requireConnection } = useWalletConnection();
	const t = useTranslations('common');
	const { sendTransaction: sendTx } = useWeb3React();
	const { execute, isLoading, error, reset } = useAsyncOperation({
		loadingMessage: t('sendingTransaction'),
		successMessage: t('transactionSentSuccessfully'),
		errorMessage: t('transactionFailed'),
		showToasts: false,
	});

	const sendTransaction = useCallback(
		async (params: { to: Address; data?: string; value?: string | number | bigint; gasLimit?: number; gasPrice?: string }): Promise<TransactionResult> => {
			requireConnection();

			return execute(
				async () => {
					const tx = await sendTx({
						to: params.to,
						data: params.data,
						value: params.value,
					});

					return {
						transactionHash: tx.transactionHash,
					};
				},
				{
					loading: t('sendingTransaction'),
					success: t('transactionSentSuccessfully'),
				}
			);
		},
		[requireConnection, sendTx, execute]
	);

	return {
		sendTransaction,
		isLoading,
		error,
		reset,
	};
}

/**
 * Hook for contract validation and interaction
 *
 * @returns Object containing contract validation methods
 */
export function useContractValidation() {
	const { provider } = useWeb3React();
	const t = useTranslations('common');

	const validateAddress = useCallback(
		async (address: string): Promise<boolean> => {
			try {
				if (!ethers.utils.isAddress(address)) {
					return false;
				}

				if (!provider) {
					throw new Error(t('providerNotAvailable'));
				}

				const code = await provider.getCode(address);
				return code !== '0x';
			} catch (error) {
				console.error('Error validating contract address:', error);
				return false;
			}
		},
		[provider]
	);

	const validateContract = useCallback(
		async (address: Address, expectedAbi: string[]): Promise<ContractValidationResult> => {
			try {
				if (!provider) {
					throw new Error('Provider not available');
				}

				// Check if address is valid
				if (!ethers.utils.isAddress(address)) {
					return {
						isValid: false,
						standard: null,
						error: t('invalidContractAddress'),
					};
				}

				// Check if contract exists
				const code = await provider.getCode(address);
				if (code === '0x') {
					return {
						isValid: false,
						standard: null,
						error: t('noContractFoundAtThisAddress'),
					};
				}

				// Try to interact with contract using expected ABI
				const contract = new ethers.Contract(address, expectedAbi, provider);

				// This is a basic validation - you might want to call specific functions
				// to determine the contract standard
				try {
					// Example: try to call a function that should exist
					const functionNames = Object.keys(contract.functions);
					if (functionNames.length > 0) {
						const firstFunctionName = functionNames[0];
						if (firstFunctionName) {
							const firstFunction = contract.functions[firstFunctionName];
							if (firstFunction) {
								await firstFunction();
							}
						}
					}

					return {
						isValid: true,
						standard: 'compound', // This should be determined based on actual validation
					};
				} catch {
					return {
						isValid: false,
						standard: null,
						error: t('contractDoesNotMatchExpectedInterface'),
					};
				}
			} catch (error) {
				return {
					isValid: false,
					standard: null,
					error: t('validationFailed', { message: error instanceof Error ? error.message : 'Unknown error occurred' }),
				};
			}
		},
		[provider]
	);

	const getContractInfo = useCallback(
		async (address: Address) => {
			if (!provider) {
				throw new Error(t('providerNotAvailable'));
			}

			const [code, balance] = await Promise.all([provider.getCode(address), provider.getBalance(address)]);

			return {
				hasCode: code !== '0x',
				codeSize: code.length,
				balance: ethers.utils.formatEther(balance),
			};
		},
		[provider]
	);

	return {
		validateAddress,
		validateContract,
		getContractInfo,
	};
}

/**
 * Hook for managing contract interactions
 *
 * @param contractAddress Contract address
 * @param abi Contract ABI
 * @returns Object containing contract interaction methods
 */
export function useContractInteraction(contractAddress: Address | null, abi: ethers.ContractInterface) {
	const { provider, signer } = useWeb3React();
	const [contract, setContract] = useState<ethers.Contract | null>(null);
	const t = useTranslations('common');

	// Create contract instance when address and provider are available
	useEffect(() => {
		if (contractAddress && provider) {
			const contractInstance = new ethers.Contract(contractAddress, abi, signer || provider);
			setContract(contractInstance);
		} else {
			setContract(null);
		}
	}, [contractAddress, abi, provider, signer]);

	const callMethod = useCallback(
		async (
			methodName: string,
			args: unknown[] = [],
			options?: {
				gasLimit?: number;
				gasPrice?: string;
				value?: string;
			}
		) => {
			if (!contract) {
				throw new Error(t('contractNotInitialized'));
			}

			if (!contract.functions[methodName]) {
				throw new Error(t('methodNotFoundInContract', { methodName }));
			}

			return contract.functions[methodName](...args, options);
		},
		[contract]
	);

	const readMethod = useCallback(
		async (methodName: string, args: unknown[] = []) => {
			if (!contract) {
				throw new Error(t('contractNotInitialized'));
			}

			if (!contract.functions[methodName]) {
				throw new Error(t('methodNotFoundInContract', { methodName }));
			}

			return contract.functions[methodName](...args);
		},
		[contract]
	);

	return {
		contract,
		callMethod,
		readMethod,
		isReady: !!contract,
	};
}

/**
 * Hook for managing gas estimation
 *
 * @returns Object containing gas estimation methods
 */
export function useGasEstimation() {
	const { provider } = useWeb3React();
	const t = useTranslations('common');

	const estimateGas = useCallback(
		async (transaction: { to: Address; data?: string; value?: string; from?: Address }) => {
			if (!provider) {
				throw new Error(t('providerNotAvailable'));
			}

			try {
				const gasLimit = await provider.estimateGas(transaction);
				const gasPrice = await provider.getGasPrice();

				return {
					gasLimit: gasLimit.toString(),
					gasPrice: gasPrice.toString(),
					estimatedCost: gasLimit.mul(gasPrice).toString(),
				};
			} catch (error) {
				console.error('Gas estimation failed:', error);
				throw new Error(t('failedToEstimateGas'));
			}
		},
		[provider]
	);

	return {
		estimateGas,
	};
}

/**
 * Hook for managing address formatting and validation
 *
 * @returns Object containing address utility methods
 */
export function useAddressUtils() {
	const t = useTranslations('common');
	const formatAddress = useCallback((address: string, length = 6): string => {
		if (!address || !ethers.utils.isAddress(address)) {
			return '';
		}

		return `${address.slice(0, length + 2)}...${address.slice(-4)}`;
	}, []);

	const isValidAddress = useCallback((address: string): boolean => {
		return ethers.utils.isAddress(address);
	}, []);

	const checksumAddress = useCallback((address: string): string => {
		if (!ethers.utils.isAddress(address)) {
			throw new Error(t('invalidAddress'));
		}

		return ethers.utils.getAddress(address);
	}, []);

	return {
		formatAddress,
		isValidAddress,
		checksumAddress,
	};
}

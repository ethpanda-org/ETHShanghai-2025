/**
 * Hook utilities barrel export
 * Central export point for all hook utilities and patterns
 */

// Common hook utilities
export * from './useCommonHooks';
export * from './useHookUtils';
export * from './useValidationUtils';

// Form-related hooks
export * from './useFormHooks';

// Blockchain-related hooks
export * from './useBlockchainHooks';
export * from './useWeb3Utils';
export * from './useWeb3ErrorHandler';

// Re-export commonly used hooks for convenience
export {
	useLoadingState,
	useAsyncOperation,
	useLocalStorage,
	useDebounce,
	usePrevious,
	useToggle,
	useCounter,
	useArray,
	useClipboard,
	useMediaQuery,
	useWindowSize,
	useDocumentTitle,
	useInterval,
	useTimeout,
} from './useCommonHooks';

export { useIsMobile, useIsTablet, useIsDesktop, useDeviceType, useResponsiveValue, useIsTouchDevice } from './useMobile';

export { useForm, useFieldValidation, useFormArray, useMultiStepForm, useFormPersistence } from './useFormHooks';

export {
	useWalletConnection,
	useContractDeployment,
	useTransactionSender,
	useContractValidation,
	useContractInteraction,
	useGasEstimation,
	useAddressUtils,
} from './useBlockchainHooks';

export { useWeb3Utils } from './useWeb3Utils';

export { useWeb3ErrorHandler } from './useWeb3ErrorHandler';

export { useValidation, useZodSchemas, useAsyncValidation, ValidationPatterns, ValidationMessages } from './useValidationUtils';


import React, { useMemo, useEffect } from 'react';
import SelectInput from '../ui/SelectInput';
import { useAuthStore } from '@/store/userStore';
import { getChainObject } from '@/utils/chainUtils';
import { useSwitchActiveWalletChain } from 'thirdweb/react';
import type { BaseComponentProps, ChainOption } from '@/types';

const DEFAULT_CHAIN_LOGO = '/default-chain-logo.png';

interface ChainSelectorProps extends BaseComponentProps {
	label: string;
	value: string;
	onChange: (chainId: string) => void;
	placeholder?: string;
	disabled?: boolean;
	error?: string;
	autoSwitchChain?: boolean; // Whether to automatically switch wallet chain when selection changes
}

/**
 * Chain selector component with automatic chain fetching and logo support
 * Provides a reusable chain selection interface with wallet integration
 */
const ChainSelector: React.FC<ChainSelectorProps> = ({
	label,
	value,
	onChange,
	placeholder,
	disabled = false,
	error,
	autoSwitchChain = true,
	className,
}) => {
	const { chains, fetchChains } = useAuthStore();
	const switchChain = useSwitchActiveWalletChain();

	// Fetch chains on mount if not already loaded
	useEffect(() => {
		if (chains.length === 0) {
			fetchChains();
		}
	}, [chains.length, fetchChains]);

	// Auto switch wallet chain when selection changes
	useEffect(() => {
		if (autoSwitchChain && value) {
			const chainObject = getChainObject(parseInt(value));
			if (chainObject) {
				switchChain(chainObject);
			}
		}
	}, [value, switchChain, autoSwitchChain]);

	// Memoize chain options to prevent unnecessary re-renders
	const chainOptions = useMemo<ChainOption[]>(
		() =>
			chains.map(chain => ({
				value: chain.chain_id.toString(),
				label: chain.display_name,
				logo: chain.logo_url || DEFAULT_CHAIN_LOGO,
			})),
		[chains]
	);

	// Calculate selected chain logo
	const selectedChainLogo = useMemo(() => 
		chainOptions.find(option => option.value === value)?.logo, 
		[chainOptions, value]
	);

	return (
		<SelectInput
			label={label}
			value={value}
			onChange={onChange}
			options={chainOptions}
			logo={selectedChainLogo}
			placeholder={placeholder}
			disabled={disabled}
			error={error}
			className={className}
		/>
	);
};

export default ChainSelector;
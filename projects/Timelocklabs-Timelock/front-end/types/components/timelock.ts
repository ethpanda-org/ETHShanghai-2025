/**
 * Timelock component types
 */

import type { BaseComponentProps, ContractStandard, VoidCallback } from '../common';

/**
 * Chain option for select input
 */
export interface ChainOption {
	value: string;
	label: string;
	logo?: string;
}

/**
 * Standard option configuration
 */
export interface StandardOption {
	value: ContractStandard;
	label?: string;
	labelKey?: string;
	description?: string;
	descriptionKey?: string;
}

/**
 * Standard option configuration with additional metadata
 */
export interface StandardOptionConfig extends StandardOption {
	icon?: React.ReactNode;
	disabled?: boolean;
	recommended?: boolean;
}

/**
 * Create timelock form state
 */
export interface CreateTimelockFormState {
	selectedChain: number;
	selectedStandard: ContractStandard;
	minDelay: string;
	owner?: string;
}

/**
 * Create timelock form props
 */
export interface CreateTimelockFormProps extends BaseComponentProps {
	selectedChain: number;
	onChainChange: (chainId: number) => void;
	selectedStandard: ContractStandard;
	minDelay: string;
	onMinDelayChange: (minDelay: string) => void;
	owner?: string;
	onOwnerChange?: (owner: string) => void;
	onDeploy: VoidCallback;
	isLoading?: boolean;
	isSafeWallet?: boolean;
}

/**
 * Contract standard selection props
 */
export interface ContractStandardSelectionProps extends BaseComponentProps {
	selectedStandard: ContractStandard;
	options?: StandardOptionConfig[];
}

/**
 * Radio button option props
 */
export interface RadioButtonOptionProps extends BaseComponentProps {
	id?: string;
	name?: string;
	value: string;
	label: string;
	description?: string;
	checked: boolean;
	onChange?: (value: string) => void;
	disabled?: boolean;
}

/**
 * Creation details for confirmation dialog
 */
export interface CreationDetails {
	chain_id: number | string;
	chainName: string;
	chainIcon: React.ReactNode;
	timelockAddress: string;
	initiatingAddress: string;
	transactionHash: string;
	explorerUrl: string;
}

/**
 * Dialog details state
 */
export interface DialogDetailsState extends CreationDetails {}

/**
 * Confirm creation dialog props
 */
export interface ConfirmCreationDialogProps extends BaseComponentProps {
	isOpen: boolean;
	onClose: VoidCallback;
	onConfirm: (remark: string) => void;
	creationDetails: CreationDetails;
}

/**
 * Parameter display row props
 */
export interface ParameterDisplayRowProps extends BaseComponentProps {
	label: string;
	value?: string | React.ReactNode;
	copyable?: boolean;
}

/**
 * Deployment result
 */
export interface DeploymentResult {
	contractAddress: string;
	transactionHash: string;
}

/**
 * Compound timelock deployment parameters
 */
export interface CompoundTimelockParams {
	minDelay: number;
	admin: `0x${string}`;
}

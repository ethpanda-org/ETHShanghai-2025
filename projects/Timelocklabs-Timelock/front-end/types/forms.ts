/**
 * Form-related types and validation schemas
 */

import type { z } from 'zod';
import type { BaseComponentProps, ContractStandard, Address, ValueCallback, VoidCallback } from './common';

/**
 * Form validation error
 */
export interface FormError {
	field: string;
	message: string;
	code?: string;
}

/**
 * Form state
 */
export interface FormState<T = any> {
	values: T;
	errors: Record<string, string>;
	touched: Record<string, boolean>;
	isSubmitting: boolean;
	isValid: boolean;
}

/**
 * Form field configuration
 */
export interface FormFieldConfig {
	name: string;
	label?: string;
	type?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	validation?: z.ZodSchema;
	help?: string;
}

/**
 * Form hook return type
 */
export interface UseFormReturn<T = any> {
	values: T;
	errors: Record<string, string>;
	touched: Record<string, boolean>;
	isSubmitting: boolean;
	isValid: boolean;
	setValue: (field: keyof T, value: any) => void;
	setError: (field: keyof T, error: string) => void;
	clearError: (field: keyof T) => void;
	setTouched: (field: keyof T, touched?: boolean) => void;
	handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e?: React.FormEvent) => void;
	reset: (values?: Partial<T>) => void;
	validate: () => boolean;
}

/**
 * Login form data
 */
export interface LoginFormData {
	walletAddress: Address;
	signature?: string;
	message?: string;
}

/**
 * Create timelock form data
 */
export interface CreateTimelockFormData {
	chainId: number;
	standard: ContractStandard;
	minDelay: number;
	admin: Address;
	remark: string;
}

/**
 * Import timelock form data
 */
export interface ImportTimelockFormData {
	chainId: number;
	contractAddress: Address;
	remark: string;
}

/**
 * Create transaction form data
 */
export interface CreateTransactionFormData {
	timelockAddress: Address;
	timelockStandard: ContractStandard;
	target: Address;
	value: string;
	signature: string;
	data: string;
	eta: number;
	description: string;
}

/**
 * Email notification form data
 */
export interface EmailNotificationFormData {
	email: string;
	emailRemark: string;
	timelockContracts: string[];
}

/**
 * ABI form data
 */
export interface ABIFormData {
	name: string;
	description: string;
	abiContent: string;
}

/**
 * ABI row data structure
 */
export interface ABIRow {
	id: number;
	name: string;
	description: string;
	abi_content: string;
	created_at: string;
	is_shared: boolean;
}

/**
 * ABI content structure for viewing
 */
export interface ABIContent {
	name: string;
	description: string;
	abi_content: string;
}

/**
 * Props for AddABIForm component
 */
export interface AddABIFormProps {
	isOpen: boolean;
	onClose: () => void;
}

/**
 * Props for ViewABIForm component
 */
export interface ViewABIFormProps {
	isOpen: boolean;
	onClose: () => void;
	viewAbiContent: ABIContent;
}

/**
 * Props for EncodingTransactionForm component
 */
export interface EncodingTransactionFormProps {
	targetCalldata: string;
	timelockType: any;
	onTimelockTypeChange: (value: any) => void;
	timelockMethod: any;
	onTimelockMethodChange: (value: any) => void;
	target: string;
	onTargetChange: (value: string) => void;
	value: string;
	onValueChange: (value: string) => void;
	abiValue: any;
	onAbiChange: (value: any) => void;
	functionValue: any;
	onFunctionChange: (value: any) => void;
	timeValue: any;
	onTimeChange: (value: any) => void;
	argumentValues: any;
	onArgumentChange: (index: number, value: any) => void;
	onTimelockAddressChange: (value: string) => void;
	onTimelockDetailsChange?: (value: any) => void;
}

/**
 * Props for TargetABISection component
 */
export interface TargetABISectionProps {
	abiValue: any;
	onAbiChange: (value: any) => void;
	functionValue: any;
	onFunctionChange: (value: any) => void;
	argumentValues: any;
	onArgumentChange: (index: number, value: any) => void;
}

/**
 * Props for MailboxSelection component
 */
export interface MailboxSelectionProps {
	selectedMailbox: any;
	onMailboxChange: (value: any) => void;
}

/**
 * Props for EncodingPreview component
 */
export interface EncodingPreviewProps {
	previewContent: string | null;
}

/**
 * Profile form data
 */
export interface ProfileFormData {
	name: string;
	email: string;
	avatar?: string;
	bio?: string;
}

/**
 * Settings form data
 */
export interface SettingsFormData {
	theme: 'light' | 'dark' | 'system';
	language: string;
	notifications: {
		email: boolean;
		push: boolean;
		sms: boolean;
	};
	privacy: {
		showProfile: boolean;
		showActivity: boolean;
	};
}

/**
 * Search form data
 */
export interface SearchFormData {
	query: string;
	filters: {
		type?: string;
		status?: string;
		dateRange?: {
			start: string;
			end: string;
		};
	};
}

/**
 * Filter form data
 */
export interface FilterFormData {
	chainId?: number;
	standard?: ContractStandard;
	status?: string;
	dateRange?: {
		start: string;
		end: string;
	};
	search?: string;
}

/**
 * Form validation schema types
 */
export interface ValidationSchemas {
	login: z.ZodSchema<LoginFormData>;
	createTimelock: z.ZodSchema<CreateTimelockFormData>;
	importTimelock: z.ZodSchema<ImportTimelockFormData>;
	emailNotification: z.ZodSchema<EmailNotificationFormData>;
	abi: z.ZodSchema<ABIFormData>;
	profile: z.ZodSchema<ProfileFormData>;
	settings: z.ZodSchema<SettingsFormData>;
	search: z.ZodSchema<SearchFormData>;
	filter: z.ZodSchema<FilterFormData>;
}

/**
 * Form component props
 */
export interface FormProps<T = any> extends BaseComponentProps {
	initialValues?: Partial<T>;
	validationSchema?: z.ZodSchema<T>;
	onSubmit: (values: T) => void | Promise<void>;
	onReset?: VoidCallback;
	disabled?: boolean;
	loading?: boolean;
}

/**
 * Form field props
 */
export interface FormFieldProps extends BaseComponentProps {
	name: string;
	label?: string;
	type?: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	error?: string;
	help?: string;
	value?: any;
	onChange?: ValueCallback<any>;
	onBlur?: VoidCallback;
}

/**
 * Form section props
 */
export interface FormSectionProps extends BaseComponentProps {
	title?: string;
	description?: string;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
}

/**
 * Form actions props
 */
export interface FormActionsProps extends BaseComponentProps {
	submitText?: string;
	cancelText?: string;
	resetText?: string;
	onCancel?: VoidCallback;
	onReset?: VoidCallback;
	loading?: boolean;
	disabled?: boolean;
	showReset?: boolean;
	showCancel?: boolean;
}

/**
 * Dynamic form field
 */
export interface DynamicFormField {
	id: string;
	type: 'text' | 'number' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox' | 'radio';
	name: string;
	label: string;
	placeholder?: string;
	required?: boolean;
	disabled?: boolean;
	options?: Array<{ value: string; label: string }>;
	validation?: z.ZodSchema;
	defaultValue?: any;
	help?: string;
	dependencies?: string[]; // Fields this field depends on
	conditional?: (values: any) => boolean; // Show field conditionally
}

/**
 * Dynamic form configuration
 */
export interface DynamicFormConfig {
	fields: DynamicFormField[];
	sections?: Array<{
		title: string;
		fields: string[];
		collapsible?: boolean;
	}>;
	validation?: z.ZodSchema;
}

/**
 * Form wizard step
 */
export interface FormWizardStep {
	key: string;
	title: string;
	description?: string;
	fields: string[];
	validation?: z.ZodSchema;
	optional?: boolean;
}

/**
 * Form wizard configuration
 */
export interface FormWizardConfig {
	steps: FormWizardStep[];
	fields: DynamicFormField[];
	validation?: z.ZodSchema;
}

/**
 * Form wizard props
 */
export interface FormWizardProps<T = any> extends BaseComponentProps {
	config: FormWizardConfig;
	initialValues?: Partial<T>;
	onSubmit: (values: T) => void | Promise<void>;
	onStepChange?: (step: number) => void;
	loading?: boolean;
}

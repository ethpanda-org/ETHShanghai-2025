/**
 * Common utility types used throughout the application
 */

import type { ReactNode } from 'react';

/**
 * Base component props that most components should extend
 */
export interface BaseComponentProps {
	className?: string;
	children?: ReactNode;
}

/**
 * Generic form component props
 */
export interface FormComponentProps<T> extends BaseComponentProps {
	value: T;
	onChange: (value: T) => void;
	error?: string;
	disabled?: boolean;
}

/**
 * Modal/Dialog base props
 */
export interface ModalProps extends BaseComponentProps {
	isOpen: boolean;
	onClose: () => void;
	title?: string;
}

/**
 * Generic loading state
 */
export interface LoadingState {
	isLoading: boolean;
	error: Error | null;
}

/**
 * Generic pagination parameters
 */
export interface PaginationParams {
	page: number;
	page_size: number;
}

/**
 * Generic pagination response
 */
export interface PaginationResponse {
	page: number;
	page_size: number;
	total: number;
	total_pages: number;
}

/**
 * Generic option for dropdowns and selects
 */
export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

/**
 * Extended option with additional metadata
 */
export interface ExtendedSelectOption extends SelectOption {
	description?: string;
	icon?: ReactNode;
	logo?: string;
}

/**
 * Generic filter parameters
 */
export interface FilterParams {
	[key: string]: string | number | boolean | undefined;
}

/**
 * Generic sort parameters
 */
export interface SortParams {
	field: string;
	direction: 'asc' | 'desc';
}

/**
 * Address type for blockchain addresses
 */
export type Address = string;

/**
 * Transaction hash type
 */
export type Hash = string;

/**
 * Timestamp type (ISO string)
 */
export type Timestamp = string;

/**
 * Generic ID types
 */
export type ID = string | number;

/**
 * Contract standard types
 */
export type ContractStandard = 'compound' | 'openzeppelin';

/**
 * Transaction status types
 */
export type TransactionStatus =
	"all" |
	"waiting" |
	"ready" |
	"executed" |
	"cancelled" |
	"expired"

/**
 * HTTP methods
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Generic async operation result
 */
export interface AsyncResult<T> {
	data: T | null;
	isLoading: boolean;
	error: Error | null;
}

/**
 * Generic callback function types
 */
export type VoidCallback = () => void;
export type ValueCallback<T> = (value: T) => void;
export type AsyncCallback<T = void> = () => Promise<T>;
export type AsyncValueCallback<T, R = void> = (value: T) => Promise<R>;

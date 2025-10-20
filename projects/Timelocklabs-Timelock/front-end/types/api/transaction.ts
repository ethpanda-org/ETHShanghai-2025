/**
 * Transaction-related API types
 */

import type { Address, Hash, Timestamp, TransactionStatus, ContractStandard, PaginationResponse } from '../common';

/**
 * Transaction data
 */
export interface Transaction {
	id: number;
	flow_id: Hash;
	timelock_standard: ContractStandard;
	chain_id: number;
	contract_address: Address;
	status: TransactionStatus;
	queue_tx_hash: Hash;
	initiator_address: Address;
	target_address: Address;
	call_data_hex: string;
	value: string;
	eta: Timestamp;
	expired_at: Timestamp;
	created_at: Timestamp;
	updated_at: Timestamp;
	chainIcon: React.ReactNode;
}

/**
 * Transaction list response
 */
export interface TransactionListResponse extends PaginationResponse {
	transactions: Transaction[];
}

/**
 * Transaction statistics
 */
export interface TransactionStats {
	canceled_count: number;
	executed_count: number;
	executing_count: number;
	expired_count: number;
	failed_count: number;
	queued_count: number;
	total_count: number;
}

/**
 * Transaction list filters
 */
export interface TransactionListFilters {
	chain_id?: number;
	timelock_address?: Address;
	status?: TransactionStatus;
	search?: string;
	page?: number;
	page_size?: number;
	[key: string]: string | number | boolean | undefined;
}

/**
 * Pending transaction filters
 */
export interface PendingTransactionFilters {
	chain_id?: number;
	timelock_address?: Address;
	page?: number;
	page_size?: number;
	[key: string]: string | number | boolean | undefined;
}

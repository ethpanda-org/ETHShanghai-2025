/**
 * Timelock-related API types
 */

import type { Address, Timestamp, ContractStandard } from '../common';
import type { ApiResponse } from './base';

/**
 * Timelock contract data
 */
export interface TimelockContract {
	compound_timelocks: TimelockContractItem[];
	openzeppelin_timelocks: TimelockContractItem[];
	total: number;
}

/**
 * Timelock contract data
 */
export interface TimelockContractItem {
	id: number;
	chain_id: number;
	chain_name: string;
	contract_address: Address;
	admin?: Address;
	created_at: Timestamp;
	remark: string;
	status: string;
	standard: ContractStandard;
	// OpenZeppelin specific fields
	proposers?: string;
	executors?: string;
	cancellers?: string;
	// Compound specific fields
	pending_admin?: Address;
}
/**
 * Timelock parameters for import/validation
 */
export interface TimelockParameters {
	isValid: boolean;
	standard: ContractStandard | null;
	contractAddress: Address;
	minDelay: number;
	admin?: Address;
	pendingAdmin?: Address;
	// Compound specific fields
	gracePeriod?: number;
	minimumDelay?: number;
	maximumDelay?: number;
	// Error field for validation failures
	error?: string;
}

// {
//   "chain_id": 0,
//   "contract_address": "string",
//   "is_imported": true,
//   "remark": "string",
//   "standard": "compound",
//   "user_address": "string"
// }

/**
 * Import timelock request
 */
export interface ImportTimelockRequest {
	chain_id: number;
	remark: string;
	standard: ContractStandard;
	contract_address: Address;
	is_imported: boolean; // Indicates if this is an imported contract
}

/**
 * Create timelock request
 */
export interface CreateTimelockRequestBody {
	chain_id: number;
	remark: string;
	standard: ContractStandard;
	contract_address: Address;
	is_imported: boolean; // Indicates if this is an imported contract
}

export interface Timelock extends TimelockContractItem {
	pending_admin: Address;
	pending_admin_locktime: number;
	eta: number;
	target_address: Address;
	value: number|string|any;
	function_signature: string;
	call_data_hex: string;
}

/**
 * Timelock API response
 */
export interface TimelockApiResponse extends ApiResponse<any> {}

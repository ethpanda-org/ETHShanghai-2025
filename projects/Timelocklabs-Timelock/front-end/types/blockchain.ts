/**
 * Blockchain and Web3 related types
 */

import type { ContractInterface } from 'ethers';
import type { Address, Hash, ContractStandard } from './common';

/**
 * Deployment result from contract deployment
 */
export interface DeploymentResult {
	contractAddress: Address | null;
	transactionHash: Hash;
}

/**
 * Transaction result from blockchain operations
 */
export interface TransactionResult {
	transactionHash: Hash;
}

/**
 * Compound timelock deployment parameters
 */
export interface CompoundTimelockParams {
	minDelay: number;
	admin: Address;
}

/**
 * OpenZeppelin timelock deployment parameters
 */
export interface OpenZeppelinTimelockParams {
	minDelay: number;
	proposers: Address[];
	executors: Address[];
	admin: Address;
}

/**
 * Generic contract deployment parameters
 */
export interface DeployContractParams {
	abi: ContractInterface;
	bytecode: string;
	args: unknown[];
}

/**
 * Send transaction parameters
 */
export interface SendTransactionParams {
	toAddress: Address;
	calldata: string;
	value?: string;
}

/**
 * Web3 provider state
 */
export interface Web3State {
	account: Address | null;
	isConnected: boolean;
	chainId: number | null;
	provider: any;
	signer: any;
}

/**
 * Web3 hook return type
 */
export interface UseWeb3Return extends Web3State {
	connect: () => Promise<void>;
	disconnect: () => Promise<void>;
	switchChain: (chainId: number) => Promise<void>;
	sendTransaction: (params: SendTransactionParams) => Promise<TransactionResult>;
}

/**
 * Chain configuration for thirdweb
 */
export interface ChainConfig {
	chainId: number;
	name: string;
	nativeCurrency: {
		name: string;
		symbol: string;
		decimals: number;
	};
	rpcUrls: string[];
	blockExplorerUrls?: string[];
	testnet?: boolean;
}

/**
 * Supported chain IDs mapping
 */
export interface ChainIdMapping {
	[chainId: number]: any; // thirdweb chain object
}

/**
 * Timelock contract ABI signatures
 */
export interface TimelockABI {
	compound: string[];
	openzeppelin: string[];
}

/**
 * Contract validation result
 */
export interface ContractValidationResult {
	isValid: boolean;
	standard: ContractStandard | null;
	error?: string;
}

/**
 * Blockchain network information
 */
export interface NetworkInfo {
	chainId: number;
	name: string;
	symbol: string;
	decimals: number;
	rpcUrl: string;
	blockExplorerUrl?: string;
	isTestnet: boolean;
}

/**
 * Gas estimation result
 */
export interface GasEstimation {
	gasLimit: string;
	gasPrice: string;
	maxFeePerGas?: string;
	maxPriorityFeePerGas?: string;
}

/**
 * Transaction receipt data
 */
export interface TransactionReceipt {
	transactionHash: Hash;
	blockNumber: number;
	blockHash: string;
	gasUsed: string;
	status: number;
	contractAddress?: Address;
}

/**
 * Wallet connection options
 */
export interface WalletConnectionOptions {
	chainId?: number;
	autoConnect?: boolean;
	onConnect?: (address: Address) => void;
	onDisconnect?: () => void;
	onChainChanged?: (chainId: number) => void;
}

/**
 * Smart contract interaction parameters
 */
export interface ContractCallParams {
	contractAddress: Address;
	abi: ContractInterface;
	functionName: string;
	args?: any[];
	value?: string;
}

/**
 * Contract read result
 */
export interface ContractReadResult<T = any> {
	data: T;
	error?: Error;
}

/**
 * Contract write result
 */
export interface ContractWriteResult {
	transactionHash: Hash;
	wait: () => Promise<TransactionReceipt>;
}

/**
 * Timelock admin permissions
 */
export interface TimelockAdminPermissions {
	canSetPendingAdmin: boolean;
	canAcceptAdmin: boolean;
	canQueueTransaction: boolean;
	canExecuteTransaction: boolean;
	canCancelTransaction: boolean;
}

/**
 * Timelock operation data
 */
export interface TimelockOperation {
	target: Address;
	value: string;
	signature: string;
	data: string;
	eta: number;
}

/**
 * Multi-signature wallet data
 */
export interface MultiSigWallet {
	address: Address;
	owners: Address[];
	threshold: number;
	nonce: number;
}

/**
 * Token information
 */
export interface TokenInfo {
	address: Address;
	symbol: string;
	name: string;
	decimals: number;
	totalSupply?: string;
}

/**
 * Token balance
 */
export interface TokenBalance {
	token: TokenInfo;
	balance: string;
	formattedBalance: string;
}

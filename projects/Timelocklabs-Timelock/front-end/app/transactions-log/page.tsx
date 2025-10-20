'use client';
import React, { useState, useEffect, useCallback } from 'react';
import TableComponent from '@/components/ui/TableComponent';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { formatUnits } from 'ethers/lib/utils';
import type { Transaction, TransactionStatus, ContractStandard, Hash, Address, Timestamp } from '@/types';
import { useApi } from '@/hooks/useApi';
import copyToClipboard from '@/utils/copy';
import SectionCard from '@/components/layout/SectionCard';
import EthereumParamsCodec from '@/utils/ethereumParamsCodec';
import SectionHeader from '@/components/ui/SectionHeader';
import ChainLabel from '@/components/web3/ChainLabel';
import NativeToken from '@/components/web3/NativeToken';
import HashLink from '@/components/web3/HashLink';
import { formatDate } from '@/utils/utils';
import TableTag from '@/components/tableContent/TableTag';

// Define Transaction type specific to this table
interface HistoryTxRow {
	id: number;
	flow_id: Hash;
	timelock_standard: ContractStandard;
	chain_id: number;
	contract_address: Address;
	contract_remark: string;
	function_signature: string;
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
 * Transaction history section component with filtering and export functionality
 *
 * @returns JSX.Element
 */
const TransactionHistorySection: React.FC = () => {
	const t = useTranslations('Transactions_log');
	const [historyTxs, setHistoryTxs] = useState<HistoryTxRow[]>([]);
	const { request: getTransactionList } = useApi();

	// Fetch transaction history
	const fetchHistoryTransactions = useCallback(async () => {
		try {
			const { data } = await getTransactionList('/api/v1/flows/list', {
				page: 1,
				page_size: 10,
				status: 'all',
			});

			const transformedData: HistoryTxRow[] = data.flows.map((tx: Transaction) => ({
				...tx,
				chainIcon: <div className='w-4 h-4 bg-gray-100 rounded-full' />, // Placeholder icon
			}));

			setHistoryTxs(transformedData);
		} catch (error) {
			console.error('Failed to fetch transaction history:', error);
			toast.error(t('fetchHistoryTxsError'));
		}
	}, [getTransactionList, t]);

	useEffect(() => {
		fetchHistoryTransactions();
	}, [fetchHistoryTransactions]);

	const parseCalldata = (funcSig: string, calldata: string) => {
		if (!funcSig || !calldata) return [];
		const ethereumParamsCodec = new EthereumParamsCodec();

		const decodeResult = ethereumParamsCodec.decodeParams(
			funcSig,
			calldata
		);

		if (!decodeResult.success) {
			console.error('Failed to decode params:', decodeResult.error);
			return [];
		}

		return decodeResult.params;
	};

	const columns = [
		{
			key: 'chain',
			header: t('chain'),
			render: (row: HistoryTxRow) => <ChainLabel chainId={row.chain_id} />,
		},
		{
			key: 'remark',
			header: t('remark'),
			render: (row: HistoryTxRow) => <span className="text-sm cursor-pointer" onClick={() => copyToClipboard(row.contract_address)}>{row.contract_remark}</span>,
		},
		{
			key: 'tx_hash',
			header: t('txHash'),
			render: (row: HistoryTxRow) => <HashLink hash={row.queue_tx_hash} chainId={row.chain_id} />,
		},
		{
			key: 'function_signature',
			header: t('functionSignature'),
			render: (row: HistoryTxRow) => (
				<div className='flex items-center space-x-2'>
					<span className='text-sm cursor-pointer' onClick={() => copyToClipboard(row.function_signature)}>
						{row.function_signature}
					</span>
				</div>
			),
		},
		{
			key: 'call_data_hex',
			header: t('callDataHex'),
			render: (row: HistoryTxRow) => (
				<div className='flex flex-col'>
					{parseCalldata(row.function_signature, row.call_data_hex).map((item: { type: string; value: unknown; index: number }) => {
						if (item.type === 'uint256') {

							const value = String(item.value);
							if (value.length > 18) {
								const formatted = formatUnits(value, 18);
								const [wholePart, ] = formatted.split('.');
								const scientificNotation = `${wholePart}×10`;
								
								return (
									<div key={item.index} className='flex text-sm'>
										<div className='font-medium'>{item.type}:</div>
										<div className='ml-1 cursor-pointer' onClick={() => copyToClipboard(value)}>
											{scientificNotation}
											<sup>18</sup>
										</div>
									</div>
								);
							}

							return (
								<div key={item.index} className='flex text-sm'>
									<div className='font-medium'>{item.type}:</div>
									<div className='ml-1 cursor-pointer' onClick={() => copyToClipboard(value)}>
										{value}
									</div>
								</div>
							);
						}


						return <div key={item.index} className='flex text-sm'>
							<div className='font-medium'>{item.type}:</div>
							<div className='ml-1 cursor-pointer' onClick={() => copyToClipboard(String(item.value))}>{String(item.value)}</div>
						</div>


					})}
				</div>
			),
		},
		{
			key: 'value',
			header: t('value'),
			render: (row: HistoryTxRow) => (
				<div className='flex items-center space-x-2'>
					<span className='text-sm cursor-pointer' onClick={() => copyToClipboard(row.value)}>
						{row.value}  <NativeToken chainId={row.chain_id} />
					</span>
				</div>
			),
		},
		{
			key: 'eta',
			header: t('eta'),
			render: (row: HistoryTxRow) => (
				<span className='text-sm'>
					{formatDate(row.eta)}
				</span>
			),
		},
		{
			key: 'status',
			header: t('status'),
			render: (row: HistoryTxRow) => <TableTag label={row.status} statusType={row.status === 'all' ? undefined : row.status} />,
		}
	];

	return (
		<SectionCard>
			<div className='flex-1 mb-4'>
				<SectionHeader title={t('title')} className='mb-6' description={t('transactionDetails')} />
				<TableComponent<HistoryTxRow> columns={columns} data={historyTxs} showPagination={true} itemsPerPage={10} />
			</div>
		</SectionCard>
	);
};

export default TransactionHistorySection;

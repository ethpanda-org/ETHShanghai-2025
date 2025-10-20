'use client';
import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
// import SearchBar from '@/components/ui/SearchBar';
import ExportButton from '@/components/ui/ExportButton';
import TabbedNavigation from './TabbedNavigation';
import TableSkeleton from '@/components/ui/TableSkeleton';

// 懒加载TableComponent以减少初始bundle大小
const TableComponent = lazy(() => import('@/components/ui/TableComponent'));
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
// 动态导入XLSX库以减少初始bundle大小
import type { Transaction, BaseComponentProps, TransactionStatus, ContractStandard, Hash, Address, Timestamp } from '@/types';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import AddSVG from '@/components/icons/add';
import { formatDate } from '@/utils/utils';
import CancelButton from './CancelButton';
import ExecuteButton from './ExecuteButton';
import copyToClipboard from '@/utils/copy';
import SectionCard from '@/components/layout/SectionCard';
import ChainLabel from '@/components/web3/ChainLabel';
import HashLink from '@/components/web3/HashLink';
import AddressWarp from '@/components/web3/AddressWarp';
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
 * @param props - TransactionHistorySection component props
 * @returns JSX.Element
 */
const TransactionHistorySection: React.FC<BaseComponentProps> = () => {
	const t = useTranslations('Transactions');
	const [activeTab, setActiveTab] = useState('all');
	const [historyTxs, setHistoryTxs] = useState<HistoryTxRow[]>([]);

	const { request: getTransactionList } = useApi();
	const router = useRouter();

	const handleTabChange = (tabId: string) => {
		setActiveTab(tabId);
	};

	// Fetch transaction history
	const fetchHistoryTransactions = useCallback(async () => {
		try {
			const { data } = await getTransactionList('/api/v1/flows/list', {
				page: 1,
				page_size: 10,
				status: activeTab === 'all' ? undefined : (activeTab as TransactionStatus),
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
	}, [activeTab, getTransactionList, t]);

	useEffect(() => {
		fetchHistoryTransactions();
	}, [fetchHistoryTransactions]);

	// all, waiting, ready, executed, cancelled, expired
	const historyTabs = [
		{ id: 'all', label: t('all') },
		{ id: 'waiting', label: t('waiting') },
		{ id: 'ready', label: t('ready') },
		{ id: 'executed', label: t('executed') },
		{ id: 'cancelled', label: t('cancelled') },
		{ id: 'expired', label: t('expired') },
	];

	const columns = [
		{
			key: 'chain',
			header: t('chain'),
			render: (row: HistoryTxRow) => <ChainLabel chainId={row.chain_id} />,
		},
		{
			key: 'remark',
			header: t('remark'),
			render: (row: HistoryTxRow) => (
				<span className='text-sm cursor-pointer' onClick={() => copyToClipboard(row.contract_address)}>
					{row.contract_remark}
				</span>
			),
		},
		{
			key: 'timelock_address',
			header: t('timelockAddress'),
			render: (row: HistoryTxRow) => (
				<div className='flex items-center space-x-2 cursor-pointer' onClick={() => copyToClipboard(row.contract_address)}>
					<AddressWarp address={row.contract_address} />
				</div>
			),
		},
		{
			key: 'tx_hash',
			header: t('txHash'),
			render: (row: HistoryTxRow) => <HashLink hash={row.queue_tx_hash} chainId={row.chain_id} />,
		},
		{
			key: 'created_at',
			header: t('createdAt'),
			render: (row: HistoryTxRow) => <span className='text-sm  '>{formatDate(row.created_at)}</span>,
		},
		{
			key: 'eta',
			header: t('eta'),
			render: (row: HistoryTxRow) => <span className='text-sm  '>{formatDate(row.eta)}</span>,
		},
		{
			key: 'expired_at',
			header: t('expiredAt'),
			render: (row: HistoryTxRow) => <span className='text-sm  '>{formatDate(row.expired_at)}</span>,
		},
		{
			key: 'status',
			header: t('status'),
			render: (row: HistoryTxRow) => <TableTag label={row.status} statusType={row.status !== 'all' ? row.status : undefined} />,
		},
		{
			key: 'actions',
			header: t('actions'),
			render: (row: HistoryTxRow) => (
				<div className='flex space-x-2'>
					{row.status === 'ready' && <ExecuteButton timelock={row} />}
					{(row.status === 'waiting' || row.status == 'ready') && <CancelButton timelock={row} />}
				</div>
			),
		},
	];

	const handleExport = async () => {
		if (historyTxs.length === 0) {
			toast.warning('No data to export');
			return;
		}

		try {
			// 动态导入XLSX库
			const XLSX = await import('xlsx');

			const worksheet = XLSX.utils.json_to_sheet(historyTxs);
			const workbook = XLSX.utils.book_new();
			XLSX.utils.book_append_sheet(workbook, worksheet, 'Transaction History');

			// Generate filename with current date
			const now = new Date();
			const timestamp = now.toISOString().split('T')[0]; // YYYY-MM-DD format
			const filename = `transaction-history-${timestamp}.xlsx`;

			XLSX.writeFile(workbook, filename);
			toast.success('Transaction history exported successfully');
		} catch (error) {
			console.error('Export failed:', error);
			toast.error('Failed to export transaction history');
		}
	};

	return (
		<SectionCard>
			<div className='flex flex-col'>
				<div className='flex justify-between items-center mb-4'>
					<SectionHeader title={t('history')} description={t('transactionHistory')} />

					<div className='flex items-center space-x-3'>
						<ExportButton onClick={handleExport} />
						<button
							type='button'
							onClick={() => {
								router.push('/create-transaction');
							}}
							className='cursor-pointer inline-flex items-center space-x-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'>
							<AddSVG />
							<span>{t('create')}</span>
						</button>
					</div>
				</div>
				<div className='flex justify-between items-center mb-6'>
					<div>
						<TabbedNavigation tabs={historyTabs} activeTab={activeTab} onTabChange={handleTabChange} />
					</div>
				</div>
			</div>
			<div className='flex-1 mb-4'>
				<Suspense fallback={<TableSkeleton rows={10} columns={8} showHeader={false} />}>
					{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
					<TableComponent columns={columns as any} data={historyTxs} showPagination={true} itemsPerPage={10} />
				</Suspense>
			</div>
		</SectionCard>
	);
};

export default TransactionHistorySection;

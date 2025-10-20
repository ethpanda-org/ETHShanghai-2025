import React, { useState, useEffect, useCallback } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import TableComponent from '@/components/ui/TableComponent';
import { useTranslations } from 'next-intl';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import { formatDate } from '@/utils/utils';
import type { RawTx, PendingTx } from '@/types';
import ChainLabel from '@/components/web3/ChainLabel';
import HashLink from '@/components/web3/HashLink';
import TableTag from '@/components/tableContent/TableTag';
import AddressWarp from '@/components/web3/AddressWarp';

type StatusType = 'waiting' | 'ready' | 'cancelled' | 'expired' | 'executed';

const PendingTransactions: React.FC = () => {
	const t = useTranslations('Transactions');
	const [pendingTxs, setPendingTxs] = useState<PendingTx[]>([]);

	const { request: getPendingTransactions } = useApi();

	const fetchPendingTransactions = useCallback(async () => {
		try {
			const { data: waitingData } = await getPendingTransactions('/api/v1/flows/list', { page: 1, page_size: 50, standard: 'compound', status: 'waiting' });
			const { data: executedData } = await getPendingTransactions('/api/v1/flows/list', { page: 1, page_size: 50, standard: 'compound', status: 'ready' });

			const transformedData = [...waitingData.flows, ...executedData.flows].map((tx: RawTx) => ({
				...tx,
				id: tx.queue_tx_hash,
				chainIcon: <div className='w-4 h-4 bg-gray-100 rounded-full' />, // Placeholder icon
			}));
			setPendingTxs(transformedData);
		} catch (error) {
			console.error('Failed to fetch pending transactions:', error);
			toast.error(t('fetchPendingTxsError'));
		}
	}, [getPendingTransactions, t]);

	useEffect(() => {
		fetchPendingTransactions();
	}, [fetchPendingTransactions]);

	const columns = [
		{
			key: 'chain',
			header: t('chain'),
			render: (row: PendingTx) => <ChainLabel chainId={row.chain_id} />
		},
		{
			key: 'timelock_address',
			header: t('timelockAddress'),
			render: (row: PendingTx) => (
			<AddressWarp address={row.contract_address} isShort={true} />
			),
		},
		{
			key: 'tx_hash',
			header: t('txHash'),
			render: (row: PendingTx) => <HashLink hash={row.queue_tx_hash} chainId={row.chain_id} />,
		},
		{
			key: 'created_at',
			header: t('createdAt'),
			render: (row: PendingTx) => <span className='text-sm  '>{formatDate(row.created_at)}</span>,
		},
		{
			key: 'eta',
			header: t('eta'),
			render: (row: PendingTx) => <span className='text-sm  '>{formatDate(row.eta)}</span>,
		},
		{
			key: 'expired_at',
			header: t('expiredAt'),
			render: (row: PendingTx) => <span className='text-sm  '>{formatDate(row.expired_at)}</span>,
		},
		{
			key: 'status',
			header: t('status'),
			render: (row: PendingTx) => <TableTag label={row.status} statusType={row.status as StatusType} />,
		},
	];

	return (
		<div className='bg-white rounded-xl p-6 border border-gray-200 flex flex-col h-full'>
			<div className='mb-4'>
				<SectionHeader title={t('pendingTransactions')} description={t('transactionHistory')} />
			</div>
			<div className='flex-1 overflow-hidden'>
				<TableComponent<PendingTx> columns={columns} data={pendingTxs} showPagination={true} itemsPerPage={10} />
			</div>
		</div>
	);
};

export default PendingTransactions;

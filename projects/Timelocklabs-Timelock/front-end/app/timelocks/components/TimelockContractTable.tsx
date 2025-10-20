'use client';
import React, { useEffect, lazy, Suspense } from 'react';
import { useTranslations } from 'next-intl';
import TableSkeleton from '@/components/ui/TableSkeleton';

// 懒加载TableComponent以减少初始bundle大小
const TableComponent = lazy(() => import('@/components/ui/TableComponent'));
import type { Column } from '@/components/ui/TableComponent';
import SectionHeader from '@/components/ui/SectionHeader';
import { useRouter, useParams } from 'next/navigation';
import { formatSecondsToLocalizedTime } from '@/utils/timeUtils';
import DeleteButton from '@/components/ui/DeleteButton';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import type { BaseComponentProps, VoidCallback } from '@/types';
import type { TimelockContractItem } from '@/store/schema';
import copyToClipboard from '@/utils/copy';
import ChainLabel from '@/components/web3/ChainLabel';
import { FilePlus, FileDown } from 'lucide-react';
import AddressWarp from '@/components/web3/AddressWarp';
import TableTag from '@/components/tableContent/TableTag';

// Define the props for the component
interface TimelockContractTableProps extends BaseComponentProps {
	data: TimelockContractItem[];
	onDataUpdate?: VoidCallback;
}

/**
 * Timelock contract table component with CRUD operations
 *
 * @param props - TimelockContractTable component props
 * @returns JSX.Element
 */
const TimelockContractTable: React.FC<TimelockContractTableProps> = ({ data, onDataUpdate, className }) => {
	const t = useTranslations('TimelockTable');
	const router = useRouter();
	const params = useParams();
	const locale = params.locale as string;

	const { data: deleteResponse, request: deleteContract } = useApi();

	const handleImportContract = () => {
		router.push(`/import-timelock`);
	};

	const handleCreateContract = () => {
		router.push(`/create-timelock`);
	};

	const handleDeleteContract = async (contract: TimelockContractItem) => {
		const standard = contract.standard || 'compound'; // 默认使用 compound 标准
		await deleteContract(`/api/v1/timelock/delete`, {
			standard,
			contract_address: contract.contract_address,
			chainId: contract.chain_id,
		});
	};

	useEffect(() => {
		if (deleteResponse?.success === true) {
			toast.success(t('deleteSuccess'));
			if (onDataUpdate) {
				onDataUpdate();
			}
		} else if (deleteResponse?.success === false && deleteResponse.data !== null) {
			console.error('Failed to delete contract:', deleteResponse.error);
			toast.error(t('deleteError', { message: deleteResponse.error?.message || t('unknown') }));
		}
	}, [deleteResponse, onDataUpdate, t]);

	const columns: Column<TimelockContractItem>[] = [
		{
			key: 'chain',
			header: t('chain'),
			render: (row: TimelockContractItem) => <ChainLabel chainId={row.chain_id} />,
		},
		{
			key: 'name',
			header: t('name'),
			render: (row: TimelockContractItem) => <span className={`text-sm`}>{row.remark}</span>,
		},
		{
			key: 'contract_address',
			header: t('timelock'),
			render: (row: TimelockContractItem) => (
				<div className='flex items-center space-x-2 cursor-pointer' onClick={() => copyToClipboard(row.contract_address)}>
					<AddressWarp address={row.contract_address} />
				</div>
			),
		},
		{
			key: 'admin',
			header: t('owner'),
			render: (row: TimelockContractItem) => (
				<div className='cursor-pointer' onClick={() => copyToClipboard(row.admin)}>
					<AddressWarp address={row.admin} />
				</div>
			),
		},
		{
			key: 'user_permissions',
			header: t('userPermissions'),
			render: (row: TimelockContractItem) => {
				const permissions = (row as TimelockContractItem & { user_permissions?: string[] }).user_permissions;
				if (!permissions || permissions.length === 0) {
					return <div>{t('none')}</div>;
				}

				return (
					<div className='flex flex-wrap gap-2'>
						{permissions.map((permission, index) => permission !== 'creator' && <TableTag key={index} label={permission} colorType='green' />)}
					</div>
				);
			},
		},
		{
			key: 'delay',
			header: t('minDelay'),
			render: (row: TimelockContractItem) => {
				const delay = (row as TimelockContractItem & { delay?: number }).delay;
				if (!delay) return '-';

				const formattedTime = formatSecondsToLocalizedTime(delay, locale === 'zh' ? 'zh' : 'en');
				return <span className='font-mono'>{formattedTime}</span>;
			},
		},
		{
			key: 'operations',
			header: t('operations'),
			render: (row: TimelockContractItem) => (
				<DeleteButton
					onDelete={() => handleDeleteContract(row)}
					title={t('deleteTitle')}
					description={t('deleteDescription', { name: row.remark || t('unknown') })}
					confirmText={t('deleteConfirm')}
					cancelText={t('deleteCancel')}
					variant='destructive'
					size='sm'
				/>
			),
		},
	];

	return (
		<div className={`bg-white ${className || ''}`}>
			<div className='mx-auto'>
				<div className='flex items-center mb-6'>
					<div className='flex-grow'>
						<SectionHeader title={t('title')} description={t('description')} />
					</div>
					<div className='flex transform -translate-y-2.5'>
						<button
							type='button'
							onClick={handleImportContract}
							className='bg-white px-4 py-2 rounded-md border border-gray-300 font-medium hover:bg-gray-50 transition-colors text-sm cursor-pointer flex items-center'>
							<FileDown className='w-4 h-4 mr-2' />
							{t('importExistingContract')}
						</button>
						<button
							type='button'
							onClick={handleCreateContract}
							className='ml-2.5 bg-black text-white px-4 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors text-sm cursor-pointer flex items-center'>
							<FilePlus className='w-4 h-4 mr-2' />
							{t('createNewContract')}
						</button>
					</div>
				</div>
				<Suspense fallback={<TableSkeleton rows={5} columns={6} showHeader={false} />}>
					{/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
					<TableComponent columns={columns as any} data={data} showPagination={true} itemsPerPage={5} />
				</Suspense>
			</div>
		</div>
	);
};

export default TimelockContractTable;

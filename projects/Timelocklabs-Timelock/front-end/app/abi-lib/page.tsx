'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import AddABIForm from './components/AddABIForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useApi } from '@/hooks/useApi';
import { toast } from 'sonner';
import { formatDateWithYear } from '@/utils/utils';

import ViewABIForm from './components/ViewABIForm';

import StarSVG from '@/components/icons/star';
import EllipsesSVG from '@/components/icons/ellipses';
import ABIRowDropdown from './components/RowDropdown';

import type { ABIRow, ABIContent } from '@/types';
import LoadingSkeleton from './components/LoadingSkeleton';
import PageCard from './components/PageCard';
import TableTag from '@/components/tableContent/TableTag';

const ABILibPage: React.FC = () => {
	const t = useTranslations('ABI-Lib');
	const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
	const dropdownRef = useRef<HTMLDivElement | null>(null);
	const buttonRefs = useRef<{ [key: number]: HTMLButtonElement | null }>({});

	const [isAddABIOpen, setIsAddABIOpen] = useState(false);
	const [isViewABIOpen, setIsViewABIOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const [abiToDelete, setAbiToDelete] = useState<ABIRow | null>(null);
	const [abis, setAbis] = useState<ABIRow[]>([]);
	const { data: abiListsRes, request: fetchAbiList, isLoading } = useApi();
	const { request: deleteAbiReq, data: deleteAbiRes } = useApi();
	const [viewAbiContent, setViewAbiContent] = useState<ABIContent | null>(null);

	const refreshAbiList = useCallback(() => {
		fetchAbiList('/api/v1/abi/list');
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isAddABIOpen]);

	useEffect(() => {
		refreshAbiList();
	}, [refreshAbiList]);

	useEffect(() => {
		if (abiListsRes?.success) {
			setAbis(abiListsRes.data.abis);
		} else if (abiListsRes && !abiListsRes.success) {
			toast.error(t('fetchAbiListError', { message: abiListsRes.error?.message || 'Unknown error' }));
		}
	}, [abiListsRes, t]);

	useEffect(() => {
		if (deleteAbiRes?.success) {
			refreshAbiList();
			setIsDeleteDialogOpen(false);
			setAbiToDelete(null);
			toast.success(t('deleteAbiSuccess'));
		} else if (deleteAbiRes && !deleteAbiRes.success) {
			toast.error(t('deleteAbiError', { message: deleteAbiRes.error?.message || 'Unknown error' }));
		}
	}, [deleteAbiRes, refreshAbiList, t]);

	useEffect(() => {
		if (openDropdownId) {
			document.addEventListener('mousedown', handleClickOutside);
		} else {
			document.removeEventListener('mousedown', handleClickOutside);
		}
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [openDropdownId]);

	const handleClickOutside = (event: MouseEvent) => {
		if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
			setOpenDropdownId(null);
		}
	};

	const handleViewABI = async (row: ABIRow) => {
		setIsViewABIOpen(true);
		setViewAbiContent(row);
	};

	const handleEllipsisMenu = (rowId: number) => {
		if (openDropdownId === rowId) {
			setOpenDropdownId(null);
		} else {
			setOpenDropdownId(rowId);
		}
	};

	const handleDeleteABI = (row: ABIRow) => {
		setAbiToDelete(row);
		setIsDeleteDialogOpen(true);
		setOpenDropdownId(null);
	};

	const confirmDeleteABI = async () => {
		if (!abiToDelete) return;

		try {
			await deleteAbiReq(`/api/v1/abi/delete`, {
				id: abiToDelete.id,
			});
		} catch (error) {
			console.error('Delete ABI error:', error);
		}
	};

	const cancelDeleteABI = () => {
		setIsDeleteDialogOpen(false);
		setAbiToDelete(null);
	};

	// Define columns for TableComponent
	const columns = [
		{
			key: 'name',
			header: t('abiName'),
			render: (row: ABIRow) => (
				<div className='flex items-center space-x-2 cursor-pointer' onClick={() => handleViewABI(row)}>
					{!row.is_shared && <StarSVG />}
					<span>{row.name}</span>
				</div>
			),
		},
		// { key: "owner", header: t("addressUser") },
		{
			key: 'created_at',
			header: t('addedTime'),
			render: (row: ABIRow) => formatDateWithYear(row.created_at),
		},
		{
			key: 'type',
			header: t('abiType'),
			render: (row: ABIRow) => <TableTag
				label={row.is_shared ? t('platformShared') : t('userImported')}
				colorType={row.is_shared ? 'default' : 'green'}
			/>
		},
		{
			key: 'operations',
			header: t('operations'), // Operations column
			render: (row: ABIRow) => (
				<div className='relative'>
					<button
						ref={(el) => { buttonRefs.current[row.id] = el; }}
						type='button'
						onClick={() => handleEllipsisMenu(row.id)}
						className='  hover:text-black p-1 rounded-md hover:bg-gray-100 transition-colors'
						aria-label='More options'
						title='More options'>
						<EllipsesSVG />
					</button>
					<ABIRowDropdown
						isOpen={openDropdownId === row.id}
						dropdownRef={dropdownRef}
						onDelete={() => handleDeleteABI(row)}
						onView={() => handleViewABI(row)}
						t={t}
						isShared={row.is_shared}
						buttonRef={buttonRefs.current[row.id] ? { current: buttonRefs.current[row.id]! } : undefined}
					/>
				</div>
			),
		},
	];

	if (isLoading) return <LoadingSkeleton />;

	return (
		<>
			<PageCard abis={abis} columns={columns} setIsAddABIOpen={setIsAddABIOpen} />
			<AddABIForm isOpen={isAddABIOpen} onClose={() => setIsAddABIOpen(false)} />
			<ViewABIForm
				isOpen={isViewABIOpen}
				onClose={() => setIsViewABIOpen(false)}
				viewAbiContent={viewAbiContent as ABIContent} // Safe cast, ensure not null when opening
			/>
			<ConfirmDialog
				isOpen={isDeleteDialogOpen}
				onClose={cancelDeleteABI}
				onConfirm={confirmDeleteABI}
				title={t('deleteDialog.title')}
				description={t('deleteDialog.description', { name: abiToDelete?.name || '' })}
				confirmText={t('deleteDialog.confirmText')}
				cancelText={t('deleteDialog.cancelText')}
				variant='destructive'
			/>
		</>
	);
};

export default ABILibPage;

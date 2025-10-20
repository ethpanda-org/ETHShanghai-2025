'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ConfirmCreationDialogProps } from '@/types';
import ParameterDisplayRow from './ParameterDisplayRow';
import ChainLabel from '@/components/web3/ChainLabel';
import HashLink from '@/components/web3/HashLink';
import AddressWarp from '@/components/web3/AddressWarp';

const ConfirmCreationDialog: React.FC<ConfirmCreationDialogProps> = ({ isOpen, onClose, onConfirm, creationDetails }) => {
	const t = useTranslations('ConfirmCreationDialog');
	const dialogRef = useRef<HTMLDivElement>(null);
	const [remark, setRemark] = useState('');

	useEffect(() => {
		if (isOpen) {
			setRemark('');
		}
	}, [isOpen]);

	useEffect(() => {
		if (!isOpen) return;

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				onClose();
			}
		};

		document.addEventListener('keydown', handleEscape);

		if (dialogRef.current) {
			dialogRef.current.focus();
		}

		return () => {
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isOpen, onClose]);

	const handleConfirm = () => {
		onConfirm(remark);
	};

	const handleRemarkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setRemark(e.target.value.trim());
	};

	if (!isOpen) return null;

	const dialogTitleId = 'confirm-creation-dialog-title';

	return (
		<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
			<div
				ref={dialogRef}
				role='dialog'
				aria-modal='true'
				aria-labelledby={dialogTitleId}
				tabIndex={-1}
				className='bg-white p-6 rounded-lg w-full max-w-xl mx-4 relative outline-none'>
				<h2 id={dialogTitleId} className='text-xl font-semibold mb-6'>
					{t('title')}
				</h2>

				<div className='flex flex-col gap-2 pr-10'>
					<ParameterDisplayRow label={t('chainLabel')}>
						<ChainLabel chainId={creationDetails.chain_id} />
					</ParameterDisplayRow>
					<ParameterDisplayRow label={t('timelockAddressLabel')}>
						<AddressWarp address={creationDetails.timelockAddress} />
					</ParameterDisplayRow>

					<ParameterDisplayRow label={t('transactionHashLabel')}>
						<HashLink className='text-sm' hash={creationDetails.transactionHash} chainId={creationDetails.chain_id} isShort={false} ></HashLink>
					</ParameterDisplayRow>

					<ParameterDisplayRow label={t('initiatingAddressLabel')}>{creationDetails.initiatingAddress}</ParameterDisplayRow>
				</div>

				<div className='my-4'>
					<label className='block text-sm font-medium   mb-1'>
						{t('contractRemarkLabel')} <span className='text-red-500'>*</span>
					</label>
					<input
						type='text'
						className={`mt-1 block w-[510px] px-3 py-2 rounded-md border bg-white focus:ring-1 ${remark.length === 0 ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-black focus:ring-black'
							}`}
						placeholder={t('contractRemarkPlaceholder')}
						value={remark}
						onChange={handleRemarkChange}
						required
					/>
					{remark.length === 0 && <p className='mt-1 text-sm text-red-600'>{t('contractRemarkRequired')}</p>}
				</div>

				{/* Action Buttons */}
				<div className='flex justify-end space-x-3 mt-6'>
					<button type='button' onClick={onClose} className='bg-white px-6 py-2 rounded-md border border-gray-300 font-medium hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50'>
						{t('cancel')}
					</button>
					<button type='button' onClick={handleConfirm} className='bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors cursor-pointer disabled:opacity-50'>
						{t('confirmAdd')}
					</button>
				</div>
			</div>
		</div>
	);
};

export default ConfirmCreationDialog;

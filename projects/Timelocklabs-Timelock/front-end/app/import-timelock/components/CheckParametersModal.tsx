// components/CheckParametersDialog.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { compoundTimelockAbi } from '@/contracts/abis/CompoundTimelock';
import { formatTimeRemaining } from '@/utils/utils';
import AddressWarp from '@/components/web3/AddressWarp';
import ChainLabel from '@/components/web3/ChainLabel';
import TableTag from '@/components/tableContent/TableTag';

// Define interface for the data this dialog will display
interface CheckParametersDialogProps {
	isOpen: boolean; // Controls if the dialog is visible
	onClose: () => void; // Callback to close the dialog (used by buttons & Escape key)
	onConfirm: (abiContent: string) => void; // Callback on confirm, passes updated ABI content
	abiText: string;
	parameters: {
		chainId: string;
		chainName: string;
		chainIcon?: React.ReactNode;
		isValid: boolean;
		standard: string;
		contractAddress: string;
		minDelay: number;
		admin: string;
		gracePeriod: number;
		minimumDelay: number;
		maximumDelay: number;
	};
}

const CheckParametersDialog: React.FC<CheckParametersDialogProps> = ({ isOpen, onClose, onConfirm, abiText, parameters }) => {
	const t = useTranslations('ImportTimelock.modal');
	const [abiContent, setAbiContent] = useState<string>(abiText || '');
	const dialogRef = useRef<HTMLDivElement>(null);

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

	useEffect(() => {
		setAbiContent(JSON.stringify(compoundTimelockAbi, null, 2));
	}, []);

	if (!isOpen) return null;

	const handleConfirm = () => {
		onConfirm(abiContent);
		setAbiContent(JSON.stringify(compoundTimelockAbi, null, 2));
	};

	const handleCancel = () => {
		onClose();
		setAbiContent(JSON.stringify(compoundTimelockAbi, null, 2));
	};

	const ParameterDisplayRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
		<div className='mb-6'>
			<label className='block text-sm font-bold'>{label}</label>
			<div className='rounded-md inline-flex items-center text-sm'>{children}</div>
		</div>
	);

	const dialogTitleId = 'check-params-dialog-title';

	return (
		<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
			<div
				ref={dialogRef}
				role='dialog'
				aria-modal='true'
				aria-labelledby={dialogTitleId}
				tabIndex={-1}
				className='bg-white p-6 rounded-lg max-w-[800px] mx-4 relative outline-none'
			>
				<h2 id={dialogTitleId} className='text-xl font-semibold mb-6'>
					{t('title')}
				</h2>
				<div className='flex gap-8 mb-4'>
					<div>
						<ParameterDisplayRow label={t('chain')}>
							<ChainLabel chainId={parameters.chainId} />
						</ParameterDisplayRow>
						<ParameterDisplayRow label={t('contractStandard')}>
							<TableTag label={parameters.standard} colorType='default' />
						</ParameterDisplayRow>
						<ParameterDisplayRow label={t('contractAddress')}>
							<AddressWarp address={parameters.contractAddress} />
						</ParameterDisplayRow>
						<ParameterDisplayRow label={t('admin')}>
							<AddressWarp address={parameters.admin} />
						</ParameterDisplayRow>
					</div>
					<div className='w-[150px] mr-[80px]'>
						<ParameterDisplayRow label={t('minDelay')}>
							<TableTag label={formatTimeRemaining(parameters.minDelay)} colorType='default' />
						</ParameterDisplayRow>

						<ParameterDisplayRow label={t('gracePeriod')}>
							<TableTag label={formatTimeRemaining(parameters.gracePeriod)} colorType='default' />
						</ParameterDisplayRow>
						<ParameterDisplayRow label={t('maximumDelay')}>
							<TableTag label={formatTimeRemaining(parameters.maximumDelay)} colorType='default' />
						</ParameterDisplayRow>
					</div>
				</div>

				<div className='mb-4'>
					<label className='block text-sm font-bold mb-1'>{t('abi')}</label>
					<textarea
						readOnly
						aria-label='ABI Content'
						value={abiContent}
						className='
              mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md
              focus:outline-none focus:ring-black focus:border-black
              sm:text-sm bg-gray-100
            '
						rows={8}
					/>
				</div>

				<div className='flex justify-end space-x-3 mt-6'>
					<button
						type='button'
						onClick={handleCancel}
						className='bg-white px-6 py-2 rounded-md border border-gray-300 font-medium hover:bg-gray-50 transition-colors'>
						{t('cancel')}
					</button>
					<button type='button' onClick={handleConfirm} className='bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors cursor-pointer'>
						{t('confirm')}
					</button>
				</div>
			</div>
		</div>
	);
};

export default CheckParametersDialog;

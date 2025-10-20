'use client';
import React, { useState, useEffect } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import TextInput from '@/components/ui/TextInput';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useApi } from '@/hooks/useApi';

interface EditMailboxModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void; // Callback to trigger re-fetch in parent
	initialData: { id: string; email: string; remark?: string } | null;
}

const EditMailboxModal: React.FC<EditMailboxModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
	const t = useTranslations('Notify.editMailbox');
	const [emailRemark, setEmailRemark] = useState(initialData?.remark || '');

	const { request: updateEmailNotification } = useApi();

	useEffect(() => {
		if (initialData) {
			setEmailRemark(initialData.remark || '');
		}
	}, [initialData]);

	const handleCancel = () => {
		onClose();
		// Reset form state on cancel
		setEmailRemark(initialData?.remark || '');
	};

	const handleSave = async () => {
		if (!emailRemark) {
			toast.error(t('emailRemarkRequired'));
			return;
		}

		if (!initialData?.email) {
			toast.error(t('cannotGetEmailAddress'));
			return;
		}

		try {
			await updateEmailNotification('/api/v1/emails/remark', { id: parseInt(initialData.id), remark: emailRemark });

			toast.success(t('updateSuccess'));
			onSuccess();
			onClose();
		} catch (error) {
			console.error('Failed to update mailbox:', error);
			toast.error(
				t('updateError', {
					message: error instanceof Error ? error.message : t('unknownError'),
				})
			);
		}
	};

	if (!isOpen) {
		return null;
	}

	return (
		<div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50'>
			<div className='bg-white rounded-lg border border-gray-200 flex flex-col' style={{ width: 558, maxHeight: '90vh', overflowY: 'auto' }}>
				<div className='p-6'>
					<SectionHeader title={t('title')} description={t('description')} />

					<TextInput
						label={t('emailAddressReadOnly')}
						value={initialData?.email || ''}
						onChange={() => {}} // Read-only
						placeholder=''
						disabled
					/>

					<TextInput label={t('emailRemark')} value={emailRemark} onChange={setEmailRemark} placeholder='' />
				</div>

				<div className='flex justify-end space-x-3 mt-auto p-6 border-t border-gray-200'>
					<button
						type='button'
						onClick={handleCancel}
						className='bg-white px-6 py-2 rounded-md border border-gray-300 font-medium hover:bg-gray-50 transition-colors'>
						Cancel
					</button>
					<button type='button' onClick={handleSave} className='bg-black text-white px-6 py-2 rounded-md font-medium hover:bg-gray-800 transition-colors'>
						Save
					</button>
				</div>
			</div>
		</div>
	);
};

export default EditMailboxModal;

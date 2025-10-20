import React, { useEffect, useState } from 'react';
import SectionHeader from '@/components/ui/SectionHeader';
import { useTranslations } from 'next-intl';
import type { MailboxSelectionProps } from '@/types';
import { useApi } from '@/hooks/useApi';
import { Mail } from 'lucide-react';
import Link from 'next/link';

const MailboxSelection: React.FC<MailboxSelectionProps> = () => {
	const t = useTranslations('CreateTransaction');
	const { request: getEmailNotifications } = useApi();
	const [mailboxOptions, setMailboxOptions] = useState<Array<{ id: number; email: string; email_remark?: string }>>([]);

	useEffect(() => {
		const fetchEmails = async () => {
			try {
				const response = await getEmailNotifications('/api/v1/emails', { page: 1, page_size: 100 });
				if (response?.data?.emails) {
					setMailboxOptions(response.data.emails);
				} else {
					setMailboxOptions([]);
					console.warn('No email data received from API');
				}
			} catch (error) {
				console.error('Failed to fetch email notifications:', error);
			}
		};

		fetchEmails();
	}, [getEmailNotifications]);

	return (
		// Change to vertical (top-bottom) layout
		<div className='bg-white py-6 flex flex-col gap-2 items-start'>
			{/* Top: Section Header */}
			<div>
				<SectionHeader title={t('mailbox.title')} description={t('mailbox.description')} />
			</div>

			<div className='flex flex-wrap gap-2'>
				{mailboxOptions.length > 0 ? (
					mailboxOptions.map(option => (
						<div key={option.id} className='flex items-center border borer-gray-300 space-x-2 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors bg-gray-100'>
							<div className='text-sm cursor-pointer flex justify-center items-center'>
								<div><Mail className='mr-1' height={16} width={16} /></div>
								<div className='leading-5'>{option.email_remark || option.email}</div>
							</div>
						</div>
					))
				) : (
					<Link href='/notify'>
						<div className='text-sm text-gray-500'>{t('mailbox.noMailbox')}</div>
					</Link>
				)}
			</div>

		</div>
	);
};

export default MailboxSelection;

// components/email-notifications/EmailRulesHeader.tsx
import React from 'react';
import { useTranslations } from 'next-intl';

const EmailRulesHeader: React.FC = () => {
	const t = useTranslations('Notify.emailRulesHeader');

	return (
		<div className='bg-black text-white p-4 px-6 rounded-lg relative overflow-hidden'>
			{/* Content: Title and Rules */}
			<div className='relative z-10'>
				{/* Title */}
				<div className='flex items-start space-x-3 mb-3'>
					<svg className='w-6 h-6 text-gray-400 flex-shrink-0' fill='currentColor' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'>
						<path d='M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0018 4H2a2 2 0 00-.003 1.884z'></path>
						<path d='M18 8.118l-8 4-8-4V14a2 2 0 002 2h14a2 2 0 002-2V8.118z'></path>
					</svg>
					<h2 className='text-xl font-semibold'>{t('title')}</h2>
				</div>

				{/* Rules List */}
				<div>
					<ol className='list-decimal list-inside space-y-1 text-sm opacity-80 font-normal tracking-normal text-white'>
						<li>{t('rule1')}</li>
						<li>
							{t('rule2Before')}
							<span className='underline underline-offset-0 decoration-[0px]'>official@timelock.com</span>
							{t('rule2After')}
						</li>
						<li>{t('rule3')}</li>
					</ol>
				</div>
			</div>

			{/* Background Image - Positioned to the right */}
			<div className="absolute top-1/2 right-0 -translate-y-1/2 w-40 h-36 bg-no-repeat bg-cover bg-center pointer-events-none bg-[url('/email-bg.png')]" />
		</div>
	);
};

export default EmailRulesHeader;

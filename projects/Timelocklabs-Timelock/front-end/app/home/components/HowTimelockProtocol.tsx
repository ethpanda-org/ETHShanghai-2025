import React from 'react';
import { useTranslations } from 'next-intl';

const HowTimelockProtocol: React.FC = () => {
	const t = useTranslations('home_page.how_to_use');
	return (
		// Initial state: white background, light border, gray text
		// Hover state (group-hover): black background, white text, blue border (or transparent/dark)
		<div className='p-8 rounded-xl border border-gray-200 group hover:bg-black hover:shadow-md hover:border-black transition-all duration-300 cursor-pointer'>
			<h3 className='text-lg font-semibold mb-4 flex items-center group-hover:text-white transition-colors duration-300'>
				<span className='text-black mr-2 group-hover:text-white transition-colors duration-300'>&gt;</span> {t('title')}
			</h3>
			<p className='  text-sm mb-6 leading-relaxed group-hover:text-gray-200 transition-colors duration-300'>{t('description')}</p>
			<a
				href='https://docs.timelock.tech/getting-started/how-to-use-the-timelock'
				target='_blank'
				className='inline-flex items-center justify-center bg-white text-black py-2 px-4 rounded-md text-sm font-semibold border border-gray-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-black focus:ring-opacity-50 transition-all duration-300'>
				{t('read_more')}
				<svg className='ml-2 w-4 h-4 transform transition-transform duration-300' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
					<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M17 8l4 4m0 0l-4 4m4-4H3'></path>
				</svg>
			</a>
		</div>
	);
};

export default HowTimelockProtocol;

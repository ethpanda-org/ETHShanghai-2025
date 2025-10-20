'use client';
import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import bg_png from '@/public/bg.png';

const EcosystemSearchHeader: React.FC = () => {
	const t = useTranslations('Ecosystem');
	return (
		<div
			className='bg-black text-white p-6 min-h-[60px] rounded-lg flex items-center space-x-4'
			style={{
				backgroundImage: `url(${bg_png.src})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			}}>
			<Image src='/ecoPanter.png' alt='Ecosystem Partner' width={20} height={20} className='text-gray-400' />
			<h2 className='text-xl font-semibold'>{t('FindEcosystemPartner')}</h2>
		</div>
	);
};

export default EcosystemSearchHeader;

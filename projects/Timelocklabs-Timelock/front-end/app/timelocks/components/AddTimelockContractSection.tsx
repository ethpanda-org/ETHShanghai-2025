// components/AddTimelockContractSection.tsx
'use client';
import React from 'react';
import SectionHeader from '@/components/ui/SectionHeader'; // Assuming SectionHeader is in components/ui/
import TimelockOptionCard from './TimelockOptionCard'; // Assuming TimelockOptionCard is in components/
import { useRouter } from 'next/navigation';
import create_bg_img from '@/public/create_bg.png'; // Adjust the path as necessary
import import_bg_img from '@/public/import_bg.png'; // Adjust the path as necessary
import { useTranslations } from 'next-intl';

const AddTimelockContractSection: React.FC = () => {
	const t = useTranslations('Timelocks'); // Assuming translations are set up for Timelock
	const router = useRouter();

	const handleCreateContract = () => {
		router.push(`/create-timelock`);
	};

	const handleImportContract = () => {
		router.push(`/import-timelock`);
	};

	return (
		<div className='bg-white '>
			{/* Wrapper with a light gray background */}
			<div className='mx-auto'>
				{/* Max width container to center content */}
				{/* Section Header */}
				<SectionHeader title={t('addTimelock')} description={t('addTimelockDescription')} />
				{/* Two option cards in a responsive grid layout */}
				<div className='grid grid-cols-1 md:grid-cols-2 gap-6 mt-8'>
					{/* Black Card: Create Timelock Contract */}
					<TimelockOptionCard
						title={t('create_title')}
						description={t('create_des')}
						bgColor='bg-black'
						textColor='text-white'
						bgImage={create_bg_img.src} // Background image for the black card
						onClick={handleCreateContract}
					/>

					{/* White Card: Import existing Timelock Contract */}
					<TimelockOptionCard
						title={t('import_title')}
						description={t('import_des')}
						bgColor='bg-white'
						textColor='text-black'
						borderColor='border-gray-200' // Explicit border for visibility on white background
						bgImage={import_bg_img.src} // Background image for the white card
						onClick={handleImportContract}
					/>
				</div>
			</div>
		</div>
	);
};

export default AddTimelockContractSection;

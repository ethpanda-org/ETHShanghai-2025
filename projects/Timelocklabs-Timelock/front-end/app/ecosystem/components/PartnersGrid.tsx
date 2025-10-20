'use client';
import React from 'react';
import FeatureCard from '@/components/ui/FeatureCard';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import type { Partner } from '@/types/api';
import PageSkeleton from './PageSkeleton';

interface PartnersGridProps {
	sponsors: Partner[];
	partners: Partner[];
	isLoading: boolean;
}

const PartnersGrid: React.FC<PartnersGridProps> = ({ sponsors, partners, isLoading }) => {
	const t = useTranslations('Ecosystem');

	return (
		<>
			<div>
				<h2 className='text-2xl font-bold mb-6'>{t('sponsors')}</h2>
				{isLoading ?
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
						{Array.from({ length: 3 }).map((_, index) => (
							<PageSkeleton key={index} />
						))}
					</div>
				:	<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
						{sponsors.map(partner => (
							<FeatureCard
								key={partner.id}
								title={partner.name}
								description={partner.description}
								icon={<Image src={partner.logo_url} alt={partner.name} width={40} height={40} className='w-10 h-10 rounded-full overflow-hidden' />}
								link={partner.link}
							/>
						))}
					</div>
				}
			</div>
			<div>
				<h2 className='text-2xl font-bold mb-6'>{t('partners')}</h2>
				{isLoading ?
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
						{Array.from({ length: 3 }).map((_, index) => (
							<PageSkeleton key={index} />
						))}
					</div>
				:	<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
						{partners.map(partner => (
							<FeatureCard
								key={partner.id}
								title={partner.name}
								description={partner.description}
								icon={<Image src={partner.logo_url} alt={partner.name} width={40} height={40} className='w-10 h-10 rounded-full overflow-hidden' />}
								link={partner.link}
							/>
						))}
					</div>
				}
			</div>
		</>
	);
};

export default PartnersGrid;

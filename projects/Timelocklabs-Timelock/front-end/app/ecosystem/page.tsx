'use client';
import React, { useEffect, useState } from 'react';
import EcosystemSearchHeader from './components/Header';
import PartnersGrid from './components/PartnersGrid';

import { useApi } from '@/hooks/useApi';
import type { Partner } from '@/types';

const EcosystemPage: React.FC = () => {
	const [sponsors, setSponsors] = useState<Partner[]>([]);
	const [partners, setPartners] = useState<Partner[]>([]);

	const { request: getSponsorsReq, isLoading } = useApi();

	useEffect(() => {
		fetchSponsors();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const fetchSponsors = async () => {
		const { data, success } = await getSponsorsReq('/api/v1/sponsors/public');
		if (success && data) {
			setSponsors(data.sponsors || []);
			setPartners(data.partners || []);
		}
	};

	return (
		<>
			<div className='min-h-screen  '>
				<div className='mx-auto flex flex-col space-y-8 pt-4'>
					<EcosystemSearchHeader />
					<PartnersGrid sponsors={sponsors} partners={partners} isLoading={isLoading} />
				</div>
			</div>
		</>
	);
};

export default EcosystemPage;

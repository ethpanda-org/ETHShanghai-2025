'use client';

import React, { useEffect } from 'react';
import AddTimelockContractSection from './components/AddTimelockContractSection';
import TimelockContractTable from './components/TimelockContractTable';
import TableSkeleton from '@/components/ui/TableSkeleton';
import { useApi } from '@/hooks/useApi';
import { useAuthStore } from '@/store/userStore';
import type { TimelockContractItem } from '@/types';

const Timelocks: React.FC = () => {
	const { data: timelockListResponse, request: fetchTimelockList, isLoading } = useApi();
	const { allTimelocks, setAllTimelocks } = useAuthStore();

	const refetchTimelocks = React.useCallback(() => {
		fetchTimelockList('/api/v1/timelock/list');
	}, [fetchTimelockList]);

	useEffect(() => {
		refetchTimelocks();
	}, [refetchTimelocks]);

	useEffect(() => {
		if (timelockListResponse && timelockListResponse.success && timelockListResponse.data) {
			const compoundTimelocks: TimelockContractItem[] = timelockListResponse.data.compound_timelocks.map(
				(timelock: TimelockContractItem): TimelockContractItem => ({
					...timelock,
					standard: 'compound' as const,
				})
			);
			const openzeppelinTimelocks: TimelockContractItem[] = timelockListResponse.data.openzeppelin_timelocks.map(
				(timelock: TimelockContractItem): TimelockContractItem => ({
					...timelock,
					standard: 'openzeppelin' as const,
				})
			);
			const combinedTimelocks = [...compoundTimelocks, ...openzeppelinTimelocks];
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			setAllTimelocks(combinedTimelocks as any);
		}
	}, [timelockListResponse, setAllTimelocks]);

	if (isLoading) {
		return (
			<div className='bg-white'>
				<div className='mx-auto'>
					<TableSkeleton rows={5} columns={7} showHeader={true} />
				</div>
			</div>
		);
	}

	const hasTimelocks = allTimelocks.length > 0;

	return <>{hasTimelocks ? <TimelockContractTable data={allTimelocks} onDataUpdate={refetchTimelocks} /> : <AddTimelockContractSection />}</>;
};

export default Timelocks;

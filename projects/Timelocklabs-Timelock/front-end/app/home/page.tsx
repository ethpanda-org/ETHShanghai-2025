'use client';

import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useActiveWalletConnectionStatus } from 'thirdweb/react';
import { useApi } from '@/hooks/useApi';
import LoadingSkeleton from './components/LoadingSkeleton';
import { useAuthStore } from '@/store/userStore';
import { TimelockContractItem } from '@/types';

// 懒加载组件以减少初始bundle大小
const Asset = lazy(() => import('./components/Asset'));
const CreateProtocol = lazy(() => import('./components/CreateProtocol'));


export default function Home() {
	const connectionStatus = useActiveWalletConnectionStatus();
	const isConnected = connectionStatus === 'connected';

	const [currentView, setCurrentView] = useState<'loading' | 'create' | 'asset'>('loading');
	const [timelockData, setTimelockData] = useState<{ total: number; compound_timelocks: TimelockContractItem[] } | null>(null);

	const { request: getTimelockList, isLoading, data: timelockListResponse } = useApi();
	const {  setAllTimelocks } = useAuthStore();


	useEffect(() => {
		if (isConnected) {
			fetchTimelockData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isConnected]);


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


	const fetchTimelockData = async () => {
		try {
			const { data } = await getTimelockList('/api/v1/timelock/list', { page: 1, page_size: 10 });
			// Transform the API response to match our expected types
			const transformedData = {
				...data,
				compound_timelocks: data.compound_timelocks.map((timelock: TimelockContractItem) => ({
					...timelock,
					standard: 'compound' as const,
				}))
			};
			setTimelockData(transformedData);
		} catch (error) {
			console.error('Failed to fetch timelock data:', error);
		}
	};

	const hasTimelocks = !!(timelockData && timelockData.total > 0);

	useEffect(() => {
		// getUserToken()
	}, []);

	// 处理页面状态变化
	useEffect(() => {
		if (!isConnected) {
			setCurrentView('create');

			return;
		}

		if (isLoading) {
			setCurrentView('loading');

			return;
		}

		const timer = setTimeout(() => {
			setCurrentView(hasTimelocks ? 'asset' : 'create');

		}, 200); // 短暂延迟让淡出动画完成

		return () => clearTimeout(timer);
	}, [isConnected, isLoading, hasTimelocks]);

	// 渲染当前视图
	const renderCurrentView = () => {
		switch (currentView) {
			case 'loading':
				return <LoadingSkeleton />;
			case 'asset':
				return (
					<Suspense fallback={<LoadingSkeleton />}>
						<Asset timelocks={timelockData!.compound_timelocks} />
					</Suspense>
				);
			case 'create':
			default:
				return (
					<Suspense fallback={<LoadingSkeleton />}>
						<CreateProtocol />
					</Suspense>
				);
		}
	};

	return <div className='min-h-screen'>{renderCurrentView()}</div>;
}

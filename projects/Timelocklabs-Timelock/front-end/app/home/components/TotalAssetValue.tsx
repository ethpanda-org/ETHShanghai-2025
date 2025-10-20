// components/TotalAssetValue.tsx
import React from 'react';
import { useCountUp } from '@/hooks/useCountUp';
import { useTranslations } from 'next-intl';

interface TotalAssetValueProps {
	totalUsdValue: number;
}

const TotalAssetValue: React.FC<TotalAssetValueProps> = ({ totalUsdValue }) => {
	const t = useTranslations('assetList');
	const countUpRef = useCountUp({
		end: totalUsdValue,
		duration: 2,
		decimals: 2,
		prefix: '$',
		separator: ',',
	});

	// const percentageRef = useCountUp({
	// 	end: 15.11,
	// 	duration: 2,
	// 	decimals: 2,
	// 	suffix: '%',
	// 	prefix: '+',
	// });

	return (
		<div className='bg-white  h-full p-6 rounded-lg border border-gray-200'>
			<h2 className='text-sm font-medium mb-1'>{t('totalAssetValue')}</h2>
			<div className='flex items-baseline space-x-2'>
				<p className='text-3xl font-bold'>
					<span ref={countUpRef}>$0.00</span>
				</p>
				{/* <span className='text-green-500 text-sm font-semibold'>
					<span ref={percentageRef}>+0.00%</span>
				</span> */}
			</div>
		</div>
	);
};

export default TotalAssetValue;

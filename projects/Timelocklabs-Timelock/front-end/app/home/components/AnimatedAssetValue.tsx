import React from 'react';
import { useCountUp } from '@/hooks/useCountUp';

interface AnimatedAssetValueProps {
	value: number;
	decimals?: number;
	prefix?: string;
	suffix?: string;
	className?: string;
	fallback?: string;
}

const AnimatedAssetValue: React.FC<AnimatedAssetValueProps> = ({ value, decimals = 2, prefix = '', suffix = '', className = '', fallback = '0.00' }) => {
	const countUpRef = useCountUp({
		end: value || 0,
		duration: 1.5,
		decimals,
		prefix,
		suffix,
		separator: ',',
	});

	return (
		<span ref={countUpRef} className={className}>
			{prefix}
			{fallback}
			{suffix}
		</span>
	);
};

export default AnimatedAssetValue;

import React from 'react';
import { cn } from '@/utils/utils';

interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	text?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className, text }) => {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12',
	};

	return (
		<div className={cn('flex flex-col items-center justify-center space-y-3', className)}>
			<div className={cn('animate-spin rounded-full border-2 border-gray-300 border-t-black', sizeClasses[size])} />
			{text && <p className='text-sm   animate-pulse'>{text}</p>}
		</div>
	);
};

export default LoadingSpinner;

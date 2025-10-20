'use client';

import React from 'react';
import { useRive } from '@rive-app/react-canvas';
import { cn } from '@/utils/utils';

interface HomeAnimationProps {
	className?: string;
	autoplay?: boolean;
	onAnimationLoad?: () => void;
}

const HomeAnimation: React.FC<HomeAnimationProps> = ({ className, onAnimationLoad }) => {
	const { RiveComponent } = useRive({
		src: '/homeAnimation.riv',
		autoplay: true,
		stateMachines: "homeAnimation",
		onLoad: () => {
			onAnimationLoad?.();
		},
		onLoadError: () => {
			console.error('Failed to load home animation');
		},
	});

	return (
		<div className={cn('w-full h-full cursor-pointer', className)}>
			<RiveComponent className='w-full h-full' />
		</div>
	);
};

export default HomeAnimation;

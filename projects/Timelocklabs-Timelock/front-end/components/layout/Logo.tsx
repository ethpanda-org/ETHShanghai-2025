import React from 'react';
import type { BaseComponentProps } from '@/types';
import Image from "next/image"

interface LogoProps extends BaseComponentProps {
	size?: 'sm' | 'md' | 'lg';
	color?: "white" | "black"
}

/**
 * Logo component with customizable size
 *
 * @param props - Logo component props
 * @returns JSX.Element
 */
const Logo: React.FC<LogoProps> = ({ size = 'md', className, color = 'white' }) => {
	let width = 180;
	let height = 36;
	switch (size) {
		case 'sm':
			width = 120;
			height = 120/4.08;
			break;
		case 'md':
			width = 180;
			height = 180/4.08;
			break;
		case 'lg':
			width = 240;
			height = 240/4.08;
			break;
		default:
			break;
	}

	return (
		<div className={`${className || ''}`}>
			{color === 'white' ? <Image src='/logo/logo-banner-white.png' alt='Logo' width={width} height={height} className={`w-[${width}px] h-[${height}px]`} /> : <Image src='/logo/logo-banner-black.png' alt='Logo' width={width} height={height} className={`w-[${width}px] h-[${height}px]`} />}
		</div>
	);
};

export default Logo;

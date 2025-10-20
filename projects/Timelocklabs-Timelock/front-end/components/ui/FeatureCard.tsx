import React from 'react';
import type { BaseComponentProps } from '@/types';

interface FeatureCardProps extends BaseComponentProps {
	title: string;
	description: string;
	icon?: React.ReactNode;
	link?: string;
}

/**
 * Feature card component with title, description, icon and optional link
 *
 * @param props - FeatureCard component props
 * @returns JSX.Element
 */
const FeatureCard: React.FC<FeatureCardProps> = ({ title, description, icon, link, className }) => {

	const handleClick = () => {
		if (link) {
			window.open(link, '_blank');
		}
	};


	return (
		<div onClick={handleClick} className={`bg-white p-6 rounded-lg border border-gray-200 flex flex-col items-start hover:shadow-md transition-shadow cursor-pointer ${className || ''}`}>
			<div className='flex justify-between items-center w-full mb-4'>
				{/* Placeholder for icon, replace with actual icon components if available */}
				<div className='w-10 h-10 rounded-full flex items-center justify-center overflow-hidden'>
					{icon || 'Icon'} {/* Fallback text if no icon prop */}
				</div>
				<a href={link} className='text-gray-400 hover:text-blue-500' target='_blank' rel='noopener noreferrer'>
					<svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
						<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'></path>
					</svg>
				</a>
			</div>
			<h4 className='text-base font-semibold mb-1'>{title}</h4>
			<p className='  text-sm'>{description}</p>
		</div>
	);
};

export default FeatureCard;

import React from 'react';
import type { BaseComponentProps } from '@/types';

interface SectionHeaderProps extends BaseComponentProps {
	title: string;
	description: string;
	icon?: React.ReactNode;
}

/**
 * Section header component with title, description and optional icon
 *
 * @param props - SectionHeader component props
 * @returns JSX.Element
 */
const SectionHeader: React.FC<SectionHeaderProps> = ({ title, description, icon, className }) => {
	return (
		<div className={`mb-4 ${className || ''}`}>
			<h2 className='text-lg font-semibold flex items-center space-x-2'>
				<span>{title}</span>
				{icon && <span>{icon}</span>}
			</h2>
			<p className='text-sm   pt-2'>{description}</p>
		</div>
	);
};

export default SectionHeader;

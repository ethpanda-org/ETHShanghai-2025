// components/ui/NewButton.tsx
import React from 'react';
import AddSVG from '@/components/icons/add';
import type { BaseComponentProps, VoidCallback } from '@/types';

interface NewButtonProps extends BaseComponentProps {
	onClick: VoidCallback;
	label?: string;
}

/**
 * New button component with add icon
 *
 * @param props - NewButton component props
 * @returns JSX.Element
 */
const NewButton: React.FC<NewButtonProps> = ({ onClick, label = 'New', className }) => {
	return (
		<button
			onClick={onClick}
			className={`inline-flex cursor-pointer items-center space-x-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black-500 ${className || ''}`}>
			<AddSVG />
			{/* Optional label, can be omitted if not needed */}
			<span>{label}</span>
		</button>
	);
};

export default NewButton;

// components/TimelockOptionCard.tsx
import React from 'react';

interface TimelockOptionCardProps {
	title: string;
	description: string;
	bgColor: string; // Tailwind class for background color (e.g., 'bg-black', 'bg-white')
	textColor: string; // Tailwind class for text color (e.g., 'text-white')
	borderColor?: string; // Optional border color (e.g., 'border-gray-200' for the white card)
	bgImage?: string; // Optional background image URL
	onClick?: () => void; // Optional click handler for interactivity
}

import create_bg_img from '@/public/create_bg.png';

const TimelockOptionCard: React.FC<TimelockOptionCardProps> = ({
	title,
	description,
	bgColor,
	textColor,
	// borderColor = 'border-transparent', // Default to no visible border
	bgImage = create_bg_img.src, // Default background image
	onClick,
}) => {
	return (
		<div
			className={`
        ${bgColor} ${textColor}
        rounded-lg
		border
        p-8  /* Card styling */
        flex flex-col justify-end /* Aligns content to the bottom as in the image */
        min-h-[300px] /* Ensures consistent height for both cards */
        cursor-pointer hover:shadow-md transition-shadow duration-200 /* Hover effect */
      `}
			onClick={onClick}
			style={{
				backgroundImage: `url(${bgImage})`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			}} // Background image styling
		>
			<h3 className='text-xl font-semibold mb-2'>{title}</h3>
			<p className='text-sm opacity-80 w-[460px]'>{description}</p> {/* Description with lower opacity */}
		</div>
	);
};

export default TimelockOptionCard;

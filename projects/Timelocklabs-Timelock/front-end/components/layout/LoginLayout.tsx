import React from 'react';
import type { BaseComponentProps } from '@/types';

interface LoginLayoutProps extends BaseComponentProps {
	title: string;
}

/**
 * Login layout component with centered content
 *
 * @param props - LoginLayout component props
 * @returns JSX.Element
 */
export default function LoginLayout({ children, title, className }: LoginLayoutProps) {
	return (
		<div className={`min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 ${className || ''}`}>
			<div className='max-w-md w-full space-y-8'>
				<div>
					<h1 className='text-center text-3xl font-extrabold'>{title}</h1>
				</div>
				<div className='bg-white py-8 px-4 sm:rounded-lg sm:px-10'>{children}</div>
			</div>
		</div>
	);
}

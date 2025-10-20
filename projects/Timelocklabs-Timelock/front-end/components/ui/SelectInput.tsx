import React from 'react';
import Image from 'next/image';
import type { BaseComponentProps, ValueCallback, SelectOption } from '@/types';

interface SelectInputProps extends BaseComponentProps {
	label: string;
	value: string;
	onChange: ValueCallback<string>;
	options: SelectOption[];
	placeholder?: string;
	logo?: string;
	error?: string;
	disabled?: boolean;
}

/**
 * Select input component with label and optional logo
 *
 * @param props - SelectInput component props
 * @returns JSX.Element
 */
const SelectInput: React.FC<SelectInputProps> = ({ logo, label, value, onChange, options, placeholder, error, disabled = false, className }) => {
	return (
		<div className='mb-4'>
			{/* Label for the select input */}
			{/* The label is optional, but it's good for accessibility */}
			{/* If you want to use a logo, you can add it here */}

			<label htmlFor={`select-${label}`} className='block text-sm font-medium   mb-1'>
				{label}
			</label>
			<div className='relative mt-1'>
				{/* The appearance-none class removes the default browser arrow.
            Padding (especially pr-10) is adjusted to make space for the custom arrow. */}
				<div className='flex items-center'>
					{logo && <Image className='rounded-full overflow-hidden h-6 w-6 mr-2' src={logo} alt='Logo' width={24} height={24}  />}
					<select
						id={`select-${label}`}
						className={`block w-full pl-3 pr-8 py-2 border ${
							error ? 'border-red-500' : 'border-gray-300'
						} rounded-md focus:outline-none focus:ring-black focus:border-black sm:text-sm appearance-none ${
							disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'
						} ${className || ''}`}
						value={value}
						onChange={e => onChange(e.target.value)}
						disabled={disabled}>
						{placeholder && (
							<option value='' disabled>
								{placeholder}
							</option>
						)}
						{options.map(option => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
				</div>

				<div className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2'>
					{' '}
					{/* Icon container; pr-4 (16px) positions the icon from the right edge */}
					<svg
						className='h-5 w-5 text-gray-400' // Icon size and color
						xmlns='http://www.w3.org/2000/svg'
						viewBox='0 0 20 20'
						fill='currentColor'
						aria-hidden='true'>
						<path fillRule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clipRule='evenodd' />
					</svg>
				</div>
			</div>
			{error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
		</div>
	);
};

export default SelectInput;

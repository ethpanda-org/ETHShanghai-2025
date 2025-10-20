import React from 'react';
import type { RadioButtonOptionProps } from '@/types';

const RadioButtonOption: React.FC<RadioButtonOptionProps> = ({ id, name, value, label, description, checked, onChange, className = '', disabled = false }) => {
	const baseClasses = `
    flex items-start rounded-lg border cursor-pointer transition-all duration-200 px-3 py-2  border border-gray-300
    ${className}
  `;

	const radioClasses = `
    form-radio h-4 w-4 mt-1 mr-3 focus:ring-offset-0
  `;

	return (
		<label htmlFor={id} className={baseClasses}>
			<input
				type='radio'
				id={id}
				name={name}
				value={value}
				checked={checked}
				onChange={(e) => onChange?.(e.target.value)}
				disabled={disabled}
				className={radioClasses}
				aria-disabled={disabled}
			/>
			<div className='flex-1'>
				<p className='font-medium text-base'>{label}</p>
				{description && <p className='  text-sm mt-1'>{description}</p>}
			</div>
		</label>
	);
};

export default RadioButtonOption;

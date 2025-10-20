// components/ui/TextAreaInput.tsx
import React from 'react';
import type { BaseComponentProps, ValueCallback } from '@/types';

interface TextAreaInputProps extends BaseComponentProps {
	label: string;
	value: string;
	onChange: ValueCallback<string>;
	placeholder?: string;
	rows?: number;
	disabled?: boolean;
	error?: string;
}

/**
 * Textarea input component with label and error handling
 *
 * @param props - TextAreaInput component props
 * @returns JSX.Element
 */
const TextAreaInput: React.FC<TextAreaInputProps> = ({ label, value, onChange, placeholder, rows = 8, disabled = false, error, className }) => {
	return (
		<div className='mb-4'>
			<label className={`block text-sm font-medium mb-1 ${disabled ? 'text-gray-400' : ' '}`}>{label}</label>
			<textarea
				rows={rows}
				className={`
          mt-1 block w-full px-3 py-2 border rounded-md
          focus:outline-none focus:ring-black focus:border-black
          sm:text-sm
          ${error ? 'border-red-500' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white'}
          ${className || ''}
        `}
				placeholder={placeholder || label}
				value={value}
				onChange={e => onChange(e.target.value)}
				disabled={disabled}
			/>
			{error && <p className='mt-2 text-sm text-red-600'>{error}</p>}
		</div>
	);
};

export default TextAreaInput;

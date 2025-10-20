'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ABITextareaProps {
	id?: string;
	label?: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	rows?: number;
	className?: string;
	required?: boolean;
	disabled?: boolean;
}

const ABITextarea: React.FC<ABITextareaProps> = ({ id = 'abi-content', label, value, onChange, placeholder, rows = 5, className = '', required = false, disabled = false }) => {
	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		onChange(e.target.value);
	};

	const textareaClassName = `overflow-y-auto overflow-x-hidden resize-none min-h-[120px] max-h-[200px] whitespace-pre-wrap break-all w-full max-w-full box-border ${className}`;

	return (
		<div className='space-y-2'>
			{label && (
				<Label htmlFor={id} className={required ? "after:content-['*'] after:text-red-500 after:ml-1" : ''}>
					{label}
				</Label>
			)}
			<Textarea
				id={id}
				value={value}
				onChange={handleChange}
				placeholder={placeholder || label}
				rows={rows}
				className={textareaClassName}
				disabled={disabled}
				required={required}
			/>
		</div>
	);
};

export default ABITextarea;

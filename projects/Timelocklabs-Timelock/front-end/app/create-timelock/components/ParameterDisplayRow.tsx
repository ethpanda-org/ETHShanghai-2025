import React from 'react';
import type { ParameterDisplayRowProps } from '@/types';

const ParameterDisplayRow: React.FC<ParameterDisplayRowProps> = ({ label, value, children }) => (
	<div className='mb-4'>
		<div className='text-sm font-bold   mb-1 break-words'>{label}</div>
		<span className='truncate break-words'>{value || children}</span>
	</div>
);

export default ParameterDisplayRow;

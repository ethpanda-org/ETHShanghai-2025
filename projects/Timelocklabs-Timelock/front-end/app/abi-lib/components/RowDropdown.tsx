import React, { RefObject, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import DeleteSVG from '@/components/icons/delete';
import FileSVG from '@/components/icons/file';

interface ABIRowDropdownProps {
	isOpen: boolean;
	dropdownRef: RefObject<HTMLDivElement | null>;
	onDelete: () => void;
	onView: () => void;
	t: (key: string) => string;
	isShared: boolean;
	buttonRef?: RefObject<HTMLButtonElement>;
}

const ABIRowDropdown: React.FC<ABIRowDropdownProps> = ({ isOpen, dropdownRef, onDelete, onView, t, isShared, buttonRef }) => {
	const [position, setPosition] = useState({ top: 0, left: 0 });

	useEffect(() => {
		if (isOpen && buttonRef?.current) {
			const rect = buttonRef.current.getBoundingClientRect();
			setPosition({
				top: rect.bottom + window.scrollY + 4,
				left: rect.right + window.scrollX - 128, // 128px is the width of dropdown (w-32)
			});
		}
	}, [isOpen, buttonRef]);

	if (!isOpen) return null;

	const dropdown = (
		<div ref={dropdownRef} className='fixed w-32 bg-white rounded-md z-50 border border-gray-200' style={{ top: position.top, left: position.left }}>
			{!isShared && (
				<button type='button' onClick={onDelete} className='w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-gray-100 hover:text-red-700 flex items-center space-x-2'>
					<DeleteSVG />
					<span>{t('delete')}</span>
				</button>
			)}
			<button type='button' onClick={onView} className='w-full text-left px-3 py-2 text-xs   hover:bg-gray-100 hover:text-black flex items-center space-x-2'>
				<FileSVG />
				<span>{t('viewABI')}</span>
			</button>
		</div>
	);

	return createPortal(dropdown, document.body);
};

export default ABIRowDropdown;

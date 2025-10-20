'use client';
import { useTranslations } from 'next-intl';
import React, { useState } from 'react';

// Define types for columns and data
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface Column<T = any> {
	key: string; // Unique key for the column, used to access data from row object
	header: string; // Header text to display in the table
	render?: (row: T, rowIndex: number) => React.ReactNode; // Optional custom renderer for cells
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface GenericTableProps<T = any> {
	title?: string; // Optional title for the table card (e.g., "Pending Transactions")
	columns: Column<T>[]; // Array of column definitions
	data: T[]; // Array of row data objects
	showPagination?: boolean; // Whether to display pagination controls (default: true)
	itemsPerPage?: number; // Number of items to show per page (default: 7)
	headerActions?: React.ReactNode; // Slot for custom elements above the table, e.g., buttons
}

// Using a generic type `T` for the row data. `T` must extend an object with an 'id' for keying.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TableComponent<T extends { id: string | number } = any>({ title, columns, data, showPagination = true, itemsPerPage = 999999, headerActions }: GenericTableProps<T>) {
	const [currentPage, setCurrentPage] = useState(1);

	const totalItems = data.length;
	const totalPages = Math.ceil(totalItems / itemsPerPage);

	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentItems = data.slice(startIndex, endIndex);
	const t = useTranslations('common');

	const handlePreviousPage = () => {
		if (currentPage > 1) {
			setCurrentPage(currentPage - 1);
		}
	};

	const handleNextPage = () => {
		if (currentPage < totalPages) {
			setCurrentPage(currentPage + 1);
		}
	};

	const currentRangeStart = startIndex + 1;
	const currentRangeEnd = Math.min(endIndex, totalItems);

	return (
		<div className='bg-white flex flex-col h-full'>
			{/* Title and Header Actions */}
			{(title || headerActions) && (
				<div className='flex justify-between items-center mb-4 custom-title-bg rounded-lg  '>
					{title && <h2 className='text-lg font-semibold'>{title}</h2>}
					{headerActions && <div>{headerActions}</div>}
				</div>
			)}

			{/* Table Container - handles overflow for scrolling */}
			<div className='flex-grow overflow-x-auto overflow-y-auto'>
				<table className='min-w-full divide-y divide-gray-200'>
					<thead className='bg-gray-50 sticky top-0 z-10 border-0'>
						<tr>
							{columns.map(column => (
								<th key={column.key} scope='col' className='px-2 py-3 text-left text-xs font-medium   uppercase tracking-wider border-0'>
									{column.header}
								</th>
							))}
						</tr>
					</thead>
					{/* Table Body */}
					<tbody className='bg-white divide-y divide-gray-100'>
						{currentItems.length > 0 ? (
							currentItems.map((row, rowIndex) => (
							<tr key={row.id}>
								{/* Each row must have a unique 'id' */}
								{columns.map(column => (
									<td key={column.key} className='px-2 py-4 whitespace-nowrap text-sm text-[#000000]'>
										{/* Render cell content using custom render function or direct key access */}
										{column.render ? column.render(row, rowIndex) : String(row[column.key as keyof T])}
									</td>
								))}
							</tr>
						))) : (
							<tr>
								<td colSpan={columns.length} className='px-2 py-4 whitespace-nowrap text-sm text-[#000000] text-center pt-12 text-gray-500'>
									{t('noData')}
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Pagination Controls */}
			{showPagination&& (
				<div className='flex justify-between items-center mt-6 pt-4 border-t border-gray-200'>
					<button
						onClick={handlePreviousPage}
						disabled={currentPage === 1}
						className={`
              flex items-center space-x-1
              bg-white border border-grey-800 text-sm font-medium
              px-4 py-2 rounded-[10px]
              hover:bg-gray-100 transition-colors
							cursor-pointer
              ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} /* Dim and disable clicks */
            `}>
						<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M10 19l-7-7m0 0l7-7m-7 7h18'></path>
						</svg>
						{t('previous')}
					</button>
					<span className='text-sm'>
						<span className='text-black font-medium'>
							{currentRangeStart}-{currentRangeEnd}
						</span>{' '}
						<span className=' '>of {totalItems}</span>
					</span>
					<button
						onClick={handleNextPage}
						disabled={currentPage === totalPages}
						className={`
              flex items-center space-x-1
              bg-white border border-grey-800 text-sm font-medium
              px-4 py-2 rounded-[10px]
              hover:bg-gray-100 transition-colors
							cursor-pointer
              ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''} /* Dim and disable clicks */
            `}>
						{t('next')}
						<svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
							<path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M14 5l7 7m0 0l-7 7m7-7H3'></path>
						</svg>
					</button>
				</div>
			)}
		</div>
	);
}

export default TableComponent;
export type { Column, GenericTableProps };

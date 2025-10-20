import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface TableSkeletonProps {
	rows?: number;
	columns?: number;
	showHeader?: boolean;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 5, columns = 6, showHeader = true }) => {
	return (
		<div className='w-full'>
			{/* Header skeleton */}
			{showHeader && (
				<div className='flex items-center justify-between mb-6'>
					<div className='space-y-2'>
						<Skeleton className='h-6 w-48' />
						<Skeleton className='h-4 w-64' />
					</div>
					<div className='flex space-x-2'>
						<Skeleton className='h-9 w-40' />
						<Skeleton className='h-9 w-32' />
					</div>
				</div>
			)}

			{/* Table skeleton */}
			<div className='border border-gray-200 rounded-lg overflow-hidden'>
				{/* Table header */}
				<div className='bg-gray-50 border-b border-gray-200 px-6 py-3'>
					<div className='flex space-x-4'>
						{Array.from({ length: columns }).map((_, index) => (
							<Skeleton key={index} className='h-4 w-20 flex-1' />
						))}
					</div>
				</div>

				{/* Table rows */}
				{Array.from({ length: rows }).map((_, rowIndex) => (
					<div key={rowIndex} className='border-b border-gray-200 px-6 py-4 last:border-b-0'>
						<div className='flex space-x-4'>
							{Array.from({ length: columns }).map((_, colIndex) => (
								<div key={colIndex} className='flex-1'>
									{colIndex === 0 ?
										// Chain column with icon + text
										<div className='flex items-center space-x-2'>
											<Skeleton className='h-4 w-4 rounded-full' />
											<Skeleton className='h-4 w-16' />
										</div>
									: colIndex === 1 ?
										// Status badge
										<Skeleton className='h-6 w-20 rounded-full' />
									: colIndex === columns - 1 ?
										// Operations column
										<Skeleton className='h-8 w-16' />
										// Regular text columns
									:	<Skeleton className='h-4 w-full' />}
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			{/* Pagination skeleton */}
			<div className='flex items-center justify-between mt-4'>
				<Skeleton className='h-4 w-32' />
				<div className='flex space-x-2'>
					<Skeleton className='h-8 w-8' />
					<Skeleton className='h-8 w-8' />
					<Skeleton className='h-8 w-8' />
				</div>
			</div>
		</div>
	);
};

export default TableSkeleton;

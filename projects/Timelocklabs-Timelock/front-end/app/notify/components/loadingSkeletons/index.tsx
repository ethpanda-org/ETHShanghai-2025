import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Mailbox Card Skeleton Component
export const CardSkeleton = () => (
	<div className='bg-white rounded-lg border border-gray-200 p-6'>
		<div className='flex items-center justify-between mb-4'>
			<Skeleton className='h-5 w-24' />
			<div className='flex space-x-2'>
				<Skeleton className='h-8 w-8 rounded' />
				<Skeleton className='h-8 w-8 rounded' />
			</div>
		</div>
		<div className='space-y-3'>
			<div>
				<Skeleton className='h-4 w-16 mb-1' />
				<Skeleton className='h-4 w-32' />
			</div>
			<div>
				<Skeleton className='h-4 w-12 mb-1' />
				<Skeleton className='h-4 w-48' />
			</div>
			<div>
				<Skeleton className='h-4 w-20 mb-1' />
				<Skeleton className='h-4 w-28' />
			</div>
		</div>
	</div>
);

// Add Email Card Skeleton
export const AddCardSkeleton = () => (
	<div className='bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 p-6 flex flex-col items-center justify-center min-h-[200px]'>
		<Skeleton className='h-12 w-12 rounded-full mb-4' />
		<Skeleton className='h-5 w-24 mb-2' />
		<Skeleton className='h-4 w-32' />
	</div>
);

// Combined Email Loading Skeleton
export const LoadingSkeleton = () => (
	<div className='flex flex-col space-y-8'>
		<div className='bg-blue-50 border border-blue-200 rounded-lg p-6'>
			<div className='space-y-4'>
				<Skeleton className='h-6 w-48' />
				<div className='space-y-2'>
					<Skeleton className='h-4 w-full' />
					<Skeleton className='h-4 w-3/4' />
					<Skeleton className='h-4 w-5/6' />
				</div>
			</div>
		</div>
		<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
			<CardSkeleton />
			<CardSkeleton />
			<AddCardSkeleton />
		</div>
	</div>
);

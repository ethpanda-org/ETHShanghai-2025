import { Skeleton } from '@/components/ui/skeleton';

const PageSkeleton = () => (
	<div className='bg-white p-6 rounded-lg border border-gray-200 flex flex-col items-start'>
		<div className='flex justify-between items-center w-full mb-4'>
			<Skeleton className='w-10 h-10 rounded-full' />
			<Skeleton className='w-5 h-5' />
		</div>
		<Skeleton className='h-5 w-3/4 mb-1' />
		<Skeleton className='h-4 w-full' />
	</div>
);

export default PageSkeleton;

const LoadingSkeleton = () => (
    <div className='animate-pulse space-y-6 p-6'>
        <div className='h-8 bg-gray-100 rounded-md w-1/3'></div>
        <div className='space-y-3'>
            <div className='h-4 bg-gray-100 rounded w-full'></div>
            <div className='h-4 bg-gray-100 rounded w-5/6'></div>
            <div className='h-4 bg-gray-100 rounded w-4/6'></div>
        </div>
        <div className='h-32 bg-gray-100 rounded-lg'></div>
    </div>
);

export default LoadingSkeleton
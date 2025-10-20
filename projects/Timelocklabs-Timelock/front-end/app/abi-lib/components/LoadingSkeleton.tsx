export default function LoadingSkeleton() {
	return (
		<>
			<div className='min-h-screen'>
				<div className='mx-auto border border-gray-200 rounded-lg p-6'>
					{/* Header skeleton */}
					<div className='flex items-center justify-between mb-6'>
						<div className='space-y-2'>
							<div className='h-6 w-32 bg-gray-100 rounded animate-pulse'></div>
							<div className='h-4 w-80 bg-gray-100 rounded animate-pulse'></div>
						</div>
						<div className='h-10 w-20 bg-gray-100 rounded animate-pulse'></div>
					</div>

					{/* Table skeleton */}
					<div className='border border-gray-200 rounded-lg overflow-hidden'>
						{/* Table header */}
						<div className='bg-gray-50 border-b border-gray-200 px-6 py-3'>
							<div className='flex space-x-4'>
								<div className='h-4 w-24 bg-gray-100 rounded animate-pulse flex-1'></div>
								<div className='h-4 w-20 bg-gray-100 rounded animate-pulse flex-1'></div>
								<div className='h-4 w-16 bg-gray-100 rounded animate-pulse flex-1'></div>
								<div className='h-4 w-16 bg-gray-100 rounded animate-pulse flex-1'></div>
							</div>
						</div>
						{/* Table rows */}
						{Array.from({ length: 5 }).map((_, rowIndex) => (
							<div key={rowIndex} className='border-b border-gray-200 px-6 py-4 last:border-b-0'>
								<div className='flex space-x-4'>
									<div className='flex-1'>
										<div className='flex items-center space-x-2'>
											<div className='h-4 w-4 bg-gray-100 rounded animate-pulse'></div>
											<div className='h-4 w-32 bg-gray-100 rounded animate-pulse'></div>
										</div>
									</div>
									<div className='flex-1'>
										<div className='h-4 w-24 bg-gray-100 rounded animate-pulse'></div>
									</div>
									<div className='flex-1'>
										<div className='h-6 w-20 bg-gray-100 rounded-full animate-pulse'></div>
									</div>
									<div className='flex-1'>
										<div className='h-8 w-8 bg-gray-100 rounded animate-pulse'></div>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</>
	);
}

import SectionHeader from '@/components/ui/SectionHeader';
import TableComponent from '@/components/ui/TableComponent';
import { ABIRow } from '@/types';
import { useTranslations } from 'next-intl';
import AddSVG from '@/components/icons/add';

const PageCard = ({ abis, columns, setIsAddABIOpen }: { abis: ABIRow[]; columns: Array<{ key: string; header: string; sortable?: boolean }>; setIsAddABIOpen: (open: boolean) => void }) => {
	const t = useTranslations('ABI-Lib');

	return (
		<div className='min-h-screen'>
			<div className='mx-auto border-gray-200 rounded-lg '>
				<div className='flex justify-between items-center mb-6'>
					<SectionHeader title={t('storedABI')} description={t('storedABIDescription')} />
					<button
						type='button'
						onClick={() => setIsAddABIOpen(true)}
						className='inline-flex items-center space-x-2 px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black'>
						<AddSVG />
						<span>{t('new')}</span>
					</button>
				</div>
				<TableComponent<ABIRow>
					columns={columns}
					data={abis}
					showPagination={true}
					itemsPerPage={10}
				/>
			</div>
		</div>
	);
};

export default PageCard;

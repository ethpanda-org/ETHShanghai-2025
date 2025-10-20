import React from 'react';
import Image from 'next/image';
import { ethers } from 'ethers';
import { useTranslations } from 'next-intl';
import ChainLabel from '@/components/web3/ChainLabel';
import TableComponent from '@/components/ui/TableComponent';

export interface Asset {
	token_address: string;
	name: string;
	symbol: string;
	logo: string;
	thumbnail: string;
	decimals: number;
	balance: string;
	possible_spam: boolean;
	verified_contract: boolean;
	usd_price: number;
	usd_price_24hr_percent_change: number;
	usd_price_24hr_usd_change: number;
	usd_value_24hr_usd_change: number;
	usd_value: number;
	portfolio_percentage: number;
	balance_formatted: string;
	native_token: boolean;
	total_supply: number | null;
	total_supply_formatted: string | null;
	percentage_relative_to_total_supply: number | null;
	chain_id: number;
	id: string | number;
}

interface AssetListProps {
	assets: Asset[];
}

const AssetList: React.FC<AssetListProps> = ({ assets }) => {
	const tAssetList = useTranslations('assetList');

	const columns = [
		{
			key: 'chain',
			header: tAssetList('chain'),
			render: (row: Asset) => <ChainLabel chainId={row.chain_id} />,
		},
		{
			key: 'name',
			header: tAssetList('namePrice'),
			render: (asset: Asset) => {
				return <div className='flex items-center gap-3 text-sm'>
					<Image src={asset.logo} alt={asset.name || asset.symbol || 'Token'} width={24} height={24} className='rounded-full' />
					<div className='col'>
						<div className='flex gap-1 items-center'>
							<span>{asset.symbol}</span>
							<span className='  text-xs'>{asset.name}</span>
						</div>
						<div>${asset.usd_price ? asset.usd_price : '0.00'}</div>
					</div>
				</div>
			}
		},
		{
			key: 'balance',
			header: tAssetList('amountValue'),
			render: (asset: Asset) => {
				return <div>
					{ethers.utils.formatUnits(asset.balance.toString(), asset.decimals)}
				</div>
			}
		}
	];

	return (
		<div className='bg-white p-6  rounded-lg border border-gray-200 flex flex-col h-full'>

			<TableComponent<Asset> columns={columns} data={assets} showPagination={true} itemsPerPage={5} />

		</div>
	);
};

export default AssetList;

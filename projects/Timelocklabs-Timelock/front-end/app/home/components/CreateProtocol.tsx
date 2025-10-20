import React from 'react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';
import WalletSection from './WalletSection';
import HowTimelockWorks from './HowTimelockWorks';
import HowTimelockProtocol from './HowTimelockProtocol';
import FeatureCard from '@/components/ui/FeatureCard';

const CreateProtocol: React.FC = () => {
	const t = useTranslations('home_page');

	const featureCards = [
		{
			key: 'aave',
			icon: <Image src="/aave.png" alt="Aave" width={40} height={40} />,
			link: 'https://github.com/aave/arc-timelock',
		},
		{
			key: 'lido',
			icon: <Image src="/lido.png" alt="Lido" width={40} height={40} />,
			link: 'https://github.com/lidofinance/dual-governance/blob/main/contracts/TimelockedGovernance.sol',
		},
		{
			key: 'eigenlayer',
			icon: <Image src="/eigen.png" alt="EigenLayer" width={40} height={40} />,
			link: 'https://github.com/Layr-Labs/eigenlayer-contracts/tree/main',
		},
		{
			key: 'ethena',
			icon: <Image src="/ena.png" alt="Ethena" width={40} height={40} />,
			link: 'https://github.com/ethena-labs/code4arena-contest/blob/7ffedb8873c2286930804e1c4feee0410fd0f033/protocols/USDe/lib/openzeppelin-contracts/contracts/mocks/compound/CompTimelock.sol#L70',
		},
		{
			key: 'uniswap',
			icon: <Image src="/uniswap.png" alt="Uniswap" width={40} height={40} />,
			link: 'https://github.com/Uniswap/governance',
		},
		{
			key: 'makerdao',
			icon: <Image src="/maker.png" alt="MakerDAO" width={40} height={40} />,
			link: 'https://github.com/makerdao/makerdao-status/blob/b41227fec8d87983daac5d593b8eaf02eff32e43/src/services/abi/compound/timelock.json#L4',
		},
		{
			key: 'morpho',
			icon: <Image src="/morpho.svg" alt="Morpho" width={40} height={40} />,
			link: 'https://github.com/morpho-org/metamorpho/blob/00da9ad27da8051bce663eeac02f3b9c0c0aa8d8/src/interfaces/IMetaMorphoFactory.sol#L19',
		},
		{
			key: 'pendle',
			icon: <Image src="/pendle.png" alt="Pendle" width={40} height={40} />,
			link: 'https://github.com/pendle-finance/pendle-core/blob/master/contracts/periphery/Timelock.sol',
		},
		{
			key: 'compound',
			icon: <Image src="/compound.png" alt="Compound" width={40} height={40} />,
			link: 'https://github.com/compound-finance/compound-protocol/blob/master/contracts/Timelock.sol',
		},
	];

	return (

		<main className='container mx-auto'>
				{/* First Row Component */}
				<div className='mb-12'>
					<WalletSection />
				</div>
				{/* Second Row: How Timelock Works & How to Use Protocol */}
				<div className='grid grid-cols-2 gap-4 mb-12'>
					<HowTimelockWorks />
					<HowTimelockProtocol />
				</div>
				{/* Third Row: Who is using it? and Feature Cards */}
				<div className='mb-12'>
					<h2 className='text-xl font-semibold mb-6'>
						{t('whos_using.title')} <span className='  text-base font-normal'>{t('whos_using.description')}</span>
					</h2>
					<div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6'>
						{featureCards.map(card => (
							<FeatureCard key={card.key} title={t(`feature_cards.${card.key}.title`)} description={t(`feature_cards.${card.key}.description`)} icon={card.icon} link={card.link} />
						))}
					</div>
				</div>
			</main>
	);
};

export default CreateProtocol;

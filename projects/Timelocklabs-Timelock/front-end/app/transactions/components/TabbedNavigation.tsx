// components/transactions/TabbedNavigation.tsx
import React from 'react';

interface Tab {
	id: string;
	label: string;
}

interface TabbedNavigationProps {
	tabs: Tab[];
	activeTab: string;
	onTabChange: (tabId: string) => void;
}

const TabbedNavigation: React.FC<TabbedNavigationProps> = ({ tabs, activeTab, onTabChange }) => {
	return (
		<div className='flex h-9 rounded-lg p-1 bg-[#F5F5F5] justify-between '>
			{tabs.map(tab => (
				<button
					key={tab.id}
					onClick={() => onTabChange(tab.id)}
					className={`flex items-center justify-center h-7 px-2 py-1 text-sm font-medium p-3
             ${activeTab !== tab.id ? 'bg-gray-100' : 'bg-white border border-white rounded-md  hover:border-black '} 
            `}>
					{tab.label}
				</button>
			))}
		</div>
	);
};

export default TabbedNavigation;

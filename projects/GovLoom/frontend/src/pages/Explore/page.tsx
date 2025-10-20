import React, { useState, useMemo } from 'react';
import { Header } from '../../components/DAO';
import { DAOList } from '../../components/DAO';
import { ViewControls } from '../../components/DAO';
import type { DAO, SortConfig, ViewMode } from '../../types';
import { daoData } from '../../data/daos'; // <-- Use the centralized data source
import './style.css';

const parseMemberCount = (countStr: string): number => {
  const num = parseFloat(countStr);
  if (countStr.toLowerCase().includes('k')) return num * 1000;
  return num;
};

const ExplorePage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'memberCount', direction: 'descending' });

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  const handleSort = (key: keyof DAO) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const processedDaos = useMemo(() => {
    let results: DAO[];

    if (!searchQuery.trim()) {
      results = [...daoData];
    } else {
      const lowerCaseQuery = searchQuery.toLowerCase();
      const ranked = daoData
        .map(dao => {
          const nameIndex = dao.name.toLowerCase().indexOf(lowerCaseQuery);
          const descriptionIndex = dao.description.toLowerCase().indexOf(lowerCaseQuery);
          const effectiveNameIndex = nameIndex === -1 ? Infinity : nameIndex;
          const effectiveDescriptionIndex = descriptionIndex === -1 ? Infinity : descriptionIndex;
          const score = Math.min(effectiveNameIndex, effectiveDescriptionIndex);
          return { dao, score };
        })
        .filter(item => item.score !== Infinity)
        .sort((a, b) => a.score - b.score);
      results = ranked.map(item => item.dao);
    }

    if (sortConfig !== null) {
      const sorted = [...results].sort((a, b) => {
        const { key, direction } = sortConfig;
        const aValue = a[key];
        const bValue = b[key];
        if (aValue === undefined || bValue === undefined) {
          return 0;
        }
        let comparison = 0;
        switch (key) {
          case 'name':
            comparison = (aValue as string).localeCompare(bValue as string, undefined, { sensitivity: 'base' });
            break;
          case 'memberCount':
            comparison = parseMemberCount(aValue as string) - parseMemberCount(bValue as string);
            break;
          case 'proposalCount':
            comparison = (aValue as number) - (bValue as number);
            break;
          default:
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;
            break;
        }
        return direction === 'ascending' ? comparison : -comparison;
      });
      return sorted;
    }

    return results;
  }, [searchQuery, sortConfig]);

  return (
    <div className="explore-page-container">
      <Header searchQuery={searchQuery} onSearchChange={handleSearchChange} />
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Explore DAOs</h1>
            <p className="page-subtitle">
              Discover, join, and participate in top decentralized organizations.
            </p>
          </div>
          <ViewControls viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>
        <DAOList 
          daos={processedDaos} 
          viewMode={viewMode}
          sortConfig={sortConfig}
          onSort={handleSort}
        />
      </main>
    </div>
  );
};

export default ExplorePage;

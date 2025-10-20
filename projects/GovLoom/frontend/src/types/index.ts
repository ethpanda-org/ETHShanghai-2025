// src/types/index.ts

// 新增：定义投票选项
export interface VoteOption {
  label: string; // e.g., "For", "Against", "Abstain"
  count: number; // The number of votes for this option
}

// 新增：定义提案的数据结构
export interface Proposal {
  id: number;
  title: string;
  author: string; // Wallet address
  status: 'Active' | 'Passed' | 'Failed' | 'Executed';
  description: string; // Can be long-form text or markdown
  options: VoteOption[];
  onChain?: {
    contractAddress: string;
    chainId?: number;
    proposalId?: number;
    logsStartBlock?: bigint | number | string;
  };
}

// DAO 接口现在包含一个提案数组
export interface DAO {
  id: number;
  logoUrl: string;
  name: string;
  description: string;
  proposalCount: number;
  memberCount: string;
  slug?: string;
  bannerUrl?: string;
  longDescription?: string;
  proposals?: Proposal[]; // 关联的提案列表
}

export type SortConfig = {
  key: keyof DAO;
  direction: 'ascending' | 'descending';
};

export type ViewMode = 'grid' | 'table';

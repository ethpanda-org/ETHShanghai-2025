// src/data/daos.ts

import type { DAO, Proposal } from '../types';

export interface DAOWithDetails extends DAO {
  slug: string;
  bannerUrl: string;
  longDescription: string;
  proposals: Proposal[]; // proposals 变为必需字段
}

export const daoData: DAOWithDetails[] = [
  { 
    id: 1, 
    slug: 'FRAX',
    name: 'FRAX', 
    description: 'Frax is a fractional stablecoin multichain protocol, introducing a cryptocurrency that is partially backed by collateral and partially stabilized algorithmically. Its goal is to create highly scalable, decentralized money in place of fixed-supp...', 
    proposalCount: 2, 
    memberCount: '20k',
    logoUrl: '/logos/FRAX.png',
    bannerUrl: '/background/FRAX.png',
    longDescription: 'Uniswap is a leading decentralized crypto exchange that runs on the Ethereum blockchain...',
    proposals: [
      { 
        id: 101, 
        title: 'FIP-101: 启动 Frax Yield-Backed Assets (YBA) 平台', 
        author: '0x123...abc',
        status: 'Active',
        description: `
本提案建议 Frax 协议启动一个全新的产品线：**收益支持资产** (Yield-Backed Assets, YBA)。该平台将允许用户存入 sfrxETH 等生息资产，并以零利率借出一种新的、与 FRAX 锚定的稳定资产 **fyUSD (Frax Yield USD)**。协议通过捕获用户存入资产的收益来维持 fyUSD 的价值和偿付能力。

### 背景
MakerDAO 最近的成功很大一部分归功于其对现实世界资产（RWA）和 LSTs 的大规模采用，允许用户零成本借贷 DAI，而协议则通过抵押品的收益获利。同样，Lybra Finance 也开创了利用 LST 收益来支持其稳定币 eUSD 的模式。

Frax 协议拥有市场上最成功的 LST 之一——sfrxETH，以及一个即将全面启动的 L2 网络——Fraxchain。这为创建一个基于原生收益的稳定资产系统提供了得天独厚的基础。fyUSD 将是一种仅能通过存入生息资产（初始阶段为 sfrxETH）来铸造的稳定资产，其债务将由抵押品的未来收益自动偿还。

### 动机
1. **创造新的协议收入流**：Frax DAO 将捕获所有存入 sfrxETH 的质押收益，形成一个巨大且可持续的收入来源，完全独立于借贷利息和 AMO 策略。
2. **极大地提升 sfrxETH 的需求**：允许用户在保留 sfrxETH 敞口和收益的同时“预支”流动性，将显著激励更多用户铸造和持有 sfrxETH，并为以太坊提供更多去中心化验证者。
3. **增强 FRAX 的生态系统**：fyUSD 可以与 FRAX 生态深度集成，例如在 Fraxswap 或 Fraxchain 上形成深度流动性池，扩大整个 Frax 稳定币体系的流通与应用。
4. **构建强大的护城河**：将 Frax 的核心产品（LST、稳定币、L2）深度绑定，形成协同效应网络，显著增强 Frax 在 DeFi 竞争中的地位。

### 投票选项
- **赞成**：批准启动 Frax Yield-Backed Assets 平台，并首先支持 sfrxETH 作为抵押品。
- **反对**：不推出新产品，专注于现有产品线的优化。`,
        options: [
          { label: 'For', count: 12500000 },
          { label: 'Against', count: 3200000 },
          { label: 'Abstain', count: 800000 },
        ],
        onChain: {
          contractAddress: '0xb6f2d30b6c49C135935C4E67F822f1Cd8b51f80b',
          chainId: 97,
          proposalId: 1,
          logsStartBlock: 69450000n,
        }
      },
      { 
        id: 102, 
        title: 'Q4 2025 Protocol Grants and Funding',
        author: '0x456...def',
        status: 'Passed',
        description: 'Allocate 5M UNI from the treasury to fund community grants for the fourth quarter of 2025. This will foster ecosystem growth and innovation.',
        options: [
          { label: 'For', count: 25000000 },
          { label: 'Against', count: 1100000 },
          { label: 'Abstain', count: 500000 },
        ],
        onChain: {
          contractAddress: '0xb6f2d30b6c49C135935C4E67F822f1Cd8b51f80b',
          chainId: 97,
          proposalId: 2,
          logsStartBlock: 69450000n,
        }
      }
    ]
  },
  {
    id: 2,
    slug: 'MAKER',
    name: 'MakerDAO',
    description: 'MakerDAO governs the DAI stablecoin using decentralized collateralized debt positions and a robust risk framework.',
    proposalCount: 96,
    memberCount: '180k',
    logoUrl: '/logos/maker.png',
    bannerUrl: '/background/maker.png',
    longDescription: 'MakerDAO is the protocol behind DAI, the largest decentralized stablecoin. The DAO maintains stability through governance-controlled parameters, incentivized vaults, and an executive vote system.',
    proposals: []
  },
  {
    id: 3,
    slug: 'AAVE',
    name: 'Aave',
    description: 'Aave is a decentralized liquidity protocol where users can earn interest and borrow assets in a non-custodial manner.',
    proposalCount: 142,
    memberCount: '320k',
    logoUrl: '/logos/aave.png',
    bannerUrl: '/background/aave.png',
    longDescription: 'Aave pioneered flash loans and continues to innovate in decentralized lending. The governance collective steers risk parameters, new deployments, and incentive programs across multiple networks.',
    proposals: []
  },
  {
    id: 4,
    slug: 'LIDO',
    name: 'Lido DAO',
    description: 'Lido DAO coordinates liquid staking on Ethereum, Polygon, and other networks, allowing users to earn staking rewards without locking assets.',
    proposalCount: 58,
    memberCount: '410k',
    logoUrl: '/logos/lido.png',
    bannerUrl: '/background/lido.png',
    longDescription: 'Lido enables liquid staking by issuing derivative tokens like stETH. Governance decisions focus on validator set expansion, rewards distribution, and treasury strategy.',
    proposals: []
  },
  {
    id: 5,
    slug: 'ARBITRUM',
    name: 'Arbitrum DAO',
    description: 'Arbitrum DAO manages the leading optimistic rollup, coordinating ecosystem incentives and protocol upgrades.',
    proposalCount: 77,
    memberCount: '520k',
    logoUrl: '/logos/arb.png',
    bannerUrl: '/background/arb.png',
    longDescription: 'The Arbitrum DAO governs the Arbitrum One and Nova networks. Community members steward the sequencer revenue, grant programs, and technical roadmap for the rollup.',
    proposals: []
  },
  {
    id: 9,
    slug: 'PENDLE',
    name: 'Pendle DAO',
    description: 'Pendle introduces yield tokenization, letting users trade future yield streams and customize risk profiles.',
    proposalCount: 25,
    memberCount: '65k',
    logoUrl: '/logos/pendle.png',
    bannerUrl: '/background/pendle.png',
    longDescription: 'Pendle DAO coordinates the protocol\'s ve-token mechanics, liquidity incentives, and integrations with other DeFi protocols.',
    proposals: []
  },
  // ... 其他 DAO 数据也可以添加 proposals ...
];

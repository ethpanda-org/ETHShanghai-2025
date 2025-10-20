// Data Marketplace 合约 ABI
// 管理数据授权和使用记录

export const DataMarketplaceABI = [
  // 查询应用授权状态
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'address', name: 'app', type: 'address' },
    ],
    name: 'isAuthorized',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 获取用户授权的所有应用
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getAuthorizedApps',
    outputs: [{ internalType: 'address[]', name: '', type: 'address[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 授权应用访问数据
  {
    inputs: [
      { internalType: 'address', name: 'app', type: 'address' },
      { internalType: 'uint256[]', name: 'dimensions', type: 'uint256[]' },
      { internalType: 'uint256', name: 'duration', type: 'uint256' },
    ],
    name: 'authorizeApp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 撤销应用授权
  {
    inputs: [{ internalType: 'address', name: 'app', type: 'address' }],
    name: 'revokeAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 应用访问用户数据（记录使用）
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256[]', name: 'dimensions', type: 'uint256[]' },
    ],
    name: 'accessData',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 查询用户的使用记录
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'offset', type: 'uint256' },
      { internalType: 'uint256', name: 'limit', type: 'uint256' },
    ],
    name: 'getUsageRecords',
    outputs: [
      {
        components: [
          { internalType: 'address', name: 'app', type: 'address' },
          { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
          { internalType: 'uint256[]', name: 'dimensions', type: 'uint256[]' },
          { internalType: 'uint256', name: 'reward', type: 'uint256' },
        ],
        internalType: 'struct DataMarketplace.UsageRecord[]',
        name: '',
        type: 'tuple[]',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 事件：应用授权
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'app', type: 'address' },
      { indexed: false, internalType: 'uint256[]', name: 'dimensions', type: 'uint256[]' },
    ],
    name: 'AppAuthorized',
    type: 'event',
  },
  // 事件：授权撤销
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'app', type: 'address' },
    ],
    name: 'AuthorizationRevoked',
    type: 'event',
  },
  // 事件：数据访问
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'app', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'reward', type: 'uint256' },
    ],
    name: 'DataAccessed',
    type: 'event',
  },
] as const


// CrediNet 核心合约 ABI
// TODO: 替换为实际的智能合约 ABI

export const CrediNetCoreABI = [
  // 查询用户 C-Score
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getCreditScore',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 查询用户 DID
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getUserDID',
    outputs: [{ internalType: 'string', name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  // 查询五维信用数据
  {
    inputs: [{ internalType: 'address', name: 'user', type: 'address' }],
    name: 'getCreditDimensions',
    outputs: [
      {
        components: [
          { internalType: 'uint256', name: 'keystone', type: 'uint256' },
          { internalType: 'uint256', name: 'ability', type: 'uint256' },
          { internalType: 'uint256', name: 'finance', type: 'uint256' },
          { internalType: 'uint256', name: 'health', type: 'uint256' },
          { internalType: 'uint256', name: 'behavior', type: 'uint256' },
        ],
        internalType: 'struct CrediNetCore.CreditDimensions',
        name: '',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // 更新信用数据（需要授权）
  {
    inputs: [
      { internalType: 'address', name: 'user', type: 'address' },
      { internalType: 'uint256', name: 'keystone', type: 'uint256' },
      { internalType: 'uint256', name: 'ability', type: 'uint256' },
      { internalType: 'uint256', name: 'finance', type: 'uint256' },
      { internalType: 'uint256', name: 'health', type: 'uint256' },
      { internalType: 'uint256', name: 'behavior', type: 'uint256' },
    ],
    name: 'updateCreditScore',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 授权应用访问数据
  {
    inputs: [
      { internalType: 'address', name: 'app', type: 'address' },
      { internalType: 'uint256[]', name: 'dimensions', type: 'uint256[]' },
    ],
    name: 'authorizeApp',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 撤销应用授权
  {
    inputs: [{ internalType: 'address', name: 'app', type: 'address' }],
    name: 'revokeAppAuthorization',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // 事件：信用分数更新
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: false, internalType: 'uint256', name: 'newScore', type: 'uint256' },
    ],
    name: 'CreditScoreUpdated',
    type: 'event',
  },
  // 事件：应用授权
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'user', type: 'address' },
      { indexed: true, internalType: 'address', name: 'app', type: 'address' },
    ],
    name: 'AppAuthorized',
    type: 'event',
  },
] as const


export const domainAirdrop = {
    name: 'TuringM Airdrop',
    version: '1',
  } as const

export const UserSig = [
    { name: 'tokenAddress', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
    { name: 'reason', type: 'string' },
    { name: 'data', type: 'string' },
    { name: 'nonce', type: 'uint256' }
]
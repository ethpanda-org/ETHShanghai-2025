export const globalVaultAbi = [
  {
    type: "function",
    name: "currentCommitment",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "isNonceUsed",
    stateMutability: "view",
    inputs: [{ name: "nonce", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "event",
    name: "PoolCommitmentUpdated",
    inputs: [
      { indexed: true, name: "oldCommitment", type: "bytes32" },
      { indexed: true, name: "newCommitment", type: "bytes32" }
    ],
    anonymous: false
  },
  {
    type: "event",
    name: "PoolInitialized",
    inputs: [
      { indexed: true, name: "initialCommitment", type: "bytes32" },
      { indexed: false, name: "amount0", type: "uint256" },
      { indexed: false, name: "amount1", type: "uint256" }
    ],
    anonymous: false
  }
] as const;

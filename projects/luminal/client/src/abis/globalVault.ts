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
    name: "getRoot",
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
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proof", type: "bytes" },
      { name: "root", type: "bytes32" },
      { name: "nullifier", type: "bytes32" },
      { name: "recipient", type: "address" },
      { name: "tokenId", type: "uint8" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
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
  },
  {
    type: "event",
    name: "Withdrawal",
    inputs: [
      { indexed: true, name: "nullifier", type: "bytes32" },
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ],
    anonymous: false
  }
] as const;

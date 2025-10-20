export const privacyAmmAbi = [
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "pA", type: "uint256[2]" },
      { name: "pB", type: "uint256[2][2]" },
      { name: "pC", type: "uint256[2]" },
      { name: "commitmentNew", type: "bytes32" },
      { name: "nonce", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "vault",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "verifier",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "getCurrentCommitment",
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
    name: "SwapExecuted",
    inputs: [
      { indexed: true, name: "commitmentOld", type: "bytes32" },
      { indexed: true, name: "commitmentNew", type: "bytes32" },
      { indexed: true, name: "nonce", type: "uint256" },
      { indexed: false, name: "trader", type: "address" }
    ],
    anonymous: false
  }
] as const;

export const FOCUSBOND_ABI = [
  // View functions
  {
    "type": "function",
    "name": "getSession",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [{
      "name": "",
      "type": "tuple",
      "components": [
        {"name": "startTs", "type": "uint64"},
        {"name": "lastHeartbeatTs", "type": "uint64"},
        {"name": "depositWei", "type": "uint96"},
        {"name": "targetMinutes", "type": "uint16"},
        {"name": "isActive", "type": "bool"},
        {"name": "watchdogClosed", "type": "bool"}
      ]
    }],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isSessionActive",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getSessionElapsedMinutes",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "calculateBreakFee",
    "inputs": [
      {"name": "user", "type": "address"},
      {"name": "token", "type": "address"}
    ],
    "outputs": [{"name": "fee", "type": "uint256"}],
    "stateMutability": "view"
  },
  
  // State variables
  {
    "type": "function",
    "name": "usdc",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "focus",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "rewardTreasury",
    "inputs": [],
    "outputs": [{"name": "", "type": "address"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "baseFeeUsdc",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "baseFeeFocus",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "minCompleteMinutes",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint16"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "heartbeatGraceSecs",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint32"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "watchdogSlashBps",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint16"}],
    "stateMutability": "view"
  },

  // Write functions
  {
    "type": "function",
    "name": "startSession",
    "inputs": [{"name": "targetMinutes", "type": "uint16"}],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "breakSessionWithUsdc",
    "inputs": [{"name": "maxFee", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "breakSessionWithUsdcPermit",
    "inputs": [
      {"name": "maxFee", "type": "uint256"},
      {"name": "deadline", "type": "uint256"},
      {"name": "v", "type": "uint8"},
      {"name": "r", "type": "bytes32"},
      {"name": "s", "type": "bytes32"}
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "breakSessionWithFocus",
    "inputs": [{"name": "maxFee", "type": "uint256"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "completeSession",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "updateHeartbeat",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "watchdogBreak",
    "inputs": [{"name": "user", "type": "address"}],
    "outputs": [],
    "stateMutability": "nonpayable"
  },

  // Events
  {
    "type": "event",
    "name": "SessionStarted",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "depositWei", "type": "uint256", "indexed": false},
      {"name": "targetMinutes", "type": "uint16", "indexed": false},
      {"name": "startTs", "type": "uint64", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "SessionCompleted",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "depositReturned", "type": "uint256", "indexed": false},
      {"name": "completedAt", "type": "uint64", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "SessionBroken",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "feeAmount", "type": "uint256", "indexed": false},
      {"name": "feeToken", "type": "address", "indexed": false},
      {"name": "depositReturned", "type": "uint256", "indexed": false},
      {"name": "brokenAt", "type": "uint64", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "SessionWatchdogClosed",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "slashedAmount", "type": "uint256", "indexed": false},
      {"name": "depositReturned", "type": "uint256", "indexed": false},
      {"name": "closedAt", "type": "uint64", "indexed": false}
    ]
  },
  {
    "type": "event",
    "name": "HeartbeatUpdated",
    "inputs": [
      {"name": "user", "type": "address", "indexed": true},
      {"name": "timestamp", "type": "uint64", "indexed": false}
    ]
  }
] as const;

export const ERC20_ABI = [
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [{"name": "account", "type": "address"}],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "allowance",
    "inputs": [
      {"name": "owner", "type": "address"},
      {"name": "spender", "type": "address"}
    ],
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "approve",
    "inputs": [
      {"name": "spender", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transfer",
    "inputs": [
      {"name": "to", "type": "address"},
      {"name": "amount", "type": "uint256"}
    ],
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "decimals",
    "inputs": [],
    "outputs": [{"name": "", "type": "uint8"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "symbol",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "name",
    "inputs": [],
    "outputs": [{"name": "", "type": "string"}],
    "stateMutability": "view"
  }
] as const;

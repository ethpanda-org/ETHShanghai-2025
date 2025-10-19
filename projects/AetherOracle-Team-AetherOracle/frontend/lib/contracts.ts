// Contract addresses for Optimism Sepolia testnet
// Updated: 2025-10-13T14:45:00.000Z - Fixed: Using deployment-final.json addresses

export const CONTRACTS = {
  // Core Contracts - LATEST DEPLOYMENT (Updated: 2025-10-15)
  PAYMENT_GATEWAY_V2: '0x16e25554Ac0076b33910659Cddff3F1D20735900',  // ✅ Updated from latest deployment
  PUBLIC_GOODS_FUND: '0x0a093d7dA062cD542c554ac181267A90b837a892',  // ✅ CORRECT: Final deployed PublicGoodsFundV2
  FX_ROUTER: '0x309F0b5545F70C99c0DFE0dCDe97Bc1970bDb8cC',  // ✅ Updated: Latest FXRouter V2
  FX_POOL: '0xA2F1A3378B0D5DC75Ed3ed9A9e89f27706e8bc86',     // ✅ Updated: Latest FXPool with PublicGoodsFund integration

  // Mock Tokens - Test tokens on Optimism Sepolia
  MOCK_USDC: '0xb7225051e57db0296C1F56fbD536Acd06c889724',
  MOCK_USDT: '0x87a9Ce8663BF89D0e273068c2286Df44Ef6622D2',
  MOCK_DAI:  '0x453Cbf07Af7293FDee270C9A15a95aedaEaA383e',   // ✅ NEW: Mock DAI
  MOCK_WETH: '0x134AA0b1B739d80207566B473534601DCea2aD92',   // ✅ NEW: Wrapped ETH
  MOCK_WBTC: '0xCA38436dB07b3Ee43851E6de3A0A9333738eAC9A',   // ✅ NEW: Wrapped Bitcoin

  // ✅ Additional Crypto Tokens (Deployed 2025-10-15)
  MOCK_SOL:   '0x738A919d321b2684f2020Ba05eb754785B59Cfa1',   // Mock Solana
  MOCK_ADA:   '0x2FB8F2b959fEA1fAC5A85d5eFaD9AF194028365d',   // Mock Cardano
  MOCK_BNB:   '0xcF20D332E50cF90cd37bD716480A58a7CFE71C2B',   // Mock Binance Coin
  MOCK_MATIC: '0x5eC2F154e608Bc6e928a46a8BE8ADB51F912192B',   // Mock Polygon
  MOCK_AVAX:  '0xe6e9a8ff8B88B81DE680f08dd78B82F93f24A456',   // Mock Avalanche

  // Legacy addresses (for compatibility)
  PAYMENT_GATEWAY: '0x7aC993ee1E0b00C319b90822C701dF61896141BA', // Old version
} as const;

export const PAYMENT_GATEWAY_ABI = [
  // ============ Merchant Functions ============
  {
    "inputs": [{"internalType": "string", "name": "businessName", "type": "string"}],
    "name": "registerMerchant",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "merchant", "type": "address"}],
    "name": "getMerchantInfo",
    "outputs": [
      {"internalType": "string", "name": "businessName", "type": "string"},
      {"internalType": "uint256", "name": "totalOrders", "type": "uint256"},
      {"internalType": "uint256", "name": "totalVolume", "type": "uint256"},
      {"internalType": "uint256", "name": "pendingBalance", "type": "uint256"},
      {"internalType": "uint256", "name": "feeRate", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ============ Order Functions ============
  {
    "inputs": [
      {"internalType": "string", "name": "orderIdString", "type": "string"},
      {"internalType": "uint256", "name": "orderAmount", "type": "uint256"},
      {"internalType": "address", "name": "paymentToken", "type": "address"},
      {"internalType": "address", "name": "settlementToken", "type": "address"},
      {"internalType": "string", "name": "metadataURI", "type": "string"},
      {"internalType": "bool", "name": "allowPartialPayment", "type": "bool"},
      {"internalType": "address", "name": "designatedPayer", "type": "address"}
    ],
    "name": "createOrder",
    "outputs": [{"internalType": "bytes32", "name": "", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"internalType": "uint256", "name": "paymentAmount", "type": "uint256"}
    ],
    "name": "processPayment",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "orderId", "type": "bytes32"}],
    "name": "getOrder",
    "outputs": [
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "address", "name": "payer", "type": "address"},
      {"internalType": "uint256", "name": "orderAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "paidAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "receivedAmount", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
      {"internalType": "string", "name": "metadataURI", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "orderId", "type": "bytes32"}],
    "name": "cancelOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "orderId", "type": "bytes32"}],
    "name": "refundOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "orderId", "type": "bytes32"}],
    "name": "settleOrder",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "bytes32", "name": "orderId", "type": "bytes32"}],
    "name": "getOrderMetadataURI",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ============ 🆕 批量查询函数（订单管理核心） ============
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "uint256", "name": "offset", "type": "uint256"},
      {"internalType": "uint256", "name": "limit", "type": "uint256"}
    ],
    "name": "getMerchantOrders",
    "outputs": [
      {
        "components": [
          {"internalType": "bytes32", "name": "orderId", "type": "bytes32"},
          {"internalType": "string", "name": "orderIdString", "type": "string"},
          {"internalType": "address", "name": "merchant", "type": "address"},
          {"internalType": "address", "name": "payer", "type": "address"},
          {"internalType": "uint256", "name": "orderAmount", "type": "uint256"},
          {"internalType": "address", "name": "paymentToken", "type": "address"},
          {"internalType": "address", "name": "settlementToken", "type": "address"},
          {"internalType": "uint256", "name": "paidAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "receivedAmount", "type": "uint256"},
          {"internalType": "uint8", "name": "status", "type": "uint8"},
          {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
          {"internalType": "uint256", "name": "paidAt", "type": "uint256"},
          {"internalType": "string", "name": "metadataURI", "type": "string"}
        ],
        "internalType": "struct PaymentGatewayV2.OrderView[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "merchant", "type": "address"}],
    "name": "getMerchantOrderCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ],
    "name": "getMerchantOrdersByStatus",
    "outputs": [{"internalType": "bytes32[]", "name": "", "type": "bytes32[]"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ],
    "name": "getOrderCountByStatus",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ============ Withdrawal Functions ============
  {
    "inputs": [
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "withdrawMerchantBalance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "getMerchantBalance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ============ Events ============
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "merchant", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "businessName", "type": "string"},
      {"indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256"}
    ],
    "name": "MerchantRegistered",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"indexed": false, "internalType": "string", "name": "orderIdString", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "merchant", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "orderAmount", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "paymentToken", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "settlementToken", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "metadataURI", "type": "string"}
    ],
    "name": "OrderCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "payer", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "PaymentReceived",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "merchant", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "receivedAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "platformFee", "type": "uint256"}
    ],
    "name": "OrderCompleted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"indexed": false, "internalType": "string", "name": "reason", "type": "string"}
    ],
    "name": "OrderCancelled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "payer", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "OrderRefunded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"indexed": true, "internalType": "address", "name": "merchant", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "settlementAmount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "platformFee", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "publicGoodsDonation", "type": "uint256"}
    ],
    "name": "OrderSettled",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "merchant", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "MerchantWithdrawal",
    "type": "event"
  },

  // ============ Public getters (mappings) ============
  {
    "inputs": [],
    "name": "platformFeeRate",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "donationPercentage",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "supportedTokens",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "orderIdString", "type": "string"}],
    "name": "getOrderByString",
    "outputs": [
      {"internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "address", "name": "payer", "type": "address"},
      {"internalType": "uint256", "name": "orderAmount", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "orderIdString", "type": "string"}],
    "name": "getOrderDetailsByString",
    "outputs": [
      {"internalType": "bytes32", "name": "orderId", "type": "bytes32"},
      {"internalType": "address", "name": "merchant", "type": "address"},
      {"internalType": "address", "name": "payer", "type": "address"},
      {"internalType": "uint256", "name": "orderAmount", "type": "uint256"},
      {"internalType": "address", "name": "paymentToken", "type": "address"},
      {"internalType": "address", "name": "settlementToken", "type": "address"},
      {"internalType": "uint256", "name": "paidAmount", "type": "uint256"},
      {"internalType": "uint256", "name": "receivedAmount", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"},
      {"internalType": "uint256", "name": "createdAt", "type": "uint256"},
      {"internalType": "uint256", "name": "expiryTime", "type": "uint256"},
      {"internalType": "string", "name": "metadataURI", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },

] as const;

// AetherOracleV2 ABI for exchange rate queries
export const AETHER_ORACLE_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "pair", "type": "string"}],
    "name": "getLatestRate",
    "outputs": [
      {"internalType": "uint256", "name": "rate", "type": "uint256"},
      {"internalType": "uint256", "name": "confidence", "type": "uint256"},
      {"internalType": "uint256", "name": "timestamp", "type": "uint256"},
      {"internalType": "bool", "name": "isValid", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// ERC20 ABI for token operations (JSON format)
export const ERC20_ABI = [
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "spender", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "address", "name": "owner", "type": "address"},
      {"internalType": "address", "name": "spender", "type": "address"}
    ],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// PublicGoodsFund ABI for contribution tracking
export const PUBLIC_GOODS_FUND_ABI = [
  {
    "inputs": [],
    "name": "totalLifetimeDonations",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalContributors",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "user", "type": "address"}],
    "name": "getContributorInfo",
    "outputs": [
      {"internalType": "uint256", "name": "totalContributed", "type": "uint256"},
      {"internalType": "string", "name": "level", "type": "string"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getCurrentRoundInfo",
    "outputs": [
      {"internalType": "uint256", "name": "roundId", "type": "uint256"},
      {"internalType": "uint256", "name": "totalDonated", "type": "uint256"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"internalType": "bool", "name": "distributed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "roundId", "type": "uint256"}],
    "name": "donationRounds",
    "outputs": [
      {"internalType": "uint256", "name": "roundId", "type": "uint256"},
      {"internalType": "uint256", "name": "totalDonated", "type": "uint256"},
      {"internalType": "uint256", "name": "startTime", "type": "uint256"},
      {"internalType": "uint256", "name": "endTime", "type": "uint256"},
      {"internalType": "bool", "name": "distributed", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "goodId", "type": "uint256"}],
    "name": "publicGoods",
    "outputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "address", "name": "recipient", "type": "address"},
      {"internalType": "uint256", "name": "totalReceived", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "publicGoodsCount",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentRoundId",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// FXPool Contract ABI
export const FX_POOL_ABI = [
  // ============ Liquidity Management ============
  {
    "inputs": [
      {"internalType": "string", "name": "pair", "type": "string"},
      {"internalType": "address", "name": "token", "type": "address"},
      {"internalType": "uint256", "name": "amount", "type": "uint256"}
    ],
    "name": "addLiquidity",
    "outputs": [{"internalType": "uint256", "name": "shares", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "pair", "type": "string"},
      {"internalType": "uint256", "name": "shares", "type": "uint256"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "removeLiquidity",
    "outputs": [{"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ============ Swap Functions ============
  {
    "inputs": [
      {"internalType": "string", "name": "pair", "type": "string"},
      {"internalType": "address", "name": "tokenIn", "type": "address"},
      {"internalType": "address", "name": "tokenOut", "type": "address"},
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"internalType": "uint256", "name": "minAmountOut", "type": "uint256"}
    ],
    "name": "swap",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "amountOut", "type": "uint256"},
          {"internalType": "uint256", "name": "fee", "type": "uint256"},
          {"internalType": "uint256", "name": "slippage", "type": "uint256"},
          {"internalType": "uint256", "name": "executionRate", "type": "uint256"}
        ],
        "internalType": "struct FXPool.SwapResult",
        "name": "result",
        "type": "tuple"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "pair", "type": "string"},
      {"internalType": "address", "name": "tokenIn", "type": "address"},
      {"internalType": "address", "name": "tokenOut", "type": "address"},
      {"internalType": "uint256", "name": "amountIn", "type": "uint256"}
    ],
    "name": "getQuote",
    "outputs": [
      {
        "components": [
          {"internalType": "uint256", "name": "amountOut", "type": "uint256"},
          {"internalType": "uint256", "name": "fee", "type": "uint256"},
          {"internalType": "uint256", "name": "slippage", "type": "uint256"},
          {"internalType": "uint256", "name": "executionRate", "type": "uint256"}
        ],
        "internalType": "struct FXPool.SwapResult",
        "name": "result",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },

  // ============ Pool Management ============
  {
    "inputs": [
      {"internalType": "string", "name": "pair", "type": "string"},
      {"internalType": "uint256", "name": "baseFee", "type": "uint256"}
    ],
    "name": "createPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },

  // ============ View Functions ============
  {
    "inputs": [{"internalType": "string", "name": "pair", "type": "string"}],
    "name": "getPoolInfo",
    "outputs": [
      {"internalType": "uint256", "name": "totalLiquidity", "type": "uint256"},
      {"internalType": "uint256", "name": "lpTokenSupply", "type": "uint256"},
      {"internalType": "uint256", "name": "baseFee", "type": "uint256"},
      {"internalType": "uint256", "name": "dynamicFee", "type": "uint256"},
      {"internalType": "bool", "name": "isActive", "type": "bool"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "pair", "type": "string"},
      {"internalType": "address", "name": "user", "type": "address"}
    ],
    "name": "getUserPosition",
    "outputs": [
      {"internalType": "uint256", "name": "shares", "type": "uint256"},
      {"internalType": "uint256", "name": "depositTime", "type": "uint256"},
      {"internalType": "uint256", "name": "accumulatedFees", "type": "uint256"}
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "string", "name": "pair", "type": "string"},
      {"internalType": "address", "name": "token", "type": "address"}
    ],
    "name": "getReserves",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
    "name": "supportedTokens",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "orderSplitThreshold",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "maxSlippage",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },

  // ============ Events ============
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "string", "name": "pair", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "provider", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "shares", "type": "uint256"}
    ],
    "name": "LiquidityAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "string", "name": "pair", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "provider", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "token", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "shares", "type": "uint256"}
    ],
    "name": "LiquidityRemoved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "string", "name": "pair", "type": "string"},
      {"indexed": true, "internalType": "address", "name": "user", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "tokenIn", "type": "address"},
      {"indexed": false, "internalType": "address", "name": "tokenOut", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "amountIn", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "amountOut", "type": "uint256"},
      {"indexed": false, "internalType": "uint256", "name": "fee", "type": "uint256"}
    ],
    "name": "Swap",
    "type": "event"
  }
] as const;
// VibeCoding Market Contract on Sepolia
export const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; // TODO: Deploy and update
export const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111 in hex
export const SEPOLIA_CHAIN_NAME = "Sepolia";

// Simplified ABI for task posting with ETH escrow
export const TASK_MARKET_ABI = [
  {
    "inputs": [
      {"internalType": "string", "name": "_title", "type": "string"},
      {"internalType": "string", "name": "_description", "type": "string"},
      {"internalType": "string", "name": "_tags", "type": "string"},
      {"internalType": "uint8", "name": "_urgency", "type": "uint8"}
    ],
    "name": "createTask",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "name": "tasks",
    "outputs": [
      {"internalType": "address", "name": "client", "type": "address"},
      {"internalType": "string", "name": "title", "type": "string"},
      {"internalType": "uint256", "name": "budget", "type": "uint256"},
      {"internalType": "uint8", "name": "status", "type": "uint8"}
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

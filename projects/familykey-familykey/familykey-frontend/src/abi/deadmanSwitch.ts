export const deadmanSwitchAbi = [
  { "type": "constructor", "inputs": [
      { "name": "safe_", "type": "address" },
      { "name": "beneficiary_", "type": "address" },
      { "name": "interval_", "type": "uint256" },
      { "name": "challengePeriod_", "type": "uint256" }
    ]
  },
  { "type": "function", "stateMutability": "view", "name": "safe", "inputs": [], "outputs": [{"type":"address"}] },
  { "type": "function", "stateMutability": "view", "name": "beneficiary", "inputs": [], "outputs": [{"type":"address"}] },
  { "type": "function", "stateMutability": "view", "name": "heartbeatInterval", "inputs": [], "outputs": [{"type":"uint256"}] },
  { "type": "function", "stateMutability": "view", "name": "challengePeriod", "inputs": [], "outputs": [{"type":"uint256"}] },
  { "type": "function", "stateMutability": "view", "name": "lastCheckIn", "inputs": [], "outputs": [{"type":"uint256"}] },
  { "type": "function", "stateMutability": "view", "name": "claimReadyAt", "inputs": [], "outputs": [{"type":"uint256"}] },
  { "type": "function", "stateMutability": "nonpayable", "name": "checkIn", "inputs": [], "outputs": [] },
  { "type": "function", "stateMutability": "nonpayable", "name": "startClaim", "inputs": [], "outputs": [] },
  { "type": "function", "stateMutability": "nonpayable", "name": "finalizeClaim", "inputs": [], "outputs": [] },
  { "type": "function", "stateMutability": "view", "name": "status", "inputs": [], "outputs": [
      {"name":"safe_","type":"address"},
      {"name":"Owner_","type":"address"},
      {"name":"beneficiary_","type":"address"},
      {"name":"lastCheckIn_","type":"uint256"},
      {"name":"heartbeatInterval_","type":"uint256"},
      {"name":"claimReadyAt_","type":"uint256"}
    ]
  }
] as const;


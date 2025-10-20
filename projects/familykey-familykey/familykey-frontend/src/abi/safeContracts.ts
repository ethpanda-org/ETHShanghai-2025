// Safe 合约地址 - Base Sepolia
export const SAFE_ADDRESSES = {
  SAFE_SINGLETON: '0x29fcB43b46531BcA003ddC8FCB67FFE91900C762',
  SAFE_PROXY_FACTORY: '0x4e1DCf7AD4e460CfD30791CCC4F9c8a4f820ec67',
  SAFE_FALLBACK_HANDLER: '0x017062a1dE2FE6b99BE3d9d37841FeD19F573804',
  MULTI_SEND: '0x9641d764fc13c8B624c04430C7356C1C7C8102e2',
};

// Safe Proxy Factory ABI - 用于创建 Safe
export const SAFE_PROXY_FACTORY_ABI = [
  'function createProxyWithNonce(address _singleton, bytes memory initializer, uint256 saltNonce) returns (address proxy)',
  'function proxyCreationCode() pure returns (bytes memory)',
  'event ProxyCreation(address indexed proxy, address singleton)',
];

// Safe (GnosisSafe) ABI - 核心功能
export const SAFE_ABI = [
  // Setup function - 初始化 Safe
  'function setup(address[] calldata _owners, uint256 _threshold, address to, bytes calldata data, address fallbackHandler, address paymentToken, uint256 payment, address payable paymentReceiver)',
  
  // Module management
  'function enableModule(address module)',
  'function disableModule(address prevModule, address module)',
  'function isModuleEnabled(address module) view returns (bool)',
  'function getModules() view returns (address[] memory)',
  
  // Owner management
  'function getOwners() view returns (address[] memory)',
  'function isOwner(address owner) view returns (bool)',
  'function getThreshold() view returns (uint256)',
  
  // Transaction execution
  'function execTransaction(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes memory signatures) payable returns (bool success)',
  
  // Misc
  'function nonce() view returns (uint256)',
  'function getTransactionHash(address to, uint256 value, bytes calldata data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address refundReceiver, uint256 _nonce) view returns (bytes32)',
];

// 计算 Safe 地址的辅助函数（基于 CREATE2）
export function predictSafeAddress(
  factory: string,
  singleton: string,
  initializer: string,
  saltNonce: string
): string {
  const { keccak256, solidityKeccak256, getCreate2Address, hexlify } = require('ethers').utils;
  
  // Safe Proxy 的 creation code
  const proxyCreationCode = '0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260228152602001806101c46022913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505060ab806101196000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033';
  
  const encodedSingleton = hexlify(singleton).slice(2).padStart(64, '0');
  const deploymentCode = proxyCreationCode + encodedSingleton;
  
  const salt = solidityKeccak256(['bytes32', 'uint256'], [keccak256(initializer), saltNonce]);
  
  return getCreate2Address(factory, salt, keccak256(deploymentCode));
}


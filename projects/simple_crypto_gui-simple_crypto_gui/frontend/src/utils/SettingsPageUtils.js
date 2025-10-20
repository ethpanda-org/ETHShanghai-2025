import { getPublicClient } from './chainUtils/ethUtils.js';
import { parseAbi, createPublicClient, http } from 'viem';

/**
 * Get chain ID from RPC URL
 * @param {string} rpcUrl - RPC URL address
 * @returns {Promise<number>} Chain ID
 * @throws {Error} Throws error when unable to connect to RPC URL or fetch chain ID fails
 */
export const getChainIdFromUrl = async (rpcUrl) => {
  try {
    // 创建临时publicClient来获取chainId
    const tempPublicClient = createPublicClient({
      transport: http(rpcUrl),
    });
    const chainId = await tempPublicClient.getChainId();
    return chainId;
  } catch (error) {
    // Rethrow error while preserving original error message
    throw new Error(`Failed to fetch chain ID from RPC URL: ${error.message}`);
  }
};

/**
 * Query Token information (decimals and symbol) via contract address
 * @param {string} contractAddress - Contract address
 * @returns {Promise<{ decimals: number, symbol: string }>} Token information
 * @throws {Error} Throws error when unable to connect to RPC URL or query Token information fails
 */
export const getTokenInfoFromContract = async (contractAddress) => {
  try {
    // 使用utils.js中的getPublicClient函数获取客户端实例
    const publicClient = await getPublicClient();
    
    // 并行查询decimals和symbol
    const [decimals, symbol] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: parseAbi(['function decimals() view returns (uint8)']),
        functionName: 'decimals',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: parseAbi(['function symbol() view returns (string)']),
        functionName: 'symbol',
      })
    ]);
    
    return { decimals, symbol };
  } catch (error) {
    // Rethrow error while preserving original error message
    throw new Error(`Failed to fetch token info from contract: ${error.message}`);
  }
};

/**
 * Delete mnemonic phrase saved in localStorage
 * @returns {boolean} Whether deletion was successful
 */
export const deleteMnemonicFromLocalStorage = () => {
  try {
    localStorage.removeItem('wallet-mnemonic');
    return true;
  } catch (error) {
    console.error('Failed to delete mnemonic phrase:', error);
    return false;
  }
};
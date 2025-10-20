import { getStoreState } from './utils.js';
import { fetchBalance, transfer, transferWithPaymaster } from './chainUtils/ethUtils.js';
import { fetchBtcBalance, transferBtc } from './chainUtils/btcUtils.js';

export const handleFetchBalance = async () => {
  const currentChain = getStoreState().currentChain;
  if (typeof currentChain.id === 'string' && currentChain.id.startsWith('btc')) {
    return await fetchBtcBalance()
  }
  return await fetchBalance()
}

/**
 * Transfer wrapper function that automatically selects the appropriate transfer method based on whether the current coin supports Paymaster
 * @param {string} recipientAddress - Recipient address
 * @param {string} transferAmount - Transfer amount
 * @returns {Promise<{success: boolean, hash: string, error: string|null}>} Transfer result
 */
export const handleTransfer = async (
  recipientAddress,
  transferAmount
) => {
    const currentChain = getStoreState().currentChain;

    if (typeof currentChain.id === 'string' && currentChain.id.startsWith('btc')) {
      console.log('Current chain is Bitcoin chain, using regular transfer method')
      return await transferBtc(recipientAddress, transferAmount)
    }
    // Get current coin configuration
    const currentCoin = getStoreState().currentCoin;

    // Determine if current coin supports Paymaster
    // Check if there are paymaster-related properties
    if (currentCoin && currentCoin.paymasterAddress) {
      // Call transfer function with Paymaster
      console.log('Using Paymaster for gas-free transfer');
      return await transferWithPaymaster(recipientAddress, transferAmount);
    } else {
      // Call regular transfer function
      console.log('Using regular transfer method');
      return await transfer(recipientAddress, transferAmount);
    }
};

/**
 * Format token balance (show only 2 decimal places, ignore excess parts directly)
 * @param {BigInt|number|null} balance - Balance
 * @returns {string} Formatted balance string
 */
export const formatBalance = (balance) => {
  if (balance === null) return '0';

  // Get current coin and chain configuration
  const currentCoin = getStoreState().currentCoin;
  const currentChain = getStoreState().currentChain;

  // Determine the number of decimal places to use
  // Use currentCoin.decimals if it exists, otherwise use currentChain.nativeCurrency.decimals
  const decimals = currentCoin?.decimals || currentChain?.nativeCurrency?.decimals || 18;

  // 根据小数位数格式化余额
  const divisor = 10 ** decimals;
  // return (Number(balance) / divisor).toFixed(2);
  return (Number(balance) / divisor);
};

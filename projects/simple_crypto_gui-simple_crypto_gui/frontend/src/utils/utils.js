import { useStore } from './store';
import { getBtcAccount } from './chainUtils/btcUtils';
import { getEthAccount } from './chainUtils/ethUtils';
import CryptoJS from 'crypto-js';
import { mnemonicToAccount } from 'viem/accounts';
import { useTranslation } from 'react-i18next';

// Helper function to get store state
export const getStoreState = () => useStore.getState();

/**
 * Get wallet address
 * @returns {Promise<string>} Wallet address
 */
export const getWalletAddress = async () => {
  // 获取账户
  const currentChain = getStoreState().currentChain

  if (typeof currentChain.id === 'string' && currentChain.id.startsWith('btc')) {
    const account = await getBtcAccount()
    console.log('BTC address is ', account.address)
    return account.address
  }

  const account = await getEthAccount();
  return account.address;
};

/**
 * Decrypt mnemonic phrase
 * @param {string} encryptedMnemonic Encrypted mnemonic phrase
 * @param {string} password Decryption password
 * @returns {string} Decrypted mnemonic phrase
 */
export const decryptMnemonic = (encryptedMnemonic, password) => {
  if (!encryptedMnemonic.startsWith('encrypted:')) return encryptedMnemonic;
  try {
    const encryptedData = encryptedMnemonic.replace('encrypted:', '');
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    const decryptedMnemonic = bytes.toString(CryptoJS.enc.Utf8);

    // 验证解密结果是否为有效的助记词
    validateMnemonic(decryptedMnemonic);

    return decryptedMnemonic;
  } catch (error) {
    throw new Error(useTranslation().t('decryptionFailedPasswordError'));
  }
};

/**
 * Get mnemonic phrase from localStorage
 * @param {string} password Decryption password (if mnemonic is encrypted)
 * @returns {string} Mnemonic phrase
 */
export const getMnemonicFromLocalStorage = (password = '') => {
  try {
    const storedMnemonic = localStorage.getItem('wallet-mnemonic');
    if (!storedMnemonic) return null;

    if (storedMnemonic.startsWith('encrypted:')) {
      if (!password) {
        throw new Error(useTranslation().t('mnemonicEncryptedEnterPassword'));
      }
      return decryptMnemonic(storedMnemonic, password);
    } else {
      return storedMnemonic;
    }
  } catch (error) {
    console.error('Failed to get mnemonic phrase:', error);
    throw error;
  }
};

/**
 * Check if mnemonic phrase is saved in localStorage
 * @returns {boolean} Whether it is saved
 */
export const isMnemonicSaved = () => {
  return !!localStorage.getItem('wallet-mnemonic');
};

/**
 * Check if saved mnemonic phrase is encrypted
 * @returns {boolean} Whether it is encrypted
 */
export const isMnemonicEncrypted = () => {
  const storedMnemonic = localStorage.getItem('wallet-mnemonic');
  return !!storedMnemonic && storedMnemonic.startsWith('encrypted:');
};

/**
 * Load mnemonic phrase from localStorage and decrypt if needed
 * @param {string} password Decryption password
 * @returns {Promise<string>} Decrypted mnemonic phrase
 */
export const loadMnemonic = async (password = '') => {
  try {
    // 检查是否已保存助记词
    if (!isMnemonicSaved()) {
      throw new Error(useTranslation().t('noSavedMnemonicFound'));
    }

    // 获取助记词（可能需要解密）
    const mnemonic = getMnemonicFromLocalStorage(password);

    // 使用更安全的模块级变量存储助记词
    getStoreState().setMnemonic(mnemonic);
    console.log('加载的助记词:', mnemonic);
    return mnemonic;
  } catch (error) {
    console.error('Failed to load mnemonic phrase:', error);
    throw error;
  }
};

/**
 * Validate mnemonic phrase
 * @param {string} mnemonic Mnemonic phrase to validate
 * @returns {boolean} Whether the mnemonic phrase is valid
 */
export const validateMnemonic = (mnemonic) => {
  if (!mnemonic || !mnemonic.trim()) {
    throw new Error(useTranslation().t('pleaseEnterMnemonic'));
  }

  try {
    mnemonicToAccount(mnemonic.trim());
    return true;
  } catch (error) {
    throw new Error(useTranslation().t('invalidMnemonicCheckAgain'));
  }
};
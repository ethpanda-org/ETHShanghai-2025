import { english, generateMnemonic } from 'viem/accounts';
import CryptoJS from 'crypto-js';
import { getStoreState, validateMnemonic } from './utils.js';
import { useTranslation } from 'react-i18next';

/**
 * Generate new mnemonic phrase
 * @returns {string} Generated mnemonic phrase
 */
export const generateNewMnemonic = () => {
  return generateMnemonic(english);
};

/**
 * Encrypt mnemonic phrase
 * @param {string} mnemonic Mnemonic phrase to encrypt
 * @param {string} password Encryption password
 * @returns {string} Encrypted mnemonic phrase
 */
export const encryptMnemonic = (mnemonic, password) => {
  if (!password) return mnemonic;
  return 'encrypted:' + CryptoJS.AES.encrypt(mnemonic, password).toString();
};

/**
 * Save mnemonic phrase to localStorage
 * @param {string} mnemonic Mnemonic phrase to save
 * @param {string} password Encryption password (optional)
 * @returns {boolean} Whether save was successful
 */
export const saveMnemonicToLocalStorage = (mnemonic, password = '') => {
  try {
    console.log('Before saving mnemonic:', mnemonic);
    console.log('Before saving mnemonic:', password);
    // Encrypt mnemonic phrase
    const encryptedMnemonic = encryptMnemonic(mnemonic, password);
    console.log('After saving mnemonic:', encryptedMnemonic);
    // Save to localStorage
    localStorage.setItem('wallet-mnemonic', encryptedMnemonic);
    // Use more secure module-level variable to store mnemonic phrase
    getStoreState().setMnemonic(mnemonic);
    return true;
  } catch (error) {
    console.error('Failed to save mnemonic:', error);
    throw new Error(useTranslation().t('failedToSaveMnemonic') + (error.message || useTranslation().t('unknownError')));
  }
};

/**
 * Handle main logic for creating or importing wallet
 * @param {string} selectedOption 'create' or 'import'
 * @param {string} mnemonic Mnemonic phrase provided when selectedOption is 'import'
 * @param {string} password Encryption password (optional)
 * @returns {Promise<string>} Processed mnemonic phrase
 */
export const handleWalletOperation = async (selectedOption, mnemonic, password = '') => {
  let newMnemonic;

  if (selectedOption === 'create') {
    // Generate new mnemonic phrase
    newMnemonic = generateNewMnemonic();
    console.log('Generated mnemonic:', newMnemonic);
  } else {
    // Import existing mnemonic phrase and validate
    validateMnemonic(mnemonic);
    newMnemonic = mnemonic.trim();
  }

  // Save mnemonic phrase to localStorage
  saveMnemonicToLocalStorage(newMnemonic, password);

  return newMnemonic;
};
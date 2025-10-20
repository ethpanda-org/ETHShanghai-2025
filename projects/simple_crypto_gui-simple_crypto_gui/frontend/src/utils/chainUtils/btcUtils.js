import * as btc from '@scure/btc-signer';
import { getWalletAddress, getStoreState } from '../utils.js';
import { hexToBytes } from '@noble/hashes/utils';
import { wordlist } from '@scure/bip39/wordlists/english';
import { mnemonicToSeed } from '@scure/bip39';
import { HDKey } from '@scure/bip32';

// Get Blockstream API base URL based on current network
const getBlockstreamApiBase = () => {
  const currentChain = getStoreState().currentChain;
  return currentChain.id === 'btc_mainnet'
    ? 'https://blockstream.info/api' // Mainnet API
    : 'https://blockstream.info/testnet/api'; // Testnet API
};

/**
 * Get BTC account information (including public key, private key and address)
 * @returns {Promise<{publicKey: Uint8Array, privateKey: Uint8Array, address: string}>}
 */
export const getBtcAccount = async () => {
  try {
    // Get mnemonic
    const mnemonic = getStoreState().mnemonic;
    if (!mnemonic) {
      throw new Error('Mnemonic not detected, please create wallet on welcome page first');
    }

    // Convert mnemonic to seed
    const seed = await mnemonicToSeed(mnemonic.trim(), wordlist);

    // Create HD wallet using @scure/bip32
    const root = HDKey.fromMasterSeed(seed);

    // Get current network
    const currentChain = getStoreState().currentChain;

    // Select derivation path based on network
    // Mainnet: m/44'/0'/0'/0/0 (0 represents mainnet)
    // Testnet: m/44'/1'/0'/0/0 (1 represents testnet)
    const path = currentChain.id === 'btc_mainnet' ? "m/44'/0'/0'/0/0" : "m/44'/1'/0'/0/0";
    const child = root.derive(path);

    if (!child.privateKey) {
      throw new Error('Cannot get BTC private key, please ensure mnemonic is correct');
    }

    // Generate BTC address using @scure/btc-signer
    // Extract public key and convert to compressed format
    const publicKey = child.publicKey;
    // Create segwit address using p2wpkh (Pay to Witness Public Key Hash)

    // Check if @scure/btc-signer library has p2wpkh method
    if (!btc.p2wpkh) {
      throw new Error('btc.p2wpkh not found');
    }

    // Select network parameters based on network
    const network = currentChain.id === 'btc_mainnet' ? btc.NETWORK : btc.TEST_NETWORK;

    // Create address using p2wpkh method
    const addressObj = btc.p2wpkh(publicKey, network);

    if (!addressObj || !addressObj.address) {
      throw new Error('Failed to generate BTC address');
    }

    // Return object containing public key, private key and address
    return {
      publicKey: child.publicKey,
      privateKey: child.privateKey,
      address: addressObj.address
    };
  } catch (error) {
    console.error('Failed to get BTC account information:', error);
    throw new Error('Failed to get BTC account information: ' + error.message);
  }
};

/**
 * Query BTC balance
 * @returns {Promise<BigInt>} Balance (Satoshis, BigInt)
 */
export const fetchBtcBalance = async () => {
  try {
    // Get BTC address
    const address = await getWalletAddress();
    console.log('Address for querying BTC balance:', address);

    // Select API endpoint based on current network
    const apiBase = getBlockstreamApiBase();
    const apiUrl = `${apiBase}/address/${address}`;

    const response = await fetch(apiUrl);

    // Check response status
    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(`Failed to query BTC balance: HTTP ${response.status}, response: ${responseText.substring(0, 100)}`);
    }

    // Destructure required variables at once
    const { chain_stats: { funded_txo_sum, spent_txo_sum } = {} } = await response.json();
    if (funded_txo_sum === undefined || spent_txo_sum === undefined) {
      throw new Error('Balance response data structure is incomplete');
    }
    const balance = BigInt(funded_txo_sum) - BigInt(spent_txo_sum);

    return balance;
  } catch (error) {
    console.error('Failed to query BTC balance:', error);
    throw new Error('Failed to query BTC balance: ' + error.message);
  }
};

/**
 * Validate BTC transfer input
 * @param {string} recipientAddress - Recipient address
 * @param {string} transferAmount - Transfer amount
 * @returns {Promise<{success: boolean, amount: number|null, error: string|null}>} Validation result and converted amount
 */
export const validateBtcTransferInput = async (recipientAddress, transferAmount) => {
  // Validate if inputs exist
  if (!recipientAddress || !transferAmount) {
    return {
      success: false,
      amount: null,
      error: 'Please enter recipient address and transfer amount'
    };
  }

  // Validate amount format
  const amount = parseFloat(transferAmount);
  if (isNaN(amount) || amount <= 0) {
    return {
      success: false,
      amount: null,
      error: 'Please enter a valid transfer amount'
    };
  }

  return {
    success: true,
    amount,
    error: null
  };
};

/**
 * Get BTC miner fee estimate
 * @returns {Promise<number>} Estimated miner fee (satoshi)
 */
export const estimateBtcMinerFee = async () => {
  let minerFee = 1000; // Default miner fee as fallback
  try {
    // Select API endpoint based on current network
    const apiBase = getBlockstreamApiBase();
    const feeResponse = await fetch(`${apiBase}/fee-estimates`);
    if (feeResponse.ok) {
      let feeData;
      try {
        feeData = await feeResponse.json();
        // Blockstream API returns miner fee estimates for different confirmation counts (satoshi per vbyte)
        // Use 6-block confirmation miner fee as medium priority
        const satoshiPerVbyte = feeData["6"] || 4; // Default 4 satoshi per vbyte
        // Estimate transaction size is about 250 bytes
        // Round up to ensure miner fee is integer (satoshi is the smallest unit of bitcoin, cannot have decimals)
        minerFee = Math.ceil(satoshiPerVbyte * 250);
        // Ensure miner fee is at least 1000 satoshi
        minerFee = Math.max(minerFee, 1000);
      } catch (jsonError) {
        console.warn('Failed to parse fee response, using default value: ' + jsonError.message);
      }
    }
  } catch (feeError) {
    console.warn('Failed to get miner fee estimate, using default value: ' + feeError.message);
  }
  return minerFee;
};

/**
 * Get UTXOs for BTC address
 * @param {string} address - BTC address
 * @returns {Promise<Array>} UTXO list
 */
export const fetchBtcUtxos = async (address) => {
  try {
    // Select API endpoint based on current network
    const apiBase = getBlockstreamApiBase();
    const url = `${apiBase}/address/${address}/utxo`;
    console.log('API URL for fetching UTXOs:', url);
    const utxosResponse = await fetch(url);

    if (!utxosResponse.ok) {
      // Get response text for better debugging
      const responseText = await utxosResponse.text();
      throw new Error(`Failed to query UTXOs: HTTP ${utxosResponse.status}, response: ${responseText.substring(0, 100)}`);
    }

    // Safely parse JSON response
    let utxosData;
    try {
      utxosData = await utxosResponse.json();
    } catch (jsonError) {
      // Get response text for better debugging
      const responseText = await utxosResponse.text();
      throw new Error(`Failed to parse UTXO response: ${jsonError.message}, response content: ${responseText.substring(0, 100)}`);
    }

    if (!utxosData || utxosData.length === 0) {
      throw new Error('No available UTXOs in address');
    }

    // UTXOs returned by Blockstream API are already unspent, no need to filter
    return utxosData;
  } catch (error) {
    console.error('fetchBtcUtxos error:', error);
    throw error;
  }
};

/**
 * Get complete transaction data (including output scripts)
 * @param {string} txid - Transaction ID
 * @returns {Promise<{rawHex: string, outputs: Array}>} Raw transaction data and output list
 */
export const fetchRawBtcTransaction = async (txid) => {
  try {
    // Select API endpoint based on current network
    const apiBase = getBlockstreamApiBase();
    // First get transaction details
    const txDetailUrl = `${apiBase}/tx/${txid}`;
    console.log('API URL for fetching transaction details:', txDetailUrl);
    const txDetailResponse = await fetch(txDetailUrl);

    if (!txDetailResponse.ok) {
      // Get response text for better debugging
      const responseText = await txDetailResponse.text();
      throw new Error(`Failed to fetch transaction details: HTTP ${txDetailResponse.status}, response: ${responseText.substring(0, 100)}`);
    }

    // Safely parse JSON response
    let txDetailData;
    try {
      txDetailData = await txDetailResponse.json();
    } catch (jsonError) {
      // Get response text for better debugging
      const responseText = await txDetailResponse.text();
      throw new Error(`Failed to parse transaction details response: ${jsonError.message}, response content: ${responseText.substring(0, 100)}`);
    }

    // Then get raw transaction hex data
    const rawTxUrl = `${apiBase}/tx/${txid}/hex`;
    console.log('API URL for fetching raw transaction:', rawTxUrl);
    const rawTxResponse = await fetch(rawTxUrl);

    if (!rawTxResponse.ok) {
      // Get response text for better debugging
      const responseText = await rawTxResponse.text();
      throw new Error(`Failed to fetch raw transaction: HTTP ${rawTxResponse.status}, response: ${responseText.substring(0, 100)}`);
    }

    const rawHex = await rawTxResponse.text();

    if (!rawHex || !txDetailData.vout) {
      throw new Error(`Failed to get complete data for transaction ${txid}, response structure is incomplete`);
    }

    // Process output list to ensure format compatibility
    const outputs = txDetailData.vout.map((output, index) => {
      // Validate if output.value is valid

      if (output.value === undefined || output.value === null || isNaN(output.value) || output.value <= 0) {
        throw new Error(`Invalid transaction output value: ${output.value}, index: ${index}, transaction ID: ${txid}`);
      }

      return {
        script: output.scriptpubkey, // Field name for script in Blockstream API is scriptpubkey
        value: output.value
      };
    });

    return {
      rawHex: rawHex, // 原始交易十六进制
      outputs: outputs // 交易输出列表（包含脚本）
    };
  } catch (err) {
    console.error('fetchRawBtcTransaction error:', err);
    throw err;
  }
};

/**
 * Determine UTXO type by output script
 * @param {string} scriptHex - Output script hex
 * @returns {string} UTXO type
 */
export const getUtxoType = (scriptHex) => {
  // Segwit P2WPKH: Script starts with 0014, length 22 bytes (44 characters)
  if (scriptHex.startsWith('0014') && scriptHex.length === 44) {
    return 'witness_v0_keyhash'; // Segwit
  }
  // Non-segwit P2PKH: Script starts with 76a914, ends with 88ac, length 25 bytes (50 characters)
  else if (scriptHex.startsWith('76a914') && scriptHex.endsWith('88ac') && scriptHex.length === 50) {
    return 'pubkeyhash'; // Non-segwit
  }
  // P2SH: Script starts with a914, ends with 87, length 23 bytes (46 characters)
  else if (scriptHex.startsWith('a914') && scriptHex.endsWith('87') && scriptHex.length === 46) {
    return 'scripthash'; // Non-segwit
  }
  else {
    throw new Error(`Unsupported script format: ${scriptHex.slice(0, 10)}...`);
  }
};

/**
 * Create BTC transaction
 * @param {string} senderAddress - Sender address
 * @param {string} recipientAddress - Recipient address
 * @param {number} amountInSatoshi - Transfer amount (satoshi)
 * @param {number} minerFee - Miner fee (satoshi)
 * @param {Array} utxos - UTXO list
 * @returns {Promise<{tx: Object, totalInput: number}>} Transaction object and total input amount
 */
export const createBtcTransaction = async (senderAddress, recipientAddress, amountInSatoshi, minerFee, utxos) => {
  // Get current network
  const currentChain = getStoreState().currentChain;

  // Select network parameters based on network
  const network = currentChain.id === 'btc_mainnet' ? btc.NETWORK : btc.TEST_NETWORK;

  // Create transaction - using correct network configuration
  const tx = new btc.Transaction({ network });

  // Add inputs (UTXO)
  let totalInput = 0;
  for (const utxo of utxos) {
    if (totalInput < amountInSatoshi + minerFee) {
      const txHash = utxo.txid; // Field name in blockstream API
      const vout = utxo.vout;   // Field name in blockstream API
      const value = utxo.value;

      // Validate if UTXO value is valid
      if (value === undefined || value === null || isNaN(value) || value <= 0) {
        throw new Error(`Invalid UTXO value: ${value}, index: ${vout}, transaction ID: ${txHash}`);
      }

      // Get complete transaction data containing this UTXO
      const { rawHex: rawTxHex, outputs } = await fetchRawBtcTransaction(txHash);

      // Extract the output script (scriptPubKey) corresponding to this UTXO
      const output = outputs[vout];
      if (!output) {
        throw new Error(`UTXO index ${vout} does not exist in transaction ${txHash}`);
      }
      const scriptHex = output.script; // Output script (hex)

      // Determine UTXO type
      const utxoType = getUtxoType(scriptHex);

      const txidBytes = hexToBytes(txHash);

      // Add input by type, providing all necessary information at once
      if (utxoType === 'witness_v0_keyhash') {
        // Segwit UTXO (P2WPKH)
        tx.addInput({
          txid: txidBytes,
          index: vout,
          witnessUtxo: {
            amount: BigInt(value),
            script: hexToBytes(scriptHex)
          }
        });
      } else {
        // Non-segwit UTXO (P2PKH/P2SH)
        tx.addInput({
          txid: txidBytes,
          index: vout,
          nonWitnessUtxo: hexToBytes(rawTxHex)
        });
      }

      // Accumulate total input amount
      totalInput += value;
    }
  }

  // Validate if transfer amount is valid
  if (!amountInSatoshi || isNaN(amountInSatoshi) || amountInSatoshi <= 0) {
    throw new Error(`Invalid transfer amount: ${amountInSatoshi}`);
  }

  // Add output - using standard format
  tx.addOutputAddress(recipientAddress, BigInt(amountInSatoshi), network);


  // Add change output (if any)
  const change = totalInput - amountInSatoshi - minerFee; // Subtract amount and miner fee

  // Validate if change amount is valid
  if (change > 0) {
    if (isNaN(change) || change <= 0) {
      throw new Error(`Invalid change amount: ${change}`);
    }
    tx.addOutputAddress(senderAddress, BigInt(change), network);
  }

  return { tx, totalInput };
}

/**
 * Sign BTC transaction
 * @param {Object} tx - Transaction object
 * @param {Uint8Array} privateKey - Private key
 * @returns {string} Serialized transaction hex string
 */
export const signBtcTransaction = async (tx, privateKey) => {
  tx.sign(privateKey)
  // Finalize transaction
  tx.finalize();

  // Serialize transaction
  return tx.hex;
};

/**
 * Broadcast BTC transaction
 * @param {string} rawTx - Serialized transaction hex string
 * @returns {Promise<string>} Transaction hash
 */
export const broadcastBtcTransaction = async (rawTx) => {
  try {
    // Select API endpoint based on current network
    const apiBase = getBlockstreamApiBase();
    const apiUrl = `${apiBase}/tx`;
    console.log('API URL for broadcasting transaction:', apiUrl);

    const broadcastResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: rawTx
    });

    if (!broadcastResponse.ok) {
      // Get response text for better debugging
      const responseText = await broadcastResponse.text();
      throw new Error(`Failed to broadcast transaction: HTTP ${broadcastResponse.status}, response: ${responseText.substring(0, 100)}`);
    }

    // Blockstream API returns transaction hash string
    const txHash = await broadcastResponse.text();

    if (!txHash || txHash.trim() === '') {
      throw new Error('Transaction broadcast successful but no transaction hash returned');
    }

    return txHash.trim();
  } catch (error) {
    console.error('Failed to broadcast BTC transaction:', error);
    throw new Error('Failed to broadcast transaction: ' + error.message);
  }
};

/**
 * Process Bitcoin testnet transfer
 * @param {string} recipientAddress - Recipient address
 * @param {string} transferAmount - Transfer amount
 * @returns {Promise<{success: boolean, hash: string, error: string|null}>} Transfer result
 */
export const transferBtc = async (
  recipientAddress,
  transferAmount
) => {
  try {
    // 1. Validate input
    const validationResult = await validateBtcTransferInput(recipientAddress, transferAmount);
    if (!validationResult.success) {
      throw new Error(validationResult.error);
    }
    const { amount } = validationResult;
    console.log('Step 1: Input validation successful, transfer amount:', amount);

    // 2. Get BTC account information
    let btcAccount = await getBtcAccount();

    const { address: senderAddress, privateKey } = btcAccount;

    if (!privateKey) {
      throw new Error('Cannot get BTC private key');
    }
    console.log('Step 2: BTC account information obtained successfully, sender address:', senderAddress);

    // 3. Estimate miner fee
    const minerFee = await estimateBtcMinerFee();
    console.log('Step 3: Miner fee estimation successful, miner fee:', minerFee, 'satoshi');

    // 4. Get UTXOs
    const utxos = await fetchBtcUtxos(senderAddress);
    console.log('Step 4: UTXOs obtained successfully, found', utxos.length, 'unspent outputs');

    // 5. Convert amount to satoshi (1 BTC = 100,000,000 satoshi)
    const amountInSatoshi = Math.round(amount * 100000000);
    console.log('Step 5: Amount conversion successful, converted amount:', amountInSatoshi, 'satoshi');

    // Validate if amount is valid
    if (!amountInSatoshi || isNaN(amountInSatoshi) || amountInSatoshi <= 0) {
      throw new Error('Invalid transfer amount');
    }

    // 6. Create transaction
    const { tx } = await createBtcTransaction(
      senderAddress,
      recipientAddress,
      amountInSatoshi,
      minerFee,
      utxos
    );
    console.log('Step 6: Transaction creation successful, number of inputs:', tx.inputs.length, 'number of outputs:', tx.outputs.length);

    // 7. Sign transaction
    const rawTx = await signBtcTransaction(tx, privateKey);
    console.log('Step 7: Transaction signing successful, transaction size approximately:', Math.round(rawTx.length / 2), 'bytes');

    // 8. Broadcast transaction
    const txHash = await broadcastBtcTransaction(rawTx);
    console.log('Step 8: Transaction broadcast successful, transaction hash:', txHash);

    return {
      success: true,
      hash: txHash,
      error: null
    };
  } catch (error) {
    console.error('BTC transfer failed:', error);
    throw new Error('BTC transfer failed: ' + error.message);
  }
};

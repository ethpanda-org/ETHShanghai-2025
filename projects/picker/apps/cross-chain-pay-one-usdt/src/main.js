const axios = require('axios');
const ethers = require('ethers');
const fs = require('fs');
const path = require('path');
const toml = require('@iarna/toml');

// USDT contract ABI (simplified version, only contains approve function)
const USDT_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)'
];

// USDT contract address on Sepolia ETH chain
const SEPOLIA_USDT_ADDRESS = '0xd53e9530107a8d8856099d7d80126478d48e06dA';

// Get price information
async function getPrice(from, to, amount, fromAddress) {
  try {
    const response = await axios.post('https://relayer.meson.fi/api/v1/price', {
      from: from,
      to: to,
      amount: amount,
      fromAddress: fromAddress
    });
    return response.data;
  } catch (error) {
    console.error('Failed to get price information:', error.message);
    throw error;
  }
}

// Approve token to Meson contract
async function approveToken(provider, privateKey, amount) {
  try {
    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey, provider);
    
    // Create USDT contract instance
    const usdtContract = new ethers.Contract(SEPOLIA_USDT_ADDRESS, USDT_ABI, wallet);
    
    // Note: USDT typically uses 6 decimals
    const approveAmount = ethers.parseUnits(amount, 6);
    
    // Execute approval
    const tx = await usdtContract.approve(
      '0x25aB3Efd52e6470681CE037cD546Dc60726948D3', // Meson contract address
      approveAmount
    );
    
    console.log('Approval transaction submitted, hash:', tx.hash);
    
    // Wait for transaction confirmation
    const receipt = await tx.wait();
    console.log('Approval transaction confirmed, block number:', receipt.blockNumber);
    
    return true;
  } catch (error) {
    console.error('Token approval failed:', error.message);
    throw error;
  }
}

// Encode cross-chain transfer request
async function encodeSwap(from, to, amount, fromAddress, recipient) {
  try {
    const response = await axios.post('https://relayer.meson.fi/api/v1/swap', {
      from: from,
      to: to,
      amount: amount,
      fromAddress: fromAddress,
      recipient: recipient
    });
    return response.data;
  } catch (error) {
    console.error('Failed to encode transfer request:', error.message);
    throw error;
  }
}

// Submit transaction to blockchain
async function submitTransaction(provider, privateKey, txData) {
  try {
    // Create wallet instance
    const wallet = new ethers.Wallet(privateKey, provider);
    
    const txResponse = await wallet.sendTransaction({
      to: txData.to,
      value: txData.value ? ethers.hexlify(txData.value) : '0x0',
      data: txData.data,
      gasLimit: txData.gasLimit || ethers.toBeHex(200000),
      gasPrice: txData.gasPrice || await provider.getGasPrice()
    });
    
    console.log('Transaction submitted, hash:', txResponse.hash);
    
    // Wait for transaction confirmation
    const receipt = await txResponse.wait();
    console.log('Transaction confirmed, block number:', receipt.blockNumber);
    
    return txResponse.hash;
  } catch (error) {
    console.error('Failed to submit transaction:', error.message);
    throw error;
  }
}

// Sign transfer data and submit
async function signAndSubmitSwap(encoded, signature, fromAddress, recipient) {
  try {
    const response = await axios.post(
      `https://relayer.meson.fi/api/v1/swap/${encoded}`,
      {
        fromAddress: fromAddress,
        recipient: recipient,
        signature: signature
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        maxBodyLength: Infinity
      }
    );
    return response.data;
  } catch (error) {
    console.error('Failed to submit signed transfer request:', error.message);
    throw error;
  }
}

// Server-side signing
async function signDataOnServer(privateKey, signingRequest) {
  try {
    const wallet = new ethers.Wallet(privateKey);
    
    if (signingRequest.hash) {
      // Calculate hash and compare with provided hash
      const calculatedHash = ethers.keccak256(signingRequest.message);
      
      if (calculatedHash !== signingRequest.hash) {
        throw new Error('Invalid hash: Calculated hash does not match provided hash');
      }
      
      // Sign the hash using standard method
      const sig = wallet.signingKey.sign(signingRequest.hash);
      
      // Build standard Ethereum signature format
      const v = (sig.v % 27) + 27;
      const signature = ethers.solidityPacked(
        ['bytes32', 'bytes32', 'uint8'],
        [sig.r, sig.s, v]
      );
      
      // Ensure signature starts with 0x
      const formattedSignature = `0x${signature.slice(2)}`;
      return formattedSignature;
    } else {
      // Fallback to previous method if no hash provided
      console.warn('Warning: No hash provided, using compatibility mode for signing');
      let messageToSign;
      if (typeof signingRequest === 'string') {
        messageToSign = signingRequest;
      } else if (signingRequest.message) {
        messageToSign = signingRequest.message;
      } else {
        messageToSign = JSON.stringify(signingRequest);
      }
      
      const signature = await wallet.signMessage(messageToSign);
      return signature;
    }
  } catch (error) {
    console.error('Failed to sign data:', error.message);
    throw error;
  }
}

// Query transfer status
async function getSwapStatus(swapId) {
  try {
    const response = await axios.get(
      `https://relayer.meson.fi/api/v1/swap/status/${swapId}`
    );
    return response.data;
  } catch (error) {
    console.error('Failed to query transfer status:', error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    console.log('=== Meson API Cross-Chain Transfer Application Started ===');
    
    // Read config file path
    const configPath = path.join(path.dirname(path.dirname(__filename)), 'config.toml');
    
    // Read config
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = toml.parse(configContent);
    
    // Validate required config
    if (!config.environment.from || !config.environment.to || !config.environment.fromAddress || !config.environment.recipient || !config.environment.amount) {
      throw new Error('Config file missing required parameters');
    }
    
    // Check if private key is set in config, try to read from environment variable if not
    if (!config.environment.privateKey) {
      const envPrivateKey = process.env.PRIVATE_KEY;
      
      if (envPrivateKey) {
        config.environment.privateKey = envPrivateKey;
      } else {
        throw new Error('Private key not set in config file and not found in environment variable (please set PRIVATE_KEY environment variable)');
      }
    }
    
    console.log('Configuration validated, preparing cross-chain transfer...');
    console.log(`Transfer info: ${config.environment.from} -> ${config.environment.to}, amount: ${config.environment.amount}`);
    
    // Initialize provider (for EVM chain - mainnet)
    const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/7cb673f9a1324974899fc4cd4429b450');
    
    // Get price information (optional)
    const priceInfo = await getPrice(
      config.environment.from,
      config.environment.to,
      config.environment.amount.toString(),
      config.environment.fromAddress
    );
    
    // Prompt user about authorization if needed
    if (config.environment.from.includes('usdt')) {
      console.log('\n=== IMPORTANT NOTE ===');
      console.log('Before proceeding with cross-chain transfer, ensure you have approved Meson contract for USDT token through your Sepolia ETH wallet:');
      console.log('- Meson contract address: 0x25aB3Efd52e6470681CE037cD546Dc60726948D3');
      console.log('- Recommended approval amount: at least', (parseFloat(config.environment.amount) + 1).toString());
      console.log('If not approved yet, please complete the approval before continuing.');
    }
    
    // Encode transfer request
    const swapData = await encodeSwap(
      config.environment.from,
      config.environment.to,
      config.environment.amount.toString(),
      config.environment.fromAddress,
      config.environment.recipient
    );
    
    // Select transfer method and execute
    let swapResult;
    
    // Extract result object from response
    const result = swapData.result || swapData;
    
    // Use signature method for ERC-20 tokens
    if (result.isErc20 || result.signingRequest) {
      console.log('Using signature method for cross-chain transfer...');
      
      // Sign data on server
      const signature = await signDataOnServer(config.environment.privateKey, result.signingRequest);
      
      // Submit signed transfer request
      swapResult = await signAndSubmitSwap(result.encoded, signature, result.fromAddress, result.recipient);
    } else if (result.tx) {
      console.log('Submitting transaction directly to blockchain...');
      
      // Submit transaction directly to blockchain
      const txHash = await submitTransaction(provider, config.environment.privateKey, result.tx);
      swapResult = swapData;
      // Save transaction hash for later use
      if (!swapResult.result) swapResult.result = {};
      swapResult.result.txHash = txHash;
    } else {
      throw new Error('No valid transfer method found');
    }
    
    console.log('Cross-chain transfer executed successfully!');
    
    // If there's a swapId, query transfer status
    const actualSwapResult = swapResult.result || swapResult;
    if (actualSwapResult.swapId) {
      console.log(`Will query transfer status after 30 seconds, ID: ${actualSwapResult.swapId}`);
      
      // Use setTimeout to query status after 30 seconds
      setTimeout(async () => {
        try {
          const status = await getSwapStatus(actualSwapResult.swapId);
          console.log('Final transfer status:', status);
        } catch (error) {
          console.error('Failed to query transfer status on schedule:', error.message);
        }
      }, 30000);
    }
    
    // Print transaction URLs
    if (actualSwapResult.swapId) {
      // Meson API transfer status URL
      const mesonSwapUrl = `https://relayer.meson.fi/api/v1/swap/status/${actualSwapResult.swapId}`;
      console.log('Transfer status query URL:', mesonSwapUrl);
    }
    
    // Print blockchain explorer URL
    if (actualSwapResult.txHash) {
      // Sepolia ETH blockchain explorer URL
      const explorerUrl = `https://sepolia.etherscan.io/transaction/${actualSwapResult.txHash}`;
      console.log('Blockchain explorer transaction URL:', explorerUrl);
    }
    
    console.log('=== Meson API Cross-Chain Transfer Application Execution Completed ===');
    return swapResult;
    
  } catch (error) {
    console.error('Cross-chain transfer execution failed:', error.message);
    throw error;
  }
}

// Export main function for entry.js
module.exports = { main };
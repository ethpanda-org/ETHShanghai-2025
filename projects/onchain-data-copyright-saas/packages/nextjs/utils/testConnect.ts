/**
 * Test script for verifying connection to BodhiBasedCopyright contract on Holesky
 */

import { ethers } from 'ethers';
import { BODHI_BASED_COPYRIGHT_ADDRESS, BODHI_BASED_COPYRIGHT_ABI } from '../config/deployedContracts.ts.bak';

// Holesky RPC endpoint
const HOLESKY_RPC_URL = 'https://ethereum-holesky-rpc.publicnode.com';
const HOLESKY_CHAIN_ID = 17000;

export async function testContractConnection() {
  try {
    console.log('🚀 Testing connection to BodhiBasedCopyright contract...');
    console.log(`📍 Contract Address: ${BODHI_BASED_COPYRIGHT_ADDRESS}`);
    console.log(`🌐 Network: Holesky (Chain ID: ${HOLESKY_CHAIN_ID})`);
    console.log('');

    // Create provider
    const provider = new ethers.providers.JsonRpcProvider(HOLESKY_RPC_URL);
    
    // Verify network
    const network = await provider.getNetwork();
    console.log(`✅ Connected to network: ${network.name} (Chain ID: ${network.chainId})`);
    
    if (network.chainId !== HOLESKY_CHAIN_ID) {
      throw new Error(`Wrong network! Expected Chain ID ${HOLESKY_CHAIN_ID}, got ${network.chainId}`);
    }

    // Create contract instance
    const contract = new ethers.Contract(
      BODHI_BASED_COPYRIGHT_ADDRESS,
      BODHI_BASED_COPYRIGHT_ABI,
      provider
    );

    // Read contract data
    console.log('');
    console.log('📖 Reading contract data...');
    
    // Get bodhi address
    const bodhiAddress = await contract.bodhi();
    console.log(`  Bodhi Protocol Address: ${bodhiAddress}`);
    
    // Get license index
    const licenseIndex = await contract.licenseIndex();
    console.log(`  License Index: ${licenseIndex.toString()}`);
    
    console.log('');
    console.log('✅ Contract connection test successful!');
    
    return {
      success: true,
      contractAddress: BODHI_BASED_COPYRIGHT_ADDRESS,
      bodhiAddress,
      licenseIndex: licenseIndex.toString(),
    };
  } catch (error: any) {
    console.error('❌ Contract connection test failed:');
    console.error(error.message);
    
    return {
      success: false,
      error: error.message,
    };
  }
}

// For direct execution in Node.js
if (require.main === module) {
  testContractConnection()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}


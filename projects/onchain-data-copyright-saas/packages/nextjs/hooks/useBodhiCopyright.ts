/**
 * Custom hook for interacting with BodhiBasedCopyright contract
 */

import { useState } from 'react';
import { useContractWrite, useContractRead, useNetwork, useSwitchNetwork } from 'wagmi';
import { BODHI_BASED_COPYRIGHT_ADDRESS, BODHI_BASED_COPYRIGHT_ABI } from '../config/deployedContracts.ts.bak';

const HOLESKY_CHAIN_ID = 17000;

export function useBodhiCopyright() {
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if we're on the correct network
  const isCorrectNetwork = chain?.id === HOLESKY_CHAIN_ID;

  // Read bodhi address
  const { data: bodhiAddress } = useContractRead({
    address: BODHI_BASED_COPYRIGHT_ADDRESS as `0x${string}`,
    abi: BODHI_BASED_COPYRIGHT_ABI,
    functionName: 'bodhi',
    chainId: HOLESKY_CHAIN_ID,
  });

  // Read license index
  const { data: licenseIndex } = useContractRead({
    address: BODHI_BASED_COPYRIGHT_ADDRESS as `0x${string}`,
    abi: BODHI_BASED_COPYRIGHT_ABI,
    functionName: 'licenseIndex',
    chainId: HOLESKY_CHAIN_ID,
  });

  // Write: Generate License
  const { writeAsync: generateLicense } = useContractWrite({
    address: BODHI_BASED_COPYRIGHT_ADDRESS as `0x${string}`,
    abi: BODHI_BASED_COPYRIGHT_ABI,
    functionName: 'generateLicense',
    chainId: HOLESKY_CHAIN_ID,
  });

  // Helper function to switch to Holesky
  const ensureCorrectNetwork = async () => {
    if (!isCorrectNetwork && switchNetwork) {
      await switchNetwork(HOLESKY_CHAIN_ID);
    }
  };

  // Helper function to create a license
  const createLicense = async (
    name: string,
    contentURI: string,
    externalLink: string,
    licenseType: number
  ) => {
    try {
      setIsLoading(true);
      await ensureCorrectNetwork();
      
      const tx = await generateLicense({
        args: [name, contentURI, externalLink, licenseType],
      });
      
      console.log('License created:', tx.hash);
      return tx;
    } catch (error) {
      console.error('Error creating license:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Read: Get License by Asset ID
  const getLicenseByAssetId = async (assetId: number) => {
    // This would typically use useContractRead, but for dynamic queries we can use wagmi's prepareContractWrite
    // For now, returning a placeholder
    return null;
  };

  return {
    // Contract info
    contractAddress: BODHI_BASED_COPYRIGHT_ADDRESS,
    bodhiAddress,
    licenseIndex,
    
    // Network status
    isCorrectNetwork,
    currentChainId: chain?.id,
    requiredChainId: HOLESKY_CHAIN_ID,
    
    // Actions
    createLicense,
    getLicenseByAssetId,
    ensureCorrectNetwork,
    
    // Status
    isLoading,
  };
}


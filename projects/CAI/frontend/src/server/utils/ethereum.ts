import { ethers } from 'ethers';
import { logger } from './logger';

const rpcUrl =
  process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL || 'http://localhost:8545';

export const provider = new ethers.JsonRpcProvider(rpcUrl);

const privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  logger.warn(
    'PRIVATE_KEY is not set. API routes that require signing will use a throwaway wallet.'
  );
}

export const wallet = privateKey
  ? new ethers.Wallet(privateKey, provider)
  : ethers.Wallet.createRandom().connect(provider);

export const getContract = (address: string, abi: ethers.InterfaceAbi) => {
  return new ethers.Contract(address, abi, wallet);
};

export const isValidAddress = (address: string): boolean => ethers.isAddress(address);

export const isValidHash = (hash: string): boolean =>
  /^0x[a-fA-F0-9]{64}$/.test(hash);

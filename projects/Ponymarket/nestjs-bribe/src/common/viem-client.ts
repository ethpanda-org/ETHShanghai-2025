import { createPublicClient, http } from 'viem';
import { hardhat, sepolia } from 'viem/chains';
import { ConfigService } from '@nestjs/config';

/**
 * Create a configured viem public client based on RPC_URL environment variable
 */
export function createConfiguredPublicClient(configService: ConfigService) {
  const rpcUrl = configService.get<string>('RPC_URL') || 'http://127.0.0.1:8545';

  // Determine chain based on RPC URL
  let chain;
  if (rpcUrl.includes('sepolia')) {
    chain = sepolia;
  } else if (rpcUrl.includes('127.0.0.1') || rpcUrl.includes('localhost')) {
    chain = hardhat;
  } else {
    // Default to hardhat for unknown chains
    chain = hardhat;
  }

  const client = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  console.log(`🌐 Viem client connected to: ${rpcUrl} (Chain: ${chain.name})`);

  return client;
}

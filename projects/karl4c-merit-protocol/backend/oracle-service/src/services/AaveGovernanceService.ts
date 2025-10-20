import axios from 'axios';
import { AaveGovernanceData } from '../types';
import { logger } from '../utils/logger';
import { createPublicClient, http, parseAbi } from 'viem';
import { mainnet } from 'viem/chains';

/**
 * Aave DAO Governance Service
 * Fetches user's Aave governance participation data
 */
export class AaveGovernanceService {
  // Using public Studio endpoint
  private graphqlUrl = 'https://api.studio.thegraph.com/query/1/aave-v2-governance/version/latest';
  private aaveGovernanceAddress = '0xEC568fffba86c094cf06b22134B23074DFE2252c'; // Aave Governance V2
  private client;

  constructor(rpcUrl?: string) {
    this.client = createPublicClient({
      chain: mainnet,
      transport: http(rpcUrl || 'https://eth.llamarpc.com'),
    });
  }

  /**
   * Get Aave governance data for an address
   * @param address User's Ethereum address
   * @returns AaveGovernanceData or null if error
   */
  async getGovernanceData(address: string): Promise<AaveGovernanceData | null> {
    try {
      // Query Aave Governance subgraph
      const query = `
        query GetUserGovernance($address: String!) {
          user(id: $address) {
            id
            votes {
              id
              support
              votingPower
              proposal {
                id
                state
              }
            }
            proposals {
              id
              state
            }
          }
        }
      `;

      const response = await axios.post(
        this.graphqlUrl,
        {
          query,
          variables: { address: address.toLowerCase() },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000,
        }
      );

      const user = response.data?.data?.user;

      if (!user) {
        logger.info(`No Aave governance activity found for ${address}`);
        return {
          hasVoted: false,
          proposalsVoted: 0,
          votingPower: 0,
          delegatedPower: 0,
          proposalsCreated: 0,
        };
      }

      // Get current voting power
      const votingPower = await this.getVotingPower(address);
      const delegatedPower = await this.getDelegatedPower(address);

      return {
        hasVoted: user.votes && user.votes.length > 0,
        proposalsVoted: user.votes?.length || 0,
        votingPower: votingPower,
        delegatedPower: delegatedPower,
        proposalsCreated: user.proposals?.length || 0,
      };
    } catch (error: any) {
      logger.error(`Error fetching Aave governance data for ${address}:`, error.message);
      return null;
    }
  }

  /**
   * Get user's current voting power
   */
  private async getVotingPower(address: string): Promise<number> {
    try {
      const abi = parseAbi([
        'function getVotingPowerAt(address user, uint256 blockNumber) view returns (uint256)',
      ]);

      const blockNumber = await this.client.getBlockNumber();
      
      const votingPower = await this.client.readContract({
        address: this.aaveGovernanceAddress as `0x${string}`,
        abi,
        functionName: 'getVotingPowerAt',
        args: [address as `0x${string}`, blockNumber],
      });

      // Convert from wei to AAVE tokens (18 decimals)
      return Number(votingPower) / 1e18;
    } catch (error: any) {
      logger.warn(`Could not fetch voting power for ${address}:`, error.message);
      return 0;
    }
  }

  /**
   * Get user's delegated power
   */
  private async getDelegatedPower(address: string): Promise<number> {
    try {
      // Query delegations from subgraph
      const query = `
        query GetDelegations($address: String!) {
          user(id: $address) {
            delegatedPower
            delegatedPowerByType {
              delegatedPower
              type
            }
          }
        }
      `;

      const response = await axios.post(
        this.graphqlUrl,
        {
          query,
          variables: { address: address.toLowerCase() },
        },
        { timeout: 5000 }
      );

      const delegatedPower = response.data?.data?.user?.delegatedPower || '0';
      return parseFloat(delegatedPower) / 1e18;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Check if user has participated in Aave governance
   */
  async hasGovernanceActivity(address: string): Promise<boolean> {
    const data = await this.getGovernanceData(address);
    return data?.hasVoted || false;
  }
}

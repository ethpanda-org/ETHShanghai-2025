import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { createPublicClient, http, parseAbiItem, type Log, type PublicClient } from 'viem';
import { hardhat } from 'viem/chains';

export interface Market {
  conditionId: string;
  oracle: string;
  questionId: string;
  outcomeSlotCount: number;
  initialYesPrice: string;
  blockNumber: string;
  transactionHash: string;
  createdAt: number;
  startTime: string;
  endTime: string;
}

@Injectable()
export class MarketsService implements OnModuleInit {
  private redis: Redis;
  private publicClient: any;
  private readonly CTF_ADDRESS: `0x${string}`;
  private readonly BRIBE_MANAGER_ADDRESS: `0x${string}`;

  constructor(private configService: ConfigService) {
    // Read contract addresses from environment variable
    this.CTF_ADDRESS = this.configService.get<string>('MOCK_CTF_ADDRESS')as `0x${string}`;
    this.BRIBE_MANAGER_ADDRESS = this.configService.get<string>('BRIBE_MANAGER_ADDRESS') as `0x${string}`;

    this.redis = new Redis({
      host: 'localhost',
      port: 6381,
      db: 0,
    });

    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http('http://127.0.0.1:8545'),
    });

    console.log(`📍 Monitoring contract: ${this.CTF_ADDRESS}`);
  }

  async onModuleInit() {
    console.log('🚀 Starting event indexing...');

    // Check if contract address has changed
    await this.checkAndHandleContractChange();

    await this.indexPastEvents();
    this.watchNewEvents();
  }

  /**
   * Check if contract address has changed since last run
   * If changed, clear all market data from Redis
   */
  private async checkAndHandleContractChange() {
    const REDIS_KEY_CONTRACT_ADDRESS = 'system:ctf_contract_address';

    try {
      const lastKnownAddress = await this.redis.get(REDIS_KEY_CONTRACT_ADDRESS);

      if (lastKnownAddress && lastKnownAddress !== this.CTF_ADDRESS) {
        console.log('⚠️  Contract address changed!');
        console.log(`   Old: ${lastKnownAddress}`);
        console.log(`   New: ${this.CTF_ADDRESS}`);
        console.log('🗑️  Clearing all market data from Redis...');

        // Get all market keys and delete them
        const marketKeys = await this.redis.keys('market:*');
        if (marketKeys.length > 0) {
          await this.redis.del(...marketKeys);
          console.log(`   Deleted ${marketKeys.length} market entries`);
        }

        // Clear the markets list
        await this.redis.del('markets');
        console.log('   Cleared markets list');
      }

      // Store current contract address
      await this.redis.set(REDIS_KEY_CONTRACT_ADDRESS, this.CTF_ADDRESS);

      if (!lastKnownAddress) {
        console.log('📝 First run - stored contract address');
      }
    } catch (error) {
      console.error('❌ Error checking contract address:', error);
    }
  }

  private async indexPastEvents() {
    try {
      const logs = (await this.publicClient.getLogs({
        address: this.CTF_ADDRESS as `0x${string}`,
        event: parseAbiItem(
          'event ConditionPreparation(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount, uint256 startTime, uint256 endTime)',
        ),
        fromBlock: 0n,
        toBlock: 'latest',
      })) as Log[];

      console.log(`📊 Found ${logs.length} past markets`);

      for (const log of logs) {
        await this.saveMarket(log);
      }
    } catch (error) {
      console.error('Error indexing past events:', error);
    }
  }

  private watchNewEvents() {
    this.publicClient.watchEvent({
      address: this.CTF_ADDRESS as `0x${string}`,
      event: parseAbiItem(
        'event ConditionPreparation(bytes32 indexed conditionId, address indexed oracle, bytes32 indexed questionId, uint256 outcomeSlotCount, uint256 startTime, uint256 endTime)',
      ),
      onLogs: async (logs) => {
        console.log(`📥 New market created: ${logs.length} events`);
        for (const log of logs) {
          await this.saveMarket(log);
        }
      },
    });
  }

  private async saveMarket(log: any) {
    const { conditionId, oracle, questionId, outcomeSlotCount, startTime, endTime } = log.args || {};

    const market: Market = {
      conditionId,
      oracle,
      questionId,
      outcomeSlotCount: Number(outcomeSlotCount),
      initialYesPrice: '0', // Could fetch from PriceUpdate event
      blockNumber: log.blockNumber?.toString() || '0',
      transactionHash: log.transactionHash || '',
      createdAt: Date.now(),
      startTime: startTime?.toString() || '0',
      endTime: endTime?.toString() || '0',
    };

    // Save to Redis
    await this.redis.set(
      `market:${conditionId}`,
      JSON.stringify(market),
    );

    // Add to list
    await this.redis.zadd(
      'markets:all',
      market.createdAt,
      conditionId,
    );

    console.log(`✅ Saved market: ${conditionId.slice(0, 10)}...`);
  }

  async getAllMarkets(): Promise<Market[]> {
    const conditionIds = await this.redis.zrevrange('markets:all', 0, -1);
    const markets: Market[] = [];

    for (const conditionId of conditionIds) {
      const data = await this.redis.get(`market:${conditionId}`);
      if (data) {
        markets.push(JSON.parse(data));
      }
    }

    return markets;
  }

  async getMarket(conditionId: string): Promise<Market | null> {
    const data = await this.redis.get(`market:${conditionId}`);
    return data ? JSON.parse(data) : null;
  }

  async getBribes(conditionId: string, outcome: number) {
    try {
      // Call BribeManager contract to get bribe pool IDs
      const bribePoolIds = (await this.publicClient.readContract({
        address: this.BRIBE_MANAGER_ADDRESS,
        abi: [
          {
            inputs: [
              { name: 'conditionId', type: 'bytes32' },
              { name: 'outcome', type: 'uint8' },
            ],
            name: 'getBribePoolsByMarket',
            outputs: [{ name: '', type: 'uint256[]' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'getBribePoolsByMarket',
        args: [conditionId as `0x${string}`, outcome],
      })) as bigint[];

      // Get details for each bribe pool
      const bribes = [];
      for (const poolId of bribePoolIds) {
        const bribePool = await this.publicClient.readContract({
          address: this.BRIBE_MANAGER_ADDRESS,
          abi: [
            {
              inputs: [{ name: 'bribePoolId', type: 'uint256' }],
              name: 'getBribePool',
              outputs: [
                {
                  components: [
                    { name: 'id', type: 'uint256' },
                    { name: 'sponsor', type: 'address' },
                    { name: 'token', type: 'address' },
                    { name: 'totalAmount', type: 'uint256' },
                    { name: 'startTime', type: 'uint256' },
                    { name: 'endTime', type: 'uint256' },
                    { name: 'conditionId', type: 'bytes32' },
                    { name: 'outcome', type: 'uint8' },
                  ],
                  name: '',
                  type: 'tuple',
                },
              ],
              stateMutability: 'view',
              type: 'function',
            },
          ],
          functionName: 'getBribePool',
          args: [poolId],
        });

        // Convert BigInt fields to strings for JSON serialization
        bribes.push({
          id: bribePool.id.toString(),
          sponsor: bribePool.sponsor,
          token: bribePool.token,
          totalAmount: bribePool.totalAmount.toString(),
          startTime: bribePool.startTime.toString(),
          endTime: bribePool.endTime.toString(),
          conditionId: bribePool.conditionId,
          outcome: bribePool.outcome,
        });
      }

      return bribes;
    } catch (error) {
      console.error('Error fetching bribes:', error);
      return [];
    }
  }
}

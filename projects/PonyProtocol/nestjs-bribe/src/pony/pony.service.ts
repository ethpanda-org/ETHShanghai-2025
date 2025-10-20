import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { createPublicClient, createWalletClient, http, parseAbiItem } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { hardhat } from 'viem/chains';
import { MarketsService } from '../markets/markets.service';

@Injectable()
export class PonyService implements OnModuleInit {
  private readonly logger = new Logger(PonyService.name);
  private publicClient: any;
  private walletClient: any;
  private account: any;
  private readonly PONY_PROTOCOL_ADDRESS: `0x${string}`;
  private readonly MOCK_CTF_ADDRESS: `0x${string}`;
  private trackedPositions: Set<string> = new Set();

  constructor(
    private configService: ConfigService,
    private marketsService: MarketsService,
  ) {
    this.PONY_PROTOCOL_ADDRESS = this.configService.get<string>('PONY_PROTOCOL_ADDRESS') as `0x${string}`;
    this.MOCK_CTF_ADDRESS = this.configService.get<string>('MOCK_CTF_ADDRESS') as `0x${string}`;

    // Use a private key from hardhat's default accounts
    // Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
    const HARVESTER_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
    this.account = privateKeyToAccount(HARVESTER_PRIVATE_KEY as `0x${string}`);

    this.publicClient = createPublicClient({
      chain: hardhat,
      transport: http('http://127.0.0.1:8545'),
    });

    this.walletClient = createWalletClient({
      account: this.account,
      chain: hardhat,
      transport: http('http://127.0.0.1:8545'),
    });

    this.logger.log(`🦄 Pony Harvester initialized`);
    this.logger.log(`   Protocol: ${this.PONY_PROTOCOL_ADDRESS}`);
    this.logger.log(`   Harvester: ${this.account.address}`);
  }

  async onModuleInit() {
    this.logger.log('🚀 Starting Pony Protocol auto-harvester...');
    await this.discoverPositions();
  }

  /**
   * Discover all active Pony positions by listening to Deposit events
   */
  private async discoverPositions() {
    try {
      const logs = await this.publicClient.getLogs({
        address: this.PONY_PROTOCOL_ADDRESS,
        event: parseAbiItem('event Deposited(address indexed user, bytes32 indexed conditionId, uint8 outcome, uint256 amount, uint256 ponyMinted)'),
        fromBlock: 0n,
        toBlock: 'latest',
      });

      this.logger.log(`📊 Found ${logs.length} Pony deposits`);

      for (const log of logs) {
        const { conditionId, outcome } = log.args || {};
        if (conditionId && outcome !== undefined) {
          const key = `${conditionId}-${outcome}`;
          this.trackedPositions.add(key);
        }
      }

      this.logger.log(`🎯 Tracking ${this.trackedPositions.size} positions`);
    } catch (error) {
      this.logger.error('Failed to discover positions:', error);
    }

    // Watch for new deposits
    this.watchNewDeposits();
  }

  /**
   * Watch for new deposits to track new positions
   */
  private watchNewDeposits() {
    this.publicClient.watchEvent({
      address: this.PONY_PROTOCOL_ADDRESS,
      event: parseAbiItem('event Deposited(address indexed user, bytes32 indexed conditionId, uint8 outcome, uint256 amount, uint256 ponyMinted)'),
      onLogs: (logs) => {
        for (const log of logs) {
          const { conditionId, outcome } = log.args || {};
          if (conditionId && outcome !== undefined) {
            const key = `${conditionId}-${outcome}`;
            if (!this.trackedPositions.has(key)) {
              this.trackedPositions.add(key);
              this.logger.log(`🆕 New position tracked: ${key}`);
            }
          }
        }
      },
    });
  }

  /**
   * Auto-harvest every 5 minutes
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoHarvest() {
    this.logger.log('🔄 Starting auto-harvest cycle...');
    
    let harvestedCount = 0;
    let totalRewards = 0n;

    for (const positionKey of this.trackedPositions) {
      const [conditionId, outcomeStr] = positionKey.split('-');
      const outcome = parseInt(outcomeStr);

      try {
        const result = await this.harvestPosition(conditionId as `0x${string}`, outcome);
        if (result.success && result.amount > 0n) {
          harvestedCount++;
          totalRewards += result.amount;
          this.logger.log(`   ✅ Harvested ${result.amount} from ${conditionId.slice(0, 10)}... outcome ${outcome}`);
        }
      } catch (error) {
        this.logger.error(`   ❌ Failed to harvest ${positionKey}:`, error.message);
      }
    }

    if (harvestedCount > 0) {
      this.logger.log(`🎉 Harvest complete: ${harvestedCount} positions, ${totalRewards} total rewards`);
    } else {
      this.logger.log('💤 No rewards to harvest this cycle');
    }
  }

  /**
   * Harvest a specific position
   */
  async harvestPosition(conditionId: `0x${string}`, outcome: number): Promise<{ success: boolean; amount: bigint }> {
    try {
      // Check pending rewards first
      const tokenId = await this.publicClient.readContract({
        address: this.MOCK_CTF_ADDRESS,
        abi: [
          {
            inputs: [
              { name: 'conditionId', type: 'bytes32' },
              { name: 'index', type: 'uint256' },
            ],
            name: 'getTokenId',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'pure',
            type: 'function',
          },
        ],
        functionName: 'getTokenId',
        args: [conditionId, BigInt(outcome)],
      });

      const pending = await this.publicClient.readContract({
        address: this.PONY_PROTOCOL_ADDRESS,
        abi: [
          {
            inputs: [{ name: 'tokenId', type: 'uint256' }],
            name: 'pendingBribes',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function',
          },
        ],
        functionName: 'pendingBribes',
        args: [tokenId],
      });

      if (pending === 0n) {
        return { success: false, amount: 0n };
      }

      // Execute harvest
      const { request } = await this.publicClient.simulateContract({
        account: this.account,
        address: this.PONY_PROTOCOL_ADDRESS,
        abi: [
          {
            inputs: [
              { name: 'conditionId', type: 'bytes32' },
              { name: 'outcome', type: 'uint8' },
            ],
            name: 'harvestBribes',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ],
        functionName: 'harvestBribes',
        args: [conditionId, outcome],
      });

      const hash = await this.walletClient.writeContract(request);
      await this.publicClient.waitForTransactionReceipt({ hash });

      return { success: true, amount: pending as bigint };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Manual trigger for harvesting (can be called via API)
   */
  async manualHarvest(conditionId: string, outcome: number) {
    this.logger.log(`🔧 Manual harvest requested: ${conditionId} outcome ${outcome}`);
    return await this.harvestPosition(conditionId as `0x${string}`, outcome);
  }
}

import { RingMixerService } from '@/services/ring-mixer';
import { RingSignatureGenerator } from '@/utils/ring-signature';
import { ethers } from 'ethers';
import type { MixPool, MixRequest } from '@/types/ringvrm';

describe('RingMixerService', () => {
  let mixerService: RingMixerService;
  let ringGenerator: RingSignatureGenerator;
  let testWallet: ethers.Wallet;

  beforeEach(() => {
    mixerService = new RingMixerService({
      minRingSize: 3,
      maxRingSize: 10,
      defaultMixDepth: 2,
      minDelay: 5,
      maxDelay: 20
    });
    ringGenerator = new RingSignatureGenerator();
    testWallet = ethers.Wallet.createRandom();
  });

  describe('createMixPool', () => {
    it('should create a new mix pool', async () => {
      const asset = 'ETH';
      const minAmount = '0.1';
      const maxAmount = '10';
      const mixDepth = 2;

      const pool = await mixerService.createMixPool(asset, minAmount, maxAmount, mixDepth);

      expect(pool).toBeDefined();
      expect(pool.asset).toBe(asset);
      expect(pool.minMixAmount).toBe(minAmount);
      expect(pool.maxMixAmount).toBe(maxAmount);
      expect(pool.mixDepth).toBe(mixDepth);
      expect(pool.status).toBe('pending');
      expect(pool.anonymitySet.length).toBeGreaterThan(0);
    });

    it('should create pool with default mix depth', async () => {
      const pool = await mixerService.createMixPool('ETH', '0.1', '10');

      expect(pool.mixDepth).toBe(2); // Default from config
    });

    it('should generate unique pool IDs', async () => {
      const pool1 = await mixerService.createMixPool('ETH', '0.1', '10');
      const pool2 = await mixerService.createMixPool('ETH', '0.1', '10');

      expect(pool1.id).not.toBe(pool2.id);
    });
  });

  describe('joinMixPool', () => {
    let testPool: MixPool;
    let testSignature: any;

    beforeEach(async () => {
      testPool = await mixerService.createMixPool('ETH', '0.1', '10', 2);

      // Generate a test ring signature
      const ringMembers = [
        { address: testWallet.address, publicKey: testWallet.publicKey },
        { address: '0x1234...', publicKey: '0x5678...' }
      ];

      testSignature = await ringGenerator.generateRingSignature(
        'test-message',
        testWallet.privateKey,
        ringMembers,
        0
      );
    });

    it('should successfully join a mix pool', async () => {
      const mixRequest: MixRequest = {
        poolId: testPool.id,
        inputAddress: testWallet.address,
        outputAddresses: ['0xaaaa...', '0xbbbb...'],
        amount: '1.0',
        mixDepth: 2,
        delayRange: { min: 5, max: 15 },
        ringSignature: testSignature
      };

      const transaction = await mixerService.joinMixPool(testPool.id, mixRequest);

      expect(transaction).toBeDefined();
      expect(transaction.poolId).toBe(testPool.id);
      expect(transaction.inputs[0].address).toBe(testWallet.address);
      expect(transaction.inputs[0].amount).toBe('1.0');
      expect(transaction.outputs).toHaveLength(2);
      expect(transaction.status).toBe('pending');
    });

    it('should reject joining non-existent pool', async () => {
      const mixRequest: MixRequest = {
        poolId: 'non-existent-pool',
        inputAddress: testWallet.address,
        outputAddresses: ['0xaaaa...'],
        amount: '1.0',
        mixDepth: 2,
        delayRange: { min: 5, max: 15 },
        ringSignature: testSignature
      };

      await expect(
        mixerService.joinMixPool('non-existent-pool', mixRequest)
      ).rejects.toThrow('Mix pool not found');
    });

    it('should reject amounts outside pool limits', async () => {
      const mixRequest: MixRequest = {
        poolId: testPool.id,
        inputAddress: testWallet.address,
        outputAddresses: ['0xaaaa...'],
        amount: '100.0', // Above max of 10
        mixDepth: 2,
        delayRange: { min: 5, max: 15 },
        ringSignature: testSignature
      };

      await expect(
        mixerService.joinMixPool(testPool.id, mixRequest)
      ).rejects.toThrow('Amount outside pool limits');
    });
  });

  describe('executeMix', () => {
    let testPool: MixPool;

    beforeEach(async () => {
      testPool = await mixerService.createMixPool('ETH', '0.1', '10', 2);
    });

    it('should execute mixing for a pool', async () => {
      // First add some transactions to the pool
      for (let i = 0; i < 3; i++) {
        const wallet = ethers.Wallet.createRandom();
        const ringMembers = [
          { address: wallet.address, publicKey: wallet.publicKey },
          { address: '0x1234...', publicKey: '0x5678...' }
        ];

        const signature = await ringGenerator.generateRingSignature(
          `test-message-${i}`,
          wallet.privateKey,
          ringMembers,
          0
        );

        const mixRequest: MixRequest = {
          poolId: testPool.id,
          inputAddress: wallet.address,
          outputAddresses: [`0xaaaa${i}...`, `0xbbbb${i}...`],
          amount: (1 + i * 0.1).toString(),
          mixDepth: 2,
          delayRange: { min: 5, max: 15 },
          ringSignature: signature
        };

        await mixerService.joinMixPool(testPool.id, mixRequest);
      }

      await mixerService.executeMix(testPool.id);

      // Check that pool status changed
      const stats = await mixerService.getPoolStats(testPool.id);
      expect(stats.pool.status).toBe('mixing');
    });
  });

  describe('getPoolStats', () => {
    it('should return correct pool statistics', async () => {
      const pool = await mixerService.createMixPool('ETH', '0.1', '10', 2);

      const stats = await mixerService.getPoolStats(pool.id);

      expect(stats.pool).toBeDefined();
      expect(stats.pool.id).toBe(pool.id);
      expect(stats.transactionCount).toBe(0);
      expect(stats.totalVolume).toBe('0');
      expect(stats.averageMixTime).toBe(0);
    });

    it('should calculate stats with transactions', async () => {
      const pool = await mixerService.createMixPool('ETH', '0.1', '10', 2);

      // Add a transaction
      const signature = await ringGenerator.generateRingSignature(
        'test',
        testWallet.privateKey,
        [{ address: testWallet.address, publicKey: testWallet.publicKey }],
        0
      );

      const mixRequest: MixRequest = {
        poolId: pool.id,
        inputAddress: testWallet.address,
        outputAddresses: ['0xaaaa...'],
        amount: '1.5',
        mixDepth: 2,
        delayRange: { min: 5, max: 15 },
        ringSignature: signature
      };

      await mixerService.joinMixPool(pool.id, mixRequest);

      const stats = await mixerService.getPoolStats(pool.id);
      expect(stats.transactionCount).toBe(1);
      expect(parseFloat(stats.totalVolume)).toBe(1.5);
    });
  });

  describe('getRingVRMStats', () => {
    it('should return system-wide statistics', async () => {
      // Create multiple pools
      await mixerService.createMixPool('ETH', '0.1', '10', 2);
      await mixerService.createMixPool('BTC', '0.001', '0.1', 3);

      const stats = await mixerService.getRingVRMStats();

      expect(stats).toBeDefined();
      expect(stats.totalMixed).toBe('0');
      expect(stats.totalVolume).toBe('0');
      expect(stats.averageMixTime).toBe(0);
      expect(stats.currentAnonymitySet).toBeGreaterThan(0);
      expect(stats.activePools).toBe(2);
      expect(stats.mixSuccessRate).toBe(0);
    });
  });

  describe('findEligiblePools', () => {
    beforeEach(async () => {
      // Create pools with different parameters
      await mixerService.createMixPool('ETH', '0.1', '1', 2);
      await mixerService.createMixPool('ETH', '1', '10', 3);
      await mixerService.createMixPool('BTC', '0.001', '0.01', 2);
    });

    it('should find eligible pools for asset and amount', async () => {
      const pools = await mixerService.findEligiblePools('ETH', '0.5');

      expect(pools).toHaveLength(2);
      pools.forEach(pool => {
        expect(pool.asset).toBe('ETH');
        expect(parseFloat(pool.minMixAmount)).toBeLessThanOrEqual(0.5);
        expect(parseFloat(pool.maxMixAmount)).toBeGreaterThanOrEqual(0.5);
      });
    });

    it('should return empty for no matching pools', async () => {
      const pools = await mixerService.findEligiblePools('ETH', '100');

      expect(pools).toHaveLength(0);
    });
  });

  describe('cleanupExpiredPools', () => {
    it('should remove expired pools', async () => {
      // Create a pool with short expiration
      const mixer = new RingMixerService();
      const pool = await mixer.createMixPool('ETH', '0.1', '10', 2);

      // Manually set expiration to past
      (pool as any).expiresAt = Date.now() - 1000;

      await mixer.cleanupExpiredPools();

      // Pool should be removed
      await expect(
        mixer.getPoolStats(pool.id)
      ).rejects.toThrow('Pool not found');
    });
  });

  describe('edge cases', () => {
    it('should handle maximum mix depth', async () => {
      const pool = await mixerService.createMixPool('ETH', '0.1', '10', 5);

      expect(pool.mixDepth).toBe(5);
      expect(pool.anonymitySet.length).toBeGreaterThan(0);
    });

    it('should handle zero transactions', async () => {
      const pool = await mixerService.createMixPool('ETH', '0.1', '10', 2);
      await mixerService.executeMix(pool.id);

      const stats = await mixerService.getPoolStats(pool.id);
      expect(stats.transactionCount).toBe(0);
    });
  });
});
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRingVRM } from '@/hooks/useRingVRM';
import { ringVRMAPI } from '@/services/api-ringvrm';

// Mock the API
jest.mock('@/services/api-ringvrm');
const mockRingVRMAPI = ringVRMAPI as jest.Mocked<typeof ringVRMAPI>;

describe('useRingVRM', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup default mocks
    mockRingVRMAPI.getAvailablePools.mockResolvedValue([
      {
        id: 'pool-1',
        asset: 'ETH',
        mixDepth: 3,
        minMixAmount: '0.1',
        maxMixAmount: '10',
        feePercentage: 0.1,
        anonymitySet: [],
        status: 'active' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      }
    ]);

    mockRingVRMAPI.getRingVRMStats.mockResolvedValue({
      totalMixed: '100.5',
      totalVolume: '150.75',
      averageMixTime: 30000,
      currentAnonymitySet: 25,
      activePools: 3,
      mixSuccessRate: 95.5
    });

    mockRingVRMAPI.cleanup.mockResolvedValue();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRingVRM());

      expect(result.current.pools).toEqual([]);
      expect(result.current.activePool).toBeNull();
      expect(result.current.transactions).toEqual([]);
      expect(result.current.stats).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isMixing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should load pools and stats on mount when enabled', async () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      await waitFor(() => {
        expect(mockRingVRMAPI.getAvailablePools).toHaveBeenCalled();
        expect(mockRingVRMAPI.getRingVRMStats).toHaveBeenCalled();
      });

      expect(result.current.pools).toHaveLength(1);
      expect(result.current.stats).toBeTruthy();
      expect(result.current.activePool).toBeTruthy();
    });

    it('should not load pools when disabled', () => {
      renderHook(() => useRingVRM({
        enableMixing: false
      }));

      expect(mockRingVRMAPI.getAvailablePools).not.toHaveBeenCalled();
      expect(mockRingVRMAPI.getRingVRMStats).not.toHaveBeenCalled();
    });
  });

  describe('loadPools', () => {
    it('should load pools successfully', async () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      await act(async () => {
        await result.current.loadPools();
      });

      expect(result.current.pools).toHaveLength(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle load pools error', async () => {
      mockRingVRMAPI.getAvailablePools.mockRejectedValue(
        new Error('Failed to load pools')
      );

      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      await act(async () => {
        await result.current.loadPools();
      });

      expect(result.current.error).toBe('Failed to load pools');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('createPool', () => {
    it('should create a new pool', async () => {
      const mockPool = {
        id: 'new-pool',
        asset: 'BTC',
        mixDepth: 2,
        minMixAmount: '0.001',
        maxMixAmount: '0.1',
        feePercentage: 0.1,
        anonymitySet: [],
        status: 'pending' as const,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000
      };

      mockRingVRMAPI.createMixPool.mockResolvedValue(mockPool);

      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      let createdPool: any = null;

      await act(async () => {
        createdPool = await result.current.createPool('BTC', '0.001', '0.1', 2);
      });

      expect(mockRingVRMAPI.createMixPool).toHaveBeenCalledWith(
        'BTC',
        '0.001',
        '0.1',
        2
      );
      expect(createdPool).toEqual(mockPool);
      expect(result.current.pools).toContainEqual(mockPool);
    });

    it('should not create pool when disabled', async () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: false
      }));

      const createdPool = await act(async () => {
        return await result.current.createPool('ETH', '0.1', '10');
      });

      expect(createdPool).toBeNull();
      expect(mockRingVRMAPI.createMixPool).not.toHaveBeenCalled();
    });
  });

  describe('submitMix', () => {
    it('should submit mix successfully', async () => {
      const mockTransaction = {
        id: 'tx-1',
        poolId: 'pool-1',
        inputs: [{
          address: '0x123...',
          amount: '1.0',
          ringSignature: {}
        }],
        outputs: [{
          address: '0x456...',
          amount: '0.99'
        }],
        mixProof: '0xabc...',
        timestamp: Date.now(),
        status: 'pending' as const
      };

      mockRingVRMAPI.submitMix.mockResolvedValue(mockTransaction);

      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      // First set an active pool
      await act(async () => {
        await result.current.loadPools();
      });

      let submittedTx: any = null;

      await act(async () => {
        submittedTx = await result.current.submitMix(
          '0x123...',
          ['0x456...'],
          '1.0',
          'private-key'
        );
      });

      expect(submittedTx).toEqual(mockTransaction);
      expect(result.current.transactions).toContainEqual(mockTransaction);
      expect(result.current.isMixing).toBe(false);
    });

    it('should handle submit mix error', async () => {
      mockRingVRMAPI.submitMix.mockRejectedValue(
        new Error('Invalid ring signature')
      );

      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      await act(async () => {
        await result.current.loadPools();
      });

      const submittedTx = await act(async () => {
        return await result.current.submitMix(
          '0x123...',
          ['0x456...'],
          '1.0',
          'invalid-key'
        );
      });

      expect(submittedTx).toBeNull();
      expect(result.current.error).toBe('Failed to submit mix');
      expect(result.current.isMixing).toBe(false);
    });
  });

  describe('submitOrderWithRingVRM', () => {
    it('should submit order with Ring VRM enabled', async () => {
      const mockResult = {
        orderId: 'order-1',
        mixTxId: 'tx-1'
      };

      mockRingVRMAPI.submitOrderWithRingVRM.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      const orderResult = await act(async () => {
        return await result.current.submitOrderWithRingVRM({
          symbol: 'ETH-USD',
          side: 'buy',
          amount: '1.0',
          privateKey: 'private-key'
        });
      });

      expect(mockRingVRMAPI.submitOrderWithRingVRM).toHaveBeenCalledWith({
        symbol: 'ETH-USD',
        side: 'buy',
        amount: '1.0',
        priceRange: undefined,
        useMixing: true,
        mixDepth: 3,
        privateKey: 'private-key'
      });
      expect(orderResult).toEqual(mockResult);
    });

    it('should submit order without Ring VRM when disabled', async () => {
      const mockResult = {
        orderId: 'order-2'
      };

      mockRingVRMAPI.submitOrderWithRingVRM.mockResolvedValue(mockResult);

      const { result } = renderHook(() => useRingVRM({
        enableMixing: false,
        autoRefresh: false
      }));

      const orderResult = await act(async () => {
        return await result.current.submitOrderWithRingVRM({
          symbol: 'ETH-USD',
          side: 'sell',
          amount: '2.0'
        });
      });

      expect(mockRingVRMAPI.submitOrderWithRingVRM).toHaveBeenCalledWith({
        symbol: 'ETH-USD',
        side: 'sell',
        amount: '2.0',
        priceRange: undefined,
        useMixing: false,
        mixDepth: 3,
        privateKey: undefined
      });
      expect(orderResult).toEqual(mockResult);
    });
  });

  describe('privacyScore', () => {
    it('should calculate privacy score correctly', async () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      await act(async () => {
        await result.current.loadStats();
      });

      // With mocked stats (25 anonymity set, 3 pools, 95.5% success rate)
      // Expected score: 20 (anonymity) + 30 (success rate) + 30 (pools) = 80
      expect(result.current.privacyScore).toBe(80);
    });

    it('should return 0 when disabled', () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: false
      }));

      expect(result.current.privacyScore).toBe(0);
    });
  });

  describe('auto-refresh', () => {
    jest.useFakeTimers();

    it('should auto-refresh pools and stats', async () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: true,
        refreshInterval: 1000
      }));

      // Initial load
      await waitFor(() => {
        expect(mockRingVRMAPI.getAvailablePools).toHaveBeenCalledTimes(1);
        expect(mockRingVRMAPI.getRingVRMStats).toHaveBeenCalledTimes(1);
      });

      // Clear for next check
      mockRingVRMAPI.getAvailablePools.mockClear();
      mockRingVRMAPI.getRingVRMStats.mockClear();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockRingVRMAPI.getAvailablePools).toHaveBeenCalledTimes(1);
        expect(mockRingVRMAPI.getRingVRMStats).toHaveBeenCalledTimes(1);
      });
    });

    afterAll(() => {
      jest.useRealTimers();
    });
  });

  describe('computed properties', () => {
    it('should compute hasActivePool correctly', async () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      expect(result.current.hasActivePool).toBe(false);

      await act(async () => {
        await result.current.loadPools();
      });

      expect(result.current.hasActivePool).toBe(true);
    });

    it('should compute canMix correctly', async () => {
      const { result } = renderHook(() => useRingVRM({
        enableMixing: true,
        autoRefresh: false
      }));

      expect(result.current.canMix).toBe(false);

      await act(async () => {
        await result.current.loadPools();
      });

      expect(result.current.canMix).toBe(true);
    });
  });
});
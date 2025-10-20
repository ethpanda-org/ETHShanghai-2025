import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as QRCode from 'qrcode';
// 移除 Safe SDK，改用直接合约调用
import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiUrl } from '../config/api';
import { useI18n } from './i18n';
import { deadmanSwitchAbi } from '../abi/deadmanSwitch';
import { useSiweAuth } from './auth/SiweAuthProvider';
import { detectInjectedWallets, DetectedWallet } from './wallets';
import { SAFE_ADDRESSES, SAFE_PROXY_FACTORY_ABI, SAFE_ABI } from '../abi/safeContracts';
import { VAULT_ABI, VAULT_CONFIGS, type VaultProtocol } from '../abi/vaults';
import DefiStrategyCardSimple from './components/DefiStrategyCardSimple';

type InviteSummary = {
  token: string;
  status: string;
  createdAt: string;
  acceptedAt?: string | null;
  note?: string | null;
  beneficiaryAddress?: string | null;
};

type BeneficiarySummary = {
  address: string;
  email?: string | null;
  phone?: string | null;
  invitedBy?: string | null;
  inviteToken?: string | null;
  createdAt: string;
};

type SafeSnapshot = {
  address: string;
  ownerAddress: string;
  beneficiaryAddress: string;
  moduleAddress?: string | null;
  heartbeatInterval: number;
  challengePeriod: number;
  createdAt: string;
};

type ModuleStatus = {
  safe: string;
  Owner: string;
  beneficiary: string;
  lastCheckIn: number;
  heartbeatInterval: number;
  claimReadyAt: number;
};

type LifecycleState = 'UNCONFIGURED' | 'ALIVE' | 'EXPIRED' | 'CLAIM_PENDING' | 'CLAIM_READY' | 'INHERITED';

type LifecycleSummary = {
  state: LifecycleState;
  now: number;
  heartbeatExpiresAt?: number;
  secondsUntilHeartbeatExpires?: number;
  claimReadyAt?: number;
  secondsUntilClaimReady?: number;
  canCancelClaim: boolean;
  isOwnerStillInControl: boolean;
};

type OverviewResponse = {
  ok: boolean;
  safe: SafeSnapshot | null;
  status: ModuleStatus | null;
  lifecycle: LifecycleSummary;
  invites: {
    metrics: { total: number; pending: number; accepted: number };
    items: InviteSummary[];
  };
  beneficiaries: {
    total: number;
    items: BeneficiarySummary[];
  };
};

type RecentSafeRecord = {
  address: string;
  beneficiaryAddress?: string | null;
  moduleAddress?: string | null;
  createdAt: string;
};

type RecentSafesResponse = {
  ok: boolean;
  items: RecentSafeRecord[];
};

const LOCAL_STORAGE_KEY = 'fk.createdSafes';

function normalizeSafeAddresses(addresses: string[], max = 5): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const candidate of addresses) {
    if (typeof candidate !== 'string') continue;
    try {
      const checksum = ethers.utils.getAddress(candidate);
      const key = checksum.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(checksum);
      if (normalized.length >= max) break;
    } catch {
      // ignore invalid addresses
    }
  }
  return normalized;
}

function readStoredSafes(owner?: string): string[] {
  if (typeof window === 'undefined' || !owner) return [];
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!raw) return [];
  const ownerKey = owner.toLowerCase();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const normalized = normalizeSafeAddresses(parsed);
      const store: Record<string, string[]> = { [ownerKey]: normalized };
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
      return normalized;
    }
    if (parsed && typeof parsed === 'object') {
      const bucket = (parsed as Record<string, unknown>)[ownerKey];
      if (Array.isArray(bucket)) {
        return normalizeSafeAddresses(bucket as string[]);
      }
    }
  } catch {
    // ignore malformed storage
  }
  return [];
}

function writeStoredSafes(owner: string, safes: string[]) {
  if (typeof window === 'undefined') return;
  const ownerKey = owner.toLowerCase();
  const normalized = normalizeSafeAddresses(safes);
  let store: Record<string, string[]> = {};
  const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
          if (!Array.isArray(value)) continue;
          store[key] = normalizeSafeAddresses(value as string[]);
        }
      }
    } catch {
      // ignore malformed storage
    }
  }
  store[ownerKey] = normalized;
  window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(store));
}

function mergeSafeLists(primary: string[], secondary: string[], max = 5): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  const sources = [primary, secondary];
  for (const source of sources) {
    for (const candidate of source) {
      try {
        const checksum = ethers.utils.getAddress(candidate);
        const key = checksum.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(checksum);
        if (merged.length >= max) {
          return merged;
        }
      } catch {
        // ignore invalid address
      }
    }
  }
  return merged;
}

function shortenAddress(addr?: string | null) {
  if (!addr) return '';
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function secondsToDuration(sec: number | undefined) {
  if (!sec || sec <= 0 || !Number.isFinite(sec)) return '0s';
  const parts: string[] = [];
  const units = [
    { size: 86400, label: 'd' },
    { size: 3600, label: 'h' },
    { size: 60, label: 'm' },
    { size: 1, label: 's' },
  ];
  let remaining = sec;
  for (const unit of units) {
    if (remaining >= unit.size) {
      const count = Math.floor(remaining / unit.size);
      parts.push(`${count}${unit.label}`);
      remaining -= count * unit.size;
    }
  }
  return parts.length ? parts.join(' ') : '0s';
}

function formatDateFromSeconds(sec?: number) {
  if (!sec || sec <= 0) return '—';
  return new Date(sec * 1000).toLocaleString();
}

function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

const stateTone: Record<LifecycleState, string> = {
  UNCONFIGURED: '#6b7280',
  ALIVE: '#059669',
  EXPIRED: '#b45309',
  CLAIM_PENDING: '#d97706',
  CLAIM_READY: '#dc2626',
  INHERITED: 'var(--fk-gold)',
};

export default function Owner() {
  const { t, lang } = useI18n();
  const { address, isConnected } = useAccount();
  const { connectAsync, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const {
    session: authSession,
    isAuthenticated,
    isAuthenticating,
    authenticate,
    signOut: signOutSiwe,
    authorizedFetch,
    lastError: authError,
    clearError: clearAuthError,
  } = useSiweAuth();
  const queryClient = useQueryClient();
  const [safeOverride, setSafeOverride] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState('');
  const beneficiarySelectRef = useRef<HTMLSelectElement | null>(null);
  const [beneficiaryDropdownOpen, setBeneficiaryDropdownOpen] = useState(false);
  const [heartbeatSeconds, setHeartbeatSeconds] = useState(604800); // 默认7天 = 604800秒
  const [challengeSeconds, setChallengeSeconds] = useState(172800); // 默认2天 = 172800秒
  const [lastInviteLink, setLastInviteLink] = useState('');
  const [inviteImage, setInviteImage] = useState('');
  const [isGeneratingInviteImage, setIsGeneratingInviteImage] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [recentSafes, setRecentSafes] = useState<string[]>([]);
  const [log, setLog] = useState('');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [availableWallets, setAvailableWallets] = useState<DetectedWallet[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [showDefiStrategiesModal, setShowDefiStrategiesModal] = useState(false);
  const nowMs = useNow();
  const ownerAddress = authSession?.address ?? address ?? undefined;
  const ownerCacheKey = ownerAddress?.toLowerCase() ?? 'unknown';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const list = detectInjectedWallets();
    setAvailableWallets(list);
    if (list.length > 0 && !selectedWalletId) {
      setSelectedWalletId(list[0].id);
    }
  }, []);

  useEffect(() => {
    if (!ownerAddress) {
      setRecentSafes([]);
      return;
    }
    const stored = readStoredSafes(ownerAddress);
    setRecentSafes(stored);
  }, [ownerAddress]);

  const recentSafesQuery = useQuery<RecentSafesResponse>({
    queryKey: ['recent-safes', ownerCacheKey],
    enabled: isAuthenticated && !!ownerAddress,
    queryFn: async () => {
      if (!ownerAddress) {
        return { ok: true, items: [] };
      }
      const params = new URLSearchParams({ owner: ownerAddress });
      const res = await authorizedFetch(apiUrl(`/api/safes/recent/by-owner?${params.toString()}`));
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Unable to load recent safes.');
      }
      return data as RecentSafesResponse;
    },
    staleTime: 15000,
  });

  useEffect(() => {
    if (!ownerAddress) return;
    const backendItems = recentSafesQuery.data?.items ?? [];
    if (!backendItems.length) return;
    const backendAddresses = normalizeSafeAddresses(backendItems.map((item) => item.address));
    if (!backendAddresses.length) return;
    setRecentSafes((prev) => {
      const merged = mergeSafeLists(backendAddresses, prev);
      const changed = merged.length !== prev.length || merged.some((value, idx) => value !== prev[idx]);
      if (!changed) {
        return prev;
      }
      writeStoredSafes(ownerAddress, merged);
      return merged;
    });
  }, [ownerAddress, recentSafesQuery.data]);

  const rememberSafe = useCallback(
    (safeAddress: string, ownerAddress?: string | null) => {
      if (!ownerAddress) return;
      let checksum: string;
      try {
        checksum = ethers.utils.getAddress(safeAddress);
      } catch {
        return;
      }
      setRecentSafes((prev) => {
        const merged = mergeSafeLists([checksum], prev);
        const changed = merged.length !== prev.length || merged.some((value, idx) => value !== prev[idx]);
        if (!changed) {
          return prev;
        }
        writeStoredSafes(ownerAddress, merged);
        return merged;
      });
    },
    []
  );


  const overviewQuery = useQuery<OverviewResponse>({
    queryKey: ['owner-overview', ownerCacheKey, safeOverride || 'auto'],
    enabled: isAuthenticated && !!ownerAddress,
    refetchInterval: 15000,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (ownerAddress) params.set('owner', ownerAddress);
      if (safeOverride) params.set('safe', safeOverride);
      const res = await authorizedFetch(apiUrl(`/api/safes/overview/by-owner?${params.toString()}`));
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Unable to load overview.');
      }
      return data as OverviewResponse;
    },
  });

  const overview = overviewQuery.data;
  const lifecycle = overview?.lifecycle;
  const safeSnapshot = overview?.safe;
  const moduleAddress = safeSnapshot?.moduleAddress || undefined;
  const status = overview?.status;
  const beneficiaries = overview?.beneficiaries.items ?? [];
  const invites = overview?.invites.items ?? [];

  // --- Fund balance & assets ---
  const [depositAmount, setDepositAmount] = useState('0.01');
  const [isDepositing, setIsDepositing] = useState(false);

  // --- DeFi Vaults ---
  const [vaultBalances, setVaultBalances] = useState<Record<VaultProtocol, { balance: number; rewards: number }>>({
    lido: { balance: 0, rewards: 0 },
    aave: { balance: 0, rewards: 0 },
    morpho: { balance: 0, rewards: 0 },
  });
  const [vaultTVLs, setVaultTVLs] = useState<Record<VaultProtocol, number>>({
    lido: 0,
    aave: 0,
    morpho: 0,
  });
  const [selectedProtocol, setSelectedProtocol] = useState<VaultProtocol>('lido');
  const [strategyDropdownOpen, setStrategyDropdownOpen] = useState(false);
  const strategyDropdownPanelRef = useRef<HTMLDivElement | null>(null);
  const [defiDepositOpenToken, setDefiDepositOpenToken] = useState(0);

  const safeAddressReady = safeSnapshot?.address;

  const safeBalanceQuery = useQuery<number>({
    queryKey: ['safe-balance', safeAddressReady],
    enabled: !!safeAddressReady,
    refetchInterval: 15000,
    queryFn: async () => {
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http((import.meta as any).env?.VITE_RPC_URL || 'https://sepolia.base.org'),
      });
      const bal = await client.getBalance({ address: safeAddressReady as `0x${string}` });
      return Number(ethers.utils.formatEther(bal));
    },
  });

  const ethUsdQuery = useQuery<number>({
    queryKey: ['price-eth-usd'],
    enabled: !!safeAddressReady,
    staleTime: 60000,
    queryFn: async () => {
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
        const json = await res.json();
        return Number(json?.ethereum?.usd ?? 0);
      } catch {
        return 0;
      }
    },
  });

  const fundEth = safeBalanceQuery.data ?? 0;

  // 计算总的 DeFi 余额（ETH）
  const totalDefiEth = useMemo(() => {
    return Object.values(vaultBalances).reduce((sum, vault) => sum + vault.balance + vault.rewards, 0);
  }, [vaultBalances]);

  // 总余额 = Safe 中的 ETH + DeFi 中的 ETH
  const totalEth = fundEth + totalDefiEth;
  const fundUsd = fundEth * (ethUsdQuery.data ?? 0);
  const defiUsd = totalDefiEth * (ethUsdQuery.data ?? 0);
  const totalUsd = totalEth * (ethUsdQuery.data ?? 0);

  // Query Vault balances
  useEffect(() => {
    if (!safeAddressReady) return;

    const fetchVaultBalances = async () => {
      try {
        const client = createPublicClient({
          chain: baseSepolia,
          transport: http((import.meta as any).env?.VITE_RPC_URL || 'https://sepolia.base.org'),
        });

        const protocols: VaultProtocol[] = ['lido', 'aave', 'morpho'];
        const balances: Record<VaultProtocol, { balance: number; rewards: number }> = {
          lido: { balance: 0, rewards: 0 },
          aave: { balance: 0, rewards: 0 },
          morpho: { balance: 0, rewards: 0 },
        };
        const tvls: Record<VaultProtocol, number> = { lido: 0, aave: 0, morpho: 0 };

        for (const protocol of protocols) {
          const config = VAULT_CONFIGS[protocol];
          try {
            // Read user deposits
            const depositResult = await client.readContract({
              address: config.address,
              abi: VAULT_ABI,
              functionName: 'deposits',
              args: [safeAddressReady as `0x${string}`],
            });

            // Read user rewards
            const rewardsResult = await client.readContract({
              address: config.address,
              abi: VAULT_ABI,
              functionName: 'calculateRewards',
              args: [safeAddressReady as `0x${string}`],
            });

            // Read TVL
            const tvlResult = await client.readContract({
              address: config.address,
              abi: VAULT_ABI,
              functionName: 'getTVL',
              args: [],
            });

            balances[protocol] = {
              balance: Number(ethers.utils.formatEther(depositResult || 0)),
              rewards: Number(ethers.utils.formatEther(rewardsResult || 0)),
            };
            tvls[protocol] = Number(ethers.utils.formatEther(tvlResult || 0));
          } catch (err) {
            console.warn(`Failed to fetch ${protocol} vault data:`, err);
          }
        }

        setVaultBalances(balances);
        setVaultTVLs(tvls);
      } catch (error) {
        console.error('Error fetching vault balances:', error);
      }
    };

    fetchVaultBalances();
    const interval = setInterval(fetchVaultBalances, 15000); // Refresh every 15s
    return () => clearInterval(interval);
  }, [safeAddressReady]);

  const assets = useMemo(() => {
    const list = [{ symbol: 'ETH', amount: fundEth, icon: '/eth.svg' }];
    return list.filter((a) => a.amount > 0 || list.length === 1);
  }, [fundEth]);

  const depositToFund = useCallback(async () => {
    if (!safeSnapshot?.address) return;
    let pollInterval: NodeJS.Timeout | null = null;

    try {
      setIsDepositing(true);
      const bundle = await ensureWallet();
      const from = await bundle.signer.getAddress();
      const valueBigNumber = ethers.utils.parseEther(depositAmount || '0');
      const valueHex = valueBigNumber.toHexString();

      // 估算 gas（ETH 转账通常需要 21000 gas）
      let gasLimit;
      try {
        const estimated = await bundle.provider.estimateGas({
          from,
          to: safeSnapshot.address,
          value: valueBigNumber,
        });
        gasLimit = estimated.mul(120).div(100); // 添加 20% 缓冲
        console.log('[depositToFund] 估算的 gas:', estimated.toString(), '带缓冲:', gasLimit.toString());

        const gasPrice = await bundle.provider.getGasPrice();
        const estimatedCostWei = gasLimit.mul(gasPrice);
        const estimatedCostEth = ethers.utils.formatEther(estimatedCostWei);
        console.log('[depositToFund] 预估费用:', estimatedCostEth, 'ETH');
      } catch (estimateError: any) {
        console.error('[depositToFund] Gas 估算失败:', estimateError);
        gasLimit = ethers.BigNumber.from('21000'); // ETH 转账的标准 gas
      }

      // 这里会弹出钱包，用户可能需要时间确认
      const txHash = await bundle.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{
          from,
          to: safeSnapshot.address,
          value: valueHex,
          gas: gasLimit.toHexString()
        }],
      });

      console.log('[depositToFund] 交易已发送:', txHash);
      window.dispatchEvent(
        new CustomEvent('fk:toast', {
          detail: { msg: lang === 'zh' ? `交易已发送，等待确认中...` : `Transaction sent, waiting for confirmation...`, timeoutMs: 3000 },
        })
      );

      // 记录存入前的余额
      const initialBalance = safeBalanceQuery.data ?? 0;
      console.log('[depositToFund] 初始余额:', initialBalance);

      // 等待交易确认：每秒刷新余额，直到余额发生变化
      const maxAttempts = 10; // 最多轮询120秒（2分钟）
      let attempts = 0;

      pollInterval = setInterval(async () => {
        attempts++;
        console.log(`[depositToFund] 轮询余额 (${attempts}/${maxAttempts})...`);

        try {
          const result = await safeBalanceQuery.refetch();
          const newBalance = result.data ?? 0;
          console.log('[depositToFund] 当前余额:', newBalance, '变化:', newBalance - initialBalance);

          // 如果余额变化了（考虑精度），停止轮询
          if (Math.abs(newBalance - initialBalance) > 0.0001) {
            if (pollInterval) clearInterval(pollInterval);
            setIsDepositing(false);
            console.log('[depositToFund] ✓ 余额已更新');
            window.dispatchEvent(
              new CustomEvent('fk:toast', {
                detail: { msg: lang === 'zh' ? '✓ 存入成功，余额已更新' : '✓ Deposit successful, balance updated', timeoutMs: 3000 },
              })
            );
          }
          // 超时后停止轮询
          else if (attempts >= maxAttempts) {
            if (pollInterval) clearInterval(pollInterval);
            setIsDepositing(false);
            console.log('[depositToFund] ⚠ 轮询超时，但交易可能仍在处理中');
            window.dispatchEvent(
              new CustomEvent('fk:toast', {
                detail: { msg: lang === 'zh' ? '交易已发送，但确认时间较长，请稍后手动刷新' : 'Transaction sent but taking longer than expected, please refresh manually later', timeoutMs: 5000 },
              })
            );
          }
        } catch (refetchError) {
          console.error('[depositToFund] 刷新余额失败:', refetchError);
        }
      }, 1000); // 每秒轮询一次

    } catch (error: any) {
      console.error('[depositToFund] 错误:', error);

      // 清理轮询
      if (pollInterval) clearInterval(pollInterval);
      setIsDepositing(false);

      // 更友好的错误提示
      let errorMsg = error?.message || String(error);
      if (errorMsg.includes('User rejected') || errorMsg.includes('User denied')) {
        errorMsg = lang === 'zh' ? '用户取消了交易' : 'Transaction cancelled by user';
      }

      window.dispatchEvent(
        new CustomEvent('fk:toast', { detail: { msg: errorMsg, timeoutMs: 3000 } })
      );
    }
  }, [safeSnapshot?.address, depositAmount, lang, safeBalanceQuery]);

  const copySafeAddress = useCallback(async () => {
    if (!safeSnapshot?.address) return;
    try {
      await navigator.clipboard.writeText(safeSnapshot.address);
      window.dispatchEvent(
        new CustomEvent('fk:toast', {
          detail: { msg: lang === 'zh' ? '基金地址已复制。' : 'Fund address copied.', timeoutMs: 2600 },
        })
      );
    } catch (error: any) {
      window.dispatchEvent(
        new CustomEvent('fk:toast', { detail: { msg: error?.message || String(error), timeoutMs: 3000 } })
      );
    }
  }, [safeSnapshot?.address, lang]);

  // Deposit to DeFi Vault
  const depositToVault = useCallback(async (protocol: VaultProtocol, amount: string) => {
    if (!safeSnapshot?.address) return;
    try {
      const bundle = await ensureWallet();
      const config = VAULT_CONFIGS[protocol];
      const valueBigNumber = ethers.utils.parseEther(amount || '0');

      // Create Safe contract instance
      const safeContract = new ethers.Contract(safeSnapshot.address, SAFE_ABI, bundle.signer);

      // Encode deposit() call
      const vaultInterface = new ethers.utils.Interface(VAULT_ABI);
      const depositData = vaultInterface.encodeFunctionData('deposit', []);

      // Get owner for signature
      const owner = await bundle.signer.getAddress();
      const signature = '0x' + owner.toLowerCase().slice(2).padStart(64, '0') + '0'.repeat(64) + '01';

      // Estimate gas
      let gasLimit;
      try {
        const estimatedGas = await safeContract.estimateGas.execTransaction(
          config.address,
          valueBigNumber,
          depositData,
          0, // Call
          0, 0, 0,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          signature
        );
        gasLimit = estimatedGas.mul(120).div(100);
      } catch (estimateError: any) {
        console.error('[depositToVault] Gas estimation failed:', estimateError);
        gasLimit = ethers.BigNumber.from('500000');
      }

      // Execute transaction via Safe
      const tx = await safeContract.execTransaction(
        config.address,      // to
        valueBigNumber,      // value (ETH to send)
        depositData,         // data
        0,                   // operation (Call)
        0, 0, 0,            // gas params
        ethers.constants.AddressZero,  // gasToken
        ethers.constants.AddressZero,  // refundReceiver
        signature,
        { gasLimit }
      );

      window.dispatchEvent(
        new CustomEvent('fk:toast', {
          detail: {
            msg: lang === 'zh'
              ? `存入 ${config.name} 交易已发送：${tx.hash.slice(0, 10)}...`
              : `Deposit to ${config.name} sent: ${tx.hash.slice(0, 10)}...`,
            timeoutMs: 3000
          },
        })
      );

      await tx.wait();

      window.dispatchEvent(
        new CustomEvent('fk:toast', {
          detail: {
            msg: lang === 'zh' ? `✓ 存入成功！` : `✓ Deposit successful!`,
            timeoutMs: 2600
          },
        })
      );

      // Refresh balances
      await safeBalanceQuery.refetch();
    } catch (error: any) {
      console.error('[depositToVault] Error:', error);
      window.dispatchEvent(
        new CustomEvent('fk:toast', {
          detail: { msg: error?.message || String(error), timeoutMs: 4000 }
        })
      );
      throw error;
    }
  }, [safeSnapshot?.address, lang, safeBalanceQuery]);

  useEffect(() => {
    if (!selectedBeneficiary && beneficiaries.length > 0) {
      setSelectedBeneficiary(beneficiaries[0].address);
    }
  }, [beneficiaries, selectedBeneficiary]);

  useEffect(() => {
    if (authError) {
      setLog(authError);
    }
  }, [authError]);

  const handleSignIn = useCallback(async () => {
    const connector = connectors.find((c) => c.id === 'injected') ?? connectors[0];
    if (!connector) {
      setLog(lang === 'zh' ? '没有可用的钱包连接器。' : 'No available wallet connector.');
      return;
    }
    if (availableWallets.length === 0) {
      setLog(lang === 'zh' ? '未检测到浏览器钱包插件，请安装钱包扩展（如 MetaMask）。' : 'No browser wallet detected. Please install a wallet extension.');
      return;
    }
    const chosen = availableWallets.find((w) => w.id === selectedWalletId) ?? availableWallets[0];
    try {
      (window as any).ethereum = chosen.provider;
    } catch {}
    clearAuthError();
    setLog('');
    let connectedInFlow = false;
    let connectedAddress: string | undefined = address;
    try {
      console.log('[handleSignIn] 开始连接流程，当前状态：', { isConnected, address });

      if (!isConnected) {
        console.log('[handleSignIn] 正在连接钱包...');
        setLog(lang === 'zh' ? '正在连接钱包...' : 'Connecting wallet...');
        // Connect wallet and get the address directly from the result
        const result = await connectAsync({ connector });
        connectedAddress = result.accounts[0];
        connectedInFlow = true;
        console.log('[handleSignIn] 钱包连接成功：', connectedAddress);
        if (!connectedAddress) {
          throw new Error(lang === 'zh' ? '无法获取钱包地址。' : 'Unable to get wallet address.');
        }
      }
      // Ensure the wallet is on the expected chain (Base Sepolia)
      await ensureWallet();

      console.log('[handleSignIn] 开始 SIWE 认证，地址：', connectedAddress);
      setLog(lang === 'zh' ? '正在请求签名...' : 'Requesting signature...');
      // Pass the address directly to authenticate to avoid state sync issues
      await authenticate({ force: true, address: connectedAddress });
      console.log('[handleSignIn] SIWE 认证成功');
      setLog(lang === 'zh' ? '钱包已连接并完成登录。' : 'Wallet connected and signed in.');
    } catch (error: any) {
      console.error('[handleSignIn] 错误：', error);
      const message = error?.message || String(error);
      setLog(message);
      if (connectedInFlow) {
        disconnect();
      }
    }
  }, [connectors, clearAuthError, isConnected, address, connectAsync, authenticate, lang, disconnect, availableWallets, selectedWalletId]);

  const handleSignOut = useCallback(async () => {
    let hadError = false;
    try {
      await signOutSiwe();
    } catch (error: any) {
      hadError = true;
      setLog(error?.message || String(error));
    } finally {
      disconnect();
      if (!hadError) {
        setLog(lang === 'zh' ? '已退出登录。' : 'Signed out.');
      }
    }
  }, [signOutSiwe, disconnect, lang]);


  const handleGenerateInvite = useCallback(async () => {
    if (!ownerAddress || !isAuthenticated) {
      setLog(lang === 'zh' ? '请先完成钱包签名登录。' : 'Sign in with your wallet first.');
      return;
    }
    setIsGeneratingInvite(true);
    clearAuthError();
    setLog('');
    try {
      const res = await authorizedFetch(apiUrl('/api/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviter: ownerAddress }),
      });
      const data = await res.json();
      if (!res.ok || !data?.invite?.token) {
        throw new Error(data?.error || 'Failed to create invite.');
      }
      const base = typeof window !== 'undefined' ? window.location.origin : '';
      const link = `${base}/beneficiary?invite=${data.invite.token}`;
      setLastInviteLink(link);
      await queryClient.invalidateQueries({ queryKey: ['owner-overview', ownerCacheKey, safeOverride || 'auto'] });
      setLog(lang === 'zh' ? '邀请链接已生成。' : 'Invite link generated successfully.');
    } catch (error: any) {
      setLog(lang === 'zh' ? `生成邀请失败：${error?.message || error}` : `Failed to generate invite: ${error?.message || error}`);
    } finally {
      setIsGeneratingInvite(false);
    }
  }, [ownerAddress, isAuthenticated, lang, clearAuthError, authorizedFetch, queryClient, ownerCacheKey, safeOverride]);


  const secondsUntilDeadline = useMemo(() => {
    if (!lifecycle) return null;
    const nowSec = Math.floor(nowMs / 1000);
    if (lifecycle.state === 'ALIVE' && lifecycle.heartbeatExpiresAt) {
      return lifecycle.heartbeatExpiresAt - nowSec;
    }
    if (lifecycle.state === 'CLAIM_PENDING' && lifecycle.claimReadyAt) {
      return lifecycle.claimReadyAt - nowSec;
    }
    if (lifecycle.state === 'CLAIM_READY' && lifecycle.claimReadyAt) {
      return nowSec - lifecycle.claimReadyAt;
    }
    if (lifecycle.state === 'EXPIRED' && lifecycle.heartbeatExpiresAt) {
      return nowSec - lifecycle.heartbeatExpiresAt;
    }
    return null;
  }, [lifecycle, nowMs]);

  const stateCopy: Record<LifecycleState, string> = useMemo(
    () => ({
      UNCONFIGURED: lang === 'zh' ? '尚未配置' : 'Not Configured',
      ALIVE: lang === 'zh' ? '心跳正常' : 'Settlor Alive',
      EXPIRED: lang === 'zh' ? '心跳已停止（仍可签到重启心跳）' : 'Heartbeat Expired(Can still check in to restart)',
      CLAIM_PENDING: lang === 'zh' ? '继承中（仍可签到重启心跳）' : 'Claim In Progress(Can still check in to restart)',
      CLAIM_READY: lang === 'zh' ? '继承中（仍可签到重启心跳）' : 'Ready For Inheritance',
      INHERITED: lang === 'zh' ? '已完成继承（所有权已转移）' : 'Inheritance Complete',
    }),
    [lang]
  );

  const generateInvitePoster = useCallback(
    async (link: string) => {
      if (typeof window === 'undefined') return;
      setIsGeneratingInviteImage(true);
      try {
        const qrDataUrl = await QRCode.toDataURL(link, { width: 420, margin: 1 });
        const canvas = document.createElement('canvas');
        const W = 760;
        const H = 1020;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas not supported in this browser.');
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#3c4858';
        ctx.fillRect(0, 0, W, 180);

        // draw logo to the left of the title using inline SVG
        const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 400 450">
          <defs>
            <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style="stop-color:#DAB974" />
              <stop offset="100%" style="stop-color:#B88B4A" />
            </linearGradient>
          </defs>
          <rect x="90" y="90" width="220" height="220" rx="5" ry="5" fill="url(#gold-gradient)"/>
          <rect x="100" y="100" width="200" height="200" rx="5" ry="5" fill="#3c4858"/>
          <path d="M 167.5 270 L 232.5 270 L 215.5 190 A 30 30 0 1 0 184.5 190 Z" fill="#FFFFFF"/>
        </svg>`;
        const logoImg = new Image();
        logoImg.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(logoSvg);
        await new Promise<void>((resolve, reject) => {
          logoImg.onload = () => resolve();
          logoImg.onerror = () => reject(new Error('Failed to load logo image'));
        });
        ctx.drawImage(logoImg, 1, 10, 188, 188);

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 42px "Inter", system-ui, -apple-system, sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText(lang === 'zh' ? 'Family Key 邀请' : 'Family Key Invite', 188, 90);
        ctx.font = '400 20px "Inter", system-ui, -apple-system, sans-serif';
        const displayLink = link.replace(/^https?:\/\//, '');
        // link rendered below the QR code

        const qrImg = new Image();
        qrImg.src = qrDataUrl;
        await new Promise<void>((resolve, reject) => {
          qrImg.onload = () => resolve();
          qrImg.onerror = () => reject(new Error('Failed to load QR image'));
        });

        const qrSize = 420;
        const qrX = Math.round((W - qrSize) / 2);
        const qrY = 220;
        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // draw invite link below the QR code, centered
        ctx.fillStyle = '#3c4858';
        ctx.font = '400 20px "Inter", system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(displayLink, W / 2, qrY + qrSize + 12, W - 80);

        ctx.fillStyle = '#3c4858';
        ctx.font = '600 28px "Inter", system-ui, sans-serif';
        // Combined call-to-action centered below QR, in brand gold
        ctx.fillStyle = '#c5a35a';
        ctx.font = lang === 'zh'
          ? '700 35px "Inter", system-ui, sans-serif'
          : '700 30px "Inter", system-ui, sans-serif';
        const combinedText =
          lang === 'zh'
            ? '请扫描二维码接受邀请加入 Family Key 获得加密资产继承权'
            : 'Scan the QR code to accept the invite, join Family Key, and gain inheritance rights for crypto assets.';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        // Add larger spacing from invite link and wrap text to avoid downscaling
        const startY = qrY + qrSize + 12 + 85; // keep sufficient distance below link
        const maxWidth = W - 80;
        const lineHeight = lang === 'zh' ? 72 : 52;
        const lines: string[] = [];
        if (lang === 'zh') {
          const chars = combinedText.split('');
          let line = '';
          for (const ch of chars) {
            const test = line + ch;
            if (ctx.measureText(test).width > maxWidth && line) {
              lines.push(line);
              line = ch;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);
        } else {
          const words = combinedText.split(' ');
          let line = '';
          for (const w of words) {
            const test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > maxWidth && line) {
              lines.push(line);
              line = w;
            } else {
              line = test;
            }
          }
          if (line) lines.push(line);
        }
        lines.forEach((ln, i) => {
          ctx.fillText(ln, W / 2, startY + i * lineHeight);
        });
        ctx.textAlign = 'left';

        ctx.fillStyle = '#6b7280';
        ctx.font = '400 18px "Inter", system-ui, sans-serif';
        const footer =
          lang === 'zh'
            ? 'Family Key · 去中心化加密资产信托'
            : 'Family Key · Decentralized Crypto Asset Estate Trust';
        ctx.fillText(footer, 40, H - 60);

        setInviteImage(canvas.toDataURL('image/png'));
      } catch (error: any) {
        setInviteImage('');
        setLog((prev) => {
          const msg = error?.message || String(error);
          return prev ? `${prev}\n${msg}` : msg;
        });
      } finally {
        setIsGeneratingInviteImage(false);
      }
    },
    [lang]
  );

  const downloadInviteImage = useCallback(() => {
    if (!inviteImage) return;
    const anchor = document.createElement('a');
    anchor.href = inviteImage;
    anchor.download = 'familykey-invite.png';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: (lang === 'zh' ? '已下载邀请图片。' : 'Invite image downloaded.'), timeoutMs: 2600 } }));
  }, [inviteImage, lang]);

  const copyInviteImage = useCallback(async () => {
    if (!inviteImage) return;
    try {
      const res = await fetch(inviteImage);
      const blob = await res.blob();
      const ClipboardItemCtor = (window as any).ClipboardItem;
      if (navigator.clipboard && ClipboardItemCtor) {
        const item = new ClipboardItemCtor({ [blob.type]: blob });
        await navigator.clipboard.write([item]);
-        setLog(lang === 'zh' ? '邀请图片已复制。' : 'Invite image copied to clipboard.');
        window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: (lang === 'zh' ? '邀请图片已复制。' : 'Invite image copied to clipboard.'), timeoutMs: 2600 } }));
      } else {
        throw new Error(lang === 'zh' ? '当前浏览器不支持图片复制。' : 'Clipboard image copy not supported.');
      }
    } catch (error: any) {
-      setLog(error?.message || String(error));
      window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: (error?.message || String(error)), timeoutMs: 3000 } }));
    }
  }, [inviteImage, lang]);

  const copyInviteLink = useCallback(async () => {
    if (!lastInviteLink) return;
    try {
      await navigator.clipboard.writeText(lastInviteLink);
-      setLog(lang === 'zh' ? '邀请链接已复制。' : 'Invite link copied.');
      window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: (lang === 'zh' ? '邀请链接已复制。' : 'Invite link copied.'), timeoutMs: 2600 } }));
    } catch (error: any) {
-      setLog(error?.message || String(error));
+      window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: (error?.message || String(error)), timeoutMs: 3000 } }));
    }
  }, [lastInviteLink, lang]);

  useEffect(() => {
    if (!lastInviteLink) {
      setInviteImage('');
      return;
    }
    generateInvitePoster(lastInviteLink);
  }, [lastInviteLink, generateInvitePoster]);

  async function ensureWallet() {
    console.log('[ensureWallet] 开始执行');
    const ethProvider = typeof window !== 'undefined' ? (window as any).ethereum : undefined;
    if (!ethProvider) {
      console.error('[ensureWallet] 未检测到 injected wallet');
      throw new Error('No injected wallet detected.');
    }
    console.log('[ensureWallet] 检测到钱包，检查链 ID');
    const expectedChainId = `0x${baseSepolia.id.toString(16)}`;
    const chainId = await ethProvider.request({ method: 'eth_chainId' });
    console.log('[ensureWallet] 当前链 ID:', chainId, '期望链 ID:', expectedChainId);
    if (chainId !== expectedChainId) {
      console.log('[ensureWallet] 链 ID 不匹配，尝试切换');
      try {
        await ethProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }],
        });
      } catch (switchErr: any) {
        if (switchErr?.code === 4902) {
          await ethProvider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: expectedChainId,
                chainName: 'Base Sepolia',
                nativeCurrency: { name: 'Base Sepolia ETH', symbol: 'ETH', decimals: 18 },
                rpcUrls: [(import.meta as any).env?.VITE_RPC_URL || 'https://sepolia.base.org'],
                blockExplorerUrls: ['https://sepolia.basescan.org'],
              },
            ],
          });
          await ethProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
        } else {
          throw new Error(`Switch to Base Sepolia (84532). ${switchErr?.message || switchErr}`);
        }
      }
    }
    const provider = new ethers.providers.Web3Provider(ethProvider, 'any');
    const accounts = await provider.listAccounts();
    if (accounts.length === 0) {
      await provider.send('eth_requestAccounts', []);
    }
    const network = await provider.getNetwork();
    console.log('[ensureWallet] 网络信息:', network);
    if (network.chainId !== baseSepolia.id) {
      console.error('[ensureWallet] 链 ID 不匹配:', network.chainId, '期望:', baseSepolia.id);
      throw new Error(`Switch to Base Sepolia (84532). Current chain id: ${network.chainId}`);
    }
    const signer = provider.getSigner();
    console.log('[ensureWallet] 成功完成，返回 bundle');
    return { ethProvider, provider, signer };
  }

  async function enableModuleViaSafe(moduleAddr: string, safeAddr: string, signerBundle?: { ethProvider: any; provider: ethers.providers.Web3Provider; signer: ethers.Signer }) {
    const bundle = signerBundle || (await ensureWallet());
    
    console.log('[enableModuleViaSafe] 使用简化方式启用模块:', { moduleAddr, safeAddr });
    
    // 验证 Safe 合约是否已部署
    console.log('[enableModuleViaSafe] 验证 Safe 合约部署状态...');
    const code = await bundle.provider.getCode(safeAddr);
    if (code === '0x' || code === '0x0') {
      throw new Error(`Safe contract not deployed at ${safeAddr}`);
    }
    console.log('[enableModuleViaSafe] Safe 合约已部署，代码长度:', code.length);
    
    // 等待一小段时间确保合约状态同步
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 创建 Safe 合约实例
    const safeContract = new ethers.Contract(safeAddr, SAFE_ABI, bundle.signer);
    
    // 检查模块是否已启用（带重试）
    let isEnabled = false;
    let retries = 3;
    while (retries > 0) {
      try {
        isEnabled = await safeContract.isModuleEnabled(moduleAddr);
        break;
      } catch (error: any) {
        console.log('[enableModuleViaSafe] isModuleEnabled 调用失败，重试...', { retries, error: error.message });
        retries--;
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
    
    if (isEnabled) {
      console.log('[enableModuleViaSafe] 模块已经启用');
      setLog(lang === 'zh' ? '模块已启用。' : 'Module already enabled.');
      return;
    }
    
    // 编码 enableModule 调用
    const safeInterface = new ethers.utils.Interface(SAFE_ABI);
    const enableModuleData = safeInterface.encodeFunctionData('enableModule', [moduleAddr]);
    
    console.log('[enableModuleViaSafe] 编码的 enableModule 数据:', enableModuleData);
    
    // 对于单签名 Safe，使用简化的批准签名（Approved Hash 方式）
    // 签名格式：owner地址(32字节) + 0填充(32字节) + 签名类型(1字节，01=批准)
    const owner = await bundle.signer.getAddress();
    const signature = '0x' + owner.toLowerCase().slice(2).padStart(64, '0') + '0'.repeat(64) + '01';
    
    console.log('[enableModuleViaSafe] 使用批准签名:', signature);
    console.log('[enableModuleViaSafe] 签名者地址:', owner);
    
    // 估算 gas 费用
    console.log('[enableModuleViaSafe] 估算 gas 费用...');
    let gasLimit;
    try {
      const estimatedGas = await safeContract.estimateGas.execTransaction(
        safeAddr,
        0,
        enableModuleData,
        0,
        0,
        0,
        0,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        signature
      );
      // 添加 20% 缓冲
      gasLimit = estimatedGas.mul(120).div(100);
      console.log('[enableModuleViaSafe] 估算的 gas:', estimatedGas.toString(), '带缓冲:', gasLimit.toString());
      
      const gasPrice = await bundle.provider.getGasPrice();
      const estimatedCostWei = gasLimit.mul(gasPrice);
      const estimatedCostEth = ethers.utils.formatEther(estimatedCostWei);
      console.log('[enableModuleViaSafe] 预估费用:', estimatedCostEth, 'ETH');
      
      setLog(`${lang === 'zh' ? '预估模块启用费用：' : 'Estimated module enable fee: '}${Number(estimatedCostEth).toFixed(6)} ETH`);
    } catch (estimateError: any) {
      console.error('[enableModuleViaSafe] Gas 估算失败:', estimateError);
      // 使用一个合理的默认值
      gasLimit = ethers.BigNumber.from('300000');
      console.log('[enableModuleViaSafe] 使用默认 gas limit:', gasLimit.toString());
    }
    
    // 使用 execTransaction 执行（无需 signMessage，只需1次链上签名）
    const tx = await safeContract.execTransaction(
      safeAddr,              // to (Safe 调用自己)
      0,                     // value
      enableModuleData,      // data
      0,                     // operation (0 = Call)
      0,                     // safeTxGas
      0,                     // baseGas
      0,                     // gasPrice
      ethers.constants.AddressZero,  // gasToken
      ethers.constants.AddressZero,  // refundReceiver
      signature,             // signatures (批准签名)
      { gasLimit }
    );
    
    console.log('[enableModuleViaSafe] 交易已发送:', tx.hash);
    
    setLog(lang === 'zh' ? '等待模块启用交易确认...' : 'Waiting for module enable confirmation...');
    await tx.wait();
    
    console.log('[enableModuleViaSafe] 模块已成功启用');
    setLog(lang === 'zh' ? '模块已启用。' : 'Module enabled.');
  }

  async function createSafeAndDeploy() {
    console.log('[createSafeAndDeploy] 开始执行，状态：', { 
      isAuthenticated, 
      ownerAddress, 
      selectedBeneficiary, 
      heartbeatSeconds,
      isDeploying 
    });
    
    if (!isAuthenticated || !ownerAddress) {
      const msg = lang === 'zh' ? '请先完成钱包签名登录。' : 'Sign in with your wallet first.';
      console.log('[createSafeAndDeploy] 前置条件检查失败：未登录');
      setLog(msg);
      return;
    }
    if (!selectedBeneficiary) {
      const msg = lang === 'zh' ? '请先选择受益人。' : 'Select a beneficiary first.';
      console.log('[createSafeAndDeploy] 前置条件检查失败：未选择受益人');
      setLog(msg);
      return;
    }
    if (heartbeatSeconds <= 0) {
      const msg = lang === 'zh' ? '心跳时长必须大于 0。' : 'Heartbeat duration must be greater than zero.';
      console.log('[createSafeAndDeploy] 前置条件检查失败：心跳时长无效');
      setLog(msg);
      return;
    }
    
    console.log('[createSafeAndDeploy] 前置条件检查通过，开始部署');
    setIsDeploying(true);
    try {
      clearAuthError();
      console.log('[createSafeAndDeploy] 调用 ensureWallet...');
      const bundle = await ensureWallet();
      console.log('[createSafeAndDeploy] ensureWallet 成功');
      
      console.log('[createSafeAndDeploy] 获取钱包地址...');
      const walletOwner = await bundle.signer.getAddress();
      console.log('[createSafeAndDeploy] 钱包地址:', walletOwner);
      
      if (walletOwner && walletOwner.toLowerCase() !== ownerCacheKey) {
        throw new Error(lang === 'zh' ? '当前钱包地址与已登录地址不一致。' : 'Connected wallet does not match the authenticated address.');
      }
      
      setLog(lang === 'zh' ? '准备创建 Safe...' : 'Preparing Safe deployment…');
      
      console.log('[createSafeAndDeploy] 使用直接合约调用部署 Safe...');
      
      // 1. 准备 Safe setup 参数
      const owners = [walletOwner];
      const threshold = 1;
      const fallbackHandler = SAFE_ADDRESSES.SAFE_FALLBACK_HANDLER;
      const paymentToken = ethers.constants.AddressZero;
      const payment = 0;
      const paymentReceiver = ethers.constants.AddressZero;
      
      console.log('[createSafeAndDeploy] Safe 配置:', { owners, threshold, fallbackHandler });
      
      // 2. 生成 saltNonce 和 setup data
      const saltNonce = Math.floor(Date.now() / 1000);
      const safeInterface = new ethers.utils.Interface(SAFE_ABI);
      
      const setupData = safeInterface.encodeFunctionData('setup', [
        owners,
        threshold,
        ethers.constants.AddressZero,  // to - 不执行额外调用
        '0x',                           // data - 空数据
        fallbackHandler,
        paymentToken,
        payment,
        paymentReceiver,
      ]);
      
      console.log('[createSafeAndDeploy] Setup data:', setupData);
      
      // 3. 部署 Safe（第1次签名）
      const factory = new ethers.Contract(
        SAFE_ADDRESSES.SAFE_PROXY_FACTORY,
        SAFE_PROXY_FACTORY_ABI,
        bundle.signer
      );
      
      setLog(lang === 'zh' ? '估算 gas 费用...' : 'Estimating gas...');
      console.log('[createSafeAndDeploy] 估算 gas 费用...');
      
      // 估算 gas limit
      let gasLimit;
      try {
        const estimatedGas = await factory.estimateGas.createProxyWithNonce(
          SAFE_ADDRESSES.SAFE_SINGLETON,
          setupData,
          saltNonce
        );
        // 添加 20% 缓冲以防链上状态变化
        gasLimit = estimatedGas.mul(120).div(100);
        console.log('[createSafeAndDeploy] 估算的 gas:', estimatedGas.toString(), '带缓冲:', gasLimit.toString());
        
        // 预估费用并显示给用户
        const gasPrice = await bundle.provider.getGasPrice();
        const estimatedCostWei = gasLimit.mul(gasPrice);
        const estimatedCostEth = ethers.utils.formatEther(estimatedCostWei);
        console.log('[createSafeAndDeploy] 预估费用:', estimatedCostEth, 'ETH');
        
        setLog(`${lang === 'zh' ? '预估 gas 费用：' : 'Estimated gas fee: '}${Number(estimatedCostEth).toFixed(6)} ETH`);
        
        // 给用户1秒时间看到预估费用
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (estimateError: any) {
        console.error('[createSafeAndDeploy] Gas 估算失败:', estimateError);
        // 如果估算失败，使用一个合理的默认值
        gasLimit = ethers.BigNumber.from('500000');
        console.log('[createSafeAndDeploy] 使用默认 gas limit:', gasLimit.toString());
      }
      
      setLog(lang === 'zh' ? '部署 Safe (1/3)...' : 'Deploying Safe (1/3)...');
      console.log('[createSafeAndDeploy] 调用 createProxyWithNonce...');
      const deployTx = await factory.createProxyWithNonce(
        SAFE_ADDRESSES.SAFE_SINGLETON,
        setupData,
        saltNonce,
        { gasLimit }
      );
      
      window.dispatchEvent(new CustomEvent('fk:toast', { 
        detail: { msg: (lang === 'zh' ? '合约钱包创建已提交，等待第二次签名' : 'Contract wallet deployment submitted, waiting for the second signature'), timeoutMs: 2800 } 
      }));
      setLog(`${lang === 'zh' ? '合约钱包部署交易已发送，哈希：' : 'Contract wallet deployment sent. Tx:'} ${deployTx.hash}`);
      
      // 4. 等待交易确认并获取实际 Safe 地址
      const receipt = await deployTx.wait();
      console.log('[createSafeAndDeploy] 交易已确认，区块号:', receipt.blockNumber);
      console.log('[createSafeAndDeploy] 交易状态:', receipt.status);
      console.log('[createSafeAndDeploy] 交易事件数量:', receipt.events?.length || 0);
      
      // 检查交易是否成功
      if (receipt.status === 0) {
        throw new Error('Safe deployment transaction failed (status: 0)');
      }
      
      // 从交易回执中获取实际部署的 Safe 地址
      const proxyCreationEvent = receipt.events?.find((e: any) => e.event === 'ProxyCreation');
      console.log('[createSafeAndDeploy] ProxyCreation 事件:', proxyCreationEvent);
      
      if (!proxyCreationEvent || !proxyCreationEvent.args || !proxyCreationEvent.args.proxy) {
        console.error('[createSafeAndDeploy] 未找到 ProxyCreation 事件，所有事件:', receipt.events);
        throw new Error('Failed to get Safe address from deployment transaction');
      }
      const actualSafeAddress = ethers.utils.getAddress(proxyCreationEvent.args.proxy);
      console.log('[createSafeAndDeploy] 实际部署的 Safe 地址:', actualSafeAddress);
      
      // 验证 Safe 是否真的被部署（带重试机制）
      let code = '0x';
      let retries = 20;
      while (retries > 0) {
        console.log(`[createSafeAndDeploy] 检查合约代码 (剩余重试: ${retries})...`);
        code = await bundle.provider.getCode(actualSafeAddress);
        console.log('[createSafeAndDeploy] Safe 合约代码长度:', code.length);
        
        if (code !== '0x' && code !== '0x0' && code.length > 2) {
          console.log('[createSafeAndDeploy] ✓ Safe 合约已成功部署');
          break;
        }
        
        retries--;
        if (retries > 0) {
          console.log('[createSafeAndDeploy] 等待区块链状态同步...');
          await new Promise(resolve => setTimeout(resolve, 500)); // 等待 0.5 秒
        }
      }
      
      if (code === '0x' || code === '0x0' || code.length <= 2) {
        throw new Error(`Safe was not deployed successfully at ${actualSafeAddress}. Contract code not found after retries.`);
      }
      
      // 5. 使用实际地址调用后端部署模块
      setLog(lang === 'zh' ? '部署模块 (2/3)...' : 'Deploying module (2/3)...');
      const heartbeatInterval = heartbeatSeconds;
      const challengePeriod = challengeSeconds;
      
      const moduleRes = await authorizedFetch(apiUrl(`/api/safes/${actualSafeAddress}/module`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: walletOwner,
          beneficiary: selectedBeneficiary,
          heartbeatInterval,
          challengePeriod,
        }),
      });
      const moduleData = await moduleRes.json();
      if (!moduleRes.ok || !moduleData?.moduleAddress) {
        throw new Error(moduleData?.error || 'Module deployment failed.');
      }
      const moduleAddr = ethers.utils.getAddress(moduleData.moduleAddress);
      console.log('[createSafeAndDeploy] 模块已部署:', moduleAddr);
      
      // 6. 启用模块（第2次签名）
      setLog(lang === 'zh' ? '启用模块 (3/3)...' : 'Enabling module (3/3)...');
      await enableModuleViaSafe(moduleAddr, actualSafeAddress, bundle);
      
      setLog(lang === 'zh' ? '✓ 部署完成！' : '✓ Deployment complete!');
      rememberSafe(actualSafeAddress, walletOwner);
      await queryClient.invalidateQueries({ queryKey: ['recent-safes', ownerCacheKey] });
      await queryClient.invalidateQueries({ queryKey: ['owner-overview', ownerCacheKey, safeOverride || 'auto'] });
    } catch (error: any) {
      console.error('[createSafeAndDeploy] 错误：', error);
      const errorMsg = error?.message || String(error);
      setLog(errorMsg);
      // 显示 toast 通知
      window.dispatchEvent(
        new CustomEvent('fk:toast', { 
          detail: { msg: errorMsg, timeoutMs: 5000 } 
        })
      );
    } finally {
      console.log('[createSafeAndDeploy] 完成，设置 isDeploying = false');
      setIsDeploying(false);
    }
  }

  async function checkIn() {
    if (!moduleAddress) return;
    setIsCheckingIn(true);
    try {
      const bundle = await ensureWallet();
      const from = await bundle.signer.getAddress();
      const { encodeFunctionData } = await import('viem');
      const data = encodeFunctionData({
        abi: deadmanSwitchAbi as any,
        functionName: 'checkIn',
        args: [],
      });
      
      // 估算 gas
      let gasLimit;
      try {
        const estimated = await bundle.provider.estimateGas({
          from,
          to: moduleAddress,
          data,
        });
        gasLimit = estimated.mul(120).div(100); // 添加 20% 缓冲
        console.log('[checkIn] 估算的 gas:', estimated.toString(), '带缓冲:', gasLimit.toString());
        
        const gasPrice = await bundle.provider.getGasPrice();
        const estimatedCostWei = gasLimit.mul(gasPrice);
        const estimatedCostEth = ethers.utils.formatEther(estimatedCostWei);
        console.log('[checkIn] 预估费用:', estimatedCostEth, 'ETH');
      } catch (estimateError: any) {
        console.error('[checkIn] Gas 估算失败:', estimateError);
        gasLimit = ethers.BigNumber.from('100000'); // 默认值
      }
      
      const txHash = await bundle.ethProvider.request({
        method: 'eth_sendTransaction',
        params: [{ 
          from, 
          to: moduleAddress, 
          data,
          gas: gasLimit.toHexString()
        }],
      });
      setLog(`${lang === 'zh' ? '心跳签到交易已发送：' : 'Check-in tx sent:'} ${txHash}`);
      await overviewQuery.refetch();
    } catch (error: any) {
      setLog(error?.message || String(error));
    } finally {
      setIsCheckingIn(false);
    }
  }

  const connectButtonLabel = isAuthenticating
    ? t('siwe_signing')
    : isConnecting
    ? t('connecting_wallet')
    : isConnected
    ? t('siwe_sign_in')
    : t('connect_wallet');

  return (
    <div>
      <style>{`
        .fk-heartbeat { display: inline-block; margin-right: 6px; color: #dc2626; animation: fk-pulse 1s infinite; transform-origin: center; }
        @keyframes fk-pulse { 0% { transform: scale(1); } 30% { transform: scale(1.15); } 50% { transform: scale(1); } 80% { transform: scale(1.15); } 100% { transform: scale(1); } }
      `}</style>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <div className="section-title">{t('Owner_title')}</div>
          <p className="muted">{t('Owner_desc')}</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: 'nowrap', flexShrink: 0 }}>
          {!isAuthenticated && (
            <>
              {availableWallets.length > 1 && (
                <select
                  className="input"
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  style={{ maxWidth: 180 }}
                  aria-label={lang === 'zh' ? '选择钱包插件' : 'Select Wallet Extension'}
                >
                  {availableWallets.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              )}
              {/* {availableWallets.length === 1 && (
                <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                  {lang === 'zh' ? '已识别钱包：' : 'Detected:'} {availableWallets[0].name}
                </span>
              )} */}
              {availableWallets.length === 0 && (
                <span className="muted" style={{ whiteSpace: 'nowrap' }}>
                  {lang === 'zh' ? '未检测到浏览器钱包' : 'No browser wallet detected'}
                </span>
              )}
              <button className="btn btn-gold" onClick={handleSignIn} disabled={isConnecting || isAuthenticating}>
                {connectButtonLabel}
              </button>
            </>
          )}
          {isAuthenticated && (
            <>
              <span className="muted" style={{ whiteSpace: 'nowrap' }}>{shortenAddress(ownerAddress || address)}</span>
              <button className="btn" onClick={handleSignOut} disabled={isAuthenticating || isConnecting}>
                {t('disconnect')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* {recentSafes.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="section-title">{lang === 'zh' ? '最近创建的 Safe' : 'Recent Safes'}</div>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {recentSafes.map((safeAddr) => (
              <button
                key={safeAddr}
                className="btn"
                onClick={() => setSafeOverride(safeAddr)}
                style={{ borderColor: safeOverride === safeAddr ? 'var(--fk-gold)' : undefined }}
              >
                {shortenAddress(safeAddr)}
              </button>
            ))}
            {safeOverride && (
              <button className="btn" onClick={() => setSafeOverride('')}>
                {lang === 'zh' ? '自动匹配最新 Safe' : 'Use Latest Safe'}
              </button>
            )}
          </div>
        </div>
      )} */}

      <div className="grid" style={{ gridTemplateColumns: 'minmax(0, 3fr) minmax(0, 2fr)', gap: 20 }}>
        <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 20 }}>
          <div className="card">
            <div className="section-title">{lang === 'zh' ? '家庭基金状态' : 'Family Fund Status'}</div>
            {overviewQuery.isLoading && <p className="muted">{lang === 'zh' ? '正在读取状态…' : 'Loading current status…'}</p>}
            {!overviewQuery.isLoading && !safeSnapshot && (
              <div>
                <p className="muted" style={{ marginBottom: 12 }}>
                  {isConnected
                    ? (lang === 'zh'
                        ? '尚未创建可继承家庭基金，请先邀请受益人来完成创建流程'
                        : 'No inheritable Family Fund has been created yet. Please invite a beneficiary to complete the creation flow.')
                    : (lang === 'zh'
                        ? '连接钱包查看家庭基金状态'
                        : 'Connect a wallet to view your Family Fund status')}
                  </p>
                  {/* {isConnected && (
                    <button className="btn" onClick={() => overviewQuery.refetch()}>{lang === 'zh' ? '手动刷新' : 'Refresh'}</button>
                  )} */}
                </div>
              )}
            {safeSnapshot && lifecycle && (
              <div className="grid" style={{ gap: 12 }}>
                <div className="card" style={{ background: 'rgba(5, 150, 105, 0.05)', marginTop: 12}}>
                  {/* <div className="label">{lang === 'zh' ? '当前状态' : 'Current State'}</div> */}
                  <div style={{ fontWeight: 600, color: stateTone[lifecycle.state] }}>{stateCopy[lifecycle.state]}</div>
                  <div className="muted" style={{ marginTop: 6 }}>
                    {lifecycle.state === 'ALIVE' && secondsUntilDeadline !== null && secondsUntilDeadline >= 0 && (
                      <>

                        {lang === 'zh' ? '心跳签到剩余时间：' : 'Time until heartbeat check-in:'}{' '}
                        {secondsToDuration(secondsUntilDeadline)}
                        <span className="fk-heartbeat" style={{ marginLeft: 6 }} aria-hidden="true">❤</span>
                      </>
                    )}
                    {lifecycle.state === 'EXPIRED' && secondsUntilDeadline !== null && (
                      <>
                        {lang === 'zh' ? '已结束：' : 'Overdue by '} {secondsToDuration(Math.abs(secondsUntilDeadline))}
                      </>
                    )}
                    {lifecycle.state === 'CLAIM_PENDING' && secondsUntilDeadline !== null && secondsUntilDeadline >= 0 && (
                      <>
                        {lang === 'zh' ? '挑战期剩余：' : 'Challenge window:'}{' '}
                        {secondsToDuration(secondsUntilDeadline)}
                      </>
                    )}
                    {lifecycle.state === 'CLAIM_READY' && secondsUntilDeadline !== null && (
                      <>
                        {lang === 'zh' ? '已准备继承，受益人可随时完成。' : 'Inheritance can be finalized by the beneficiary.'}
                      </>
                    )}
                    {lifecycle.state === 'INHERITED' && (
                      <>
                        {lang === 'zh' ? '基金所有权已转移至受益人。' : 'Fund ownership has moved to the beneficiary.'}
                      </>
                    )}
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <div className="label">{lang === 'zh' ? '家庭基金地址' : ' Family Fund Address'}</div>
                    <div>{safeSnapshot.address}</div>
                  </div>
                  {/* <div>
                    <div className="label">{lang === 'zh' ? '模块地址' : 'Module Address'}</div>
                    <div>{safeSnapshot.moduleAddress || '—'}</div>
                  </div> */}
                  {/* <div>
                    <div className="label">{lang === 'zh' ? '链上所有者' : 'On-chain Owner'}</div>
                    <div>{status ? shortenAddress(status.Owner) : '—'}</div>
                  </div> */}
                  <div>
                    <div className="label">{lang === 'zh' ? '绑定受益人' : 'Beneficiary'}</div>
                    <div>{status ? (() => { const ben = beneficiaries.find((b) => b.address?.toLowerCase() === status.beneficiary?.toLowerCase()); const short = shortenAddress(status.beneficiary); return ben?.email ? `${ben.email} (${short})` : short; })() : '—'}</div>
                  </div>
                </div>

                <div className="grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
                  <div>
                    <div className="label">{lang === 'zh' ? '心跳时长' : 'Heartbeat Duration'}</div>
                    <div>{secondsToDuration(safeSnapshot.heartbeatInterval)}</div>
                  </div>
                  <div>
                    <div className="label">{lang === 'zh' ? '挑战期' : 'Challenge Duration'}</div>
                    <div>{secondsToDuration(safeSnapshot.challengePeriod)}</div>
                  </div>
                  {/* <div>
                    <div className="label">{lang === 'zh' ? '上次心跳' : 'Last Check-in'}</div>
                    <div>{formatDateFromSeconds(status?.lastCheckIn)}</div>
                  </div> */}
                  <div>
                    <div className="label">{lang === 'zh' ? '基金创建时间' : 'Module Created'}</div>
                    <div>{new Date(safeSnapshot.createdAt).toLocaleString()}</div>
                  </div>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  {moduleAddress && (lifecycle.state === 'ALIVE' || lifecycle.state === 'EXPIRED' || lifecycle.state === 'CLAIM_READY' || lifecycle.state === 'CLAIM_PENDING') && (
                    <button className="btn btn-gold" onClick={checkIn} disabled={isCheckingIn}>
                      {isCheckingIn ? (lang === 'zh' ? '签到中…' : 'Checking in…') : (lang === 'zh' ? '心跳签到' : 'Heartbeat Check-In')}
                    </button>
                  )}
                  {/* <button className="btn" onClick={() => overviewQuery.refetch()}>{lang === 'zh' ? '刷新状态' : 'Refresh Status'}</button> */}

                </div>
              </div>
            )}
          </div>

{!safeSnapshot && (
          <div className="card">
            <div className="section-title">{lang === 'zh' ? '创建家庭基金' : 'Create Family Fund'}</div>
            {address && (
              <p className="muted" style={{ marginBottom: 8 }}>
                {lang === 'zh'
                  ? (beneficiaries.length === 0 ? '请先邀请受益人再创建家庭基金' : '选择受益人并设置心跳周期来创建家庭基金')
                  : (beneficiaries.length === 0 ? 'Invite a beneficiary first before creating the Family Fund' : 'Select a beneficiary to create the Family Fund')}
              </p>
            )}
            {address ? (
              <>
                
                {!safeSnapshot && (
                  <>
                    {/* <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>
                      {lang === 'zh'
                        ? '👇 请选择受益人并配置心跳/挑战参数，然后创建 Safe 模块。'
                        : '👇 Select a beneficiary and configure parameters to create the Safe module.'}
                    </div> */}
                    <div className="form-row">
                      <label className="label">{lang === 'zh' ? '选择受益人' : 'Select Beneficiary'}</label>
                      <div style={{ position: 'relative' }}>
                        <select
                          ref={beneficiarySelectRef}
                          className="input"
                          value={selectedBeneficiary}
                          onChange={(e) => setSelectedBeneficiary(e.target.value)}
                          style={{ paddingRight: 36 }}
                        >
                          {beneficiaries.map((b) => (
                            <option key={b.address} value={b.address}>
                              {`${b.email || shortenAddress(b.address)}${b.email ? ` (${shortenAddress(b.address)})` : ''}`}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          aria-label={lang === 'zh' ? '展开选项' : 'Open options'}
                          aria-expanded={beneficiaryDropdownOpen}
                          onClick={() => setBeneficiaryDropdownOpen((o) => !o)}
                          style={{
                            position: 'absolute',
                            right: 8,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 0,
                            background: 'transparent',
                            cursor: 'pointer',
                            padding: 4,
                            color: 'var(--fk-text)'
                          }}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                        {beneficiaryDropdownOpen && beneficiaries.length > 0 && (
                          <div
                            role="listbox"
                            aria-label={lang === 'zh' ? '受益人列表' : 'Beneficiaries'}
                            style={{
                              position: 'absolute',
                              top: 'calc(100% + 4px)',
                              left: 0,
                              right: 0,
                              maxHeight: 180,
                              overflow: 'auto',
                              border: '1px solid var(--fk-border)',
                              borderRadius: 8,
                              boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
                              background: '#fff',
                              zIndex: 10
                            }}
                          >
                            {beneficiaries.map((b) => (
                              <div
                                key={b.address}
                                role="option"
                                aria-selected={selectedBeneficiary === b.address}
                                onClick={() => { setSelectedBeneficiary(b.address); setBeneficiaryDropdownOpen(false); }}
                                style={{
                                  padding: '8px 10px',
                                  cursor: 'pointer',
                                  background: selectedBeneficiary === b.address ? '#f3f4f6' : '#fff'
                                }}
                              >
                                <div style={{ fontSize: 14 }}>{b.email || shortenAddress(b.address)}</div>
                                <div className="muted" style={{ fontSize: 12 }}>{shortenAddress(b.address)}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                {beneficiaries.length > 0 && !safeSnapshot && (
                  <>
                    <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      <div className="form-row">
                        <label className="label">{lang === 'zh' ? '心跳时长（秒）' : 'Heartbeat Interval (seconds)'}</label>
                        <input
                          className="input"
                          type="number"
                          min={1}
                          value={heartbeatSeconds}
                          onChange={(e) => setHeartbeatSeconds(parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="form-row">
                        <label className="label">{lang === 'zh' ? '挑战期（秒）' : 'Challenge Period (seconds)'}</label>
                        <input
                          className="input"
                          type="number"
                          min={0}
                          value={challengeSeconds}
                          onChange={(e) => setChallengeSeconds(parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <button 
                        className="btn btn-gold" 
                        onClick={() => {
                          console.log('[按钮点击] 创建家庭基金按钮被点击');
                          createSafeAndDeploy();
                        }} 
                        disabled={isDeploying || beneficiaries.length === 0}
                        style={{ width: '100%' }}
                      >
                        {isDeploying ? (lang === 'zh' ? '创建中…' : 'Deploying…') : t('create_family_fund')}
                      </button>
                      {(isDeploying || beneficiaries.length === 0) && (
                        <div className="muted" style={{ fontSize: 12, marginTop: 6, textAlign: 'center' }}>
                          {isDeploying && (lang === 'zh' ? '⏳ 开始部署，需要二次签名...' : '⏳ Start deploying, need two signatures...')}
                          {!isDeploying && beneficiaries.length === 0 && (lang === 'zh' ? '⚠️ 按钮已禁用：需要先添加受益人' : '⚠️ Button disabled: Add a beneficiary first')}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            ) : (
              <p className="muted">{lang === 'zh' ? '请连接钱包以创建家庭基金' : 'Connect a wallet to create a Family Fund'}</p>
            )}
          </div>
)}
        </div>

        {!safeSnapshot ? (
          <div className="card">
            <div className="section-title">{lang === 'zh' ? '邀请受益人' : 'Invite Beneficiary'}</div>
            {address ? (
              <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', marginTop: 26 }}>
                  <div className="card" style={{ background: '#f9fafb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 18px' }}>
                    <div className="label" style={{ margin: 0 }}>{lang === 'zh' ? '受益人数量' : 'Beneficiaries'}</div>
                    <div style={{ fontSize: 20, fontWeight: 600 }}>{overview?.beneficiaries.total ?? 0}</div>
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <p className="muted" style={{ fontSize: 14, marginBottom: 8, display: 'block', width: '100%', maxWidth: '100%' }}>
                    {lang === 'zh' 
                      ? '点击下方按钮生成邀请链接，将链接或二维码分享给您的受益人。受益人访问链接后需用邮箱完成注册登录。'
                      : 'Click the button below to generate an invite link. Share the link or QR code with your beneficiary, who will need to log in with their email.'}
                  </p>
                  <button 
                    className="btn btn-gold" 
                    onClick={handleGenerateInvite} 
                    disabled={isGeneratingInvite}
                    style={{ width: '100%' }}
                  >
                    {isGeneratingInvite 
                       ? (lang === 'zh' ? '生成中…' : 'Generating…') 
                       : (lang === 'zh' ? '生成邀请链接' : 'Generate Invite Link')}
                   </button>
                </div>
                {beneficiaries.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div className="label" style={{ marginBottom: 8 }}>{lang === 'zh' ? '✓ 已注册的受益人' : '✓ Registered Beneficiaries'}</div>
                      <div style={{ border: '1px solid var(--fk-border)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                        {beneficiaries.map((b) => (
                          <div key={b.address} style={{ marginBottom: 8, padding: 8, background: '#f9fafb', borderRadius: 6 }}>
                            <div style={{ fontSize: 14, fontWeight: 500 }}>{b.email || (lang === 'zh' ? '未填写邮箱' : 'No email')}</div>
                            <div className="muted" style={{ fontSize: 12 }}>{b.address}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                {lastInviteLink && (
                  <div className="card" style={{ marginBottom: 12, background: 'rgba(218, 185, 116, 0.12)', borderColor: 'var(--fk-gold-2)' }}>
                    <div className="label" style={{ marginBottom: 6, color: 'var(--fk-gold-1)' }}>
                      {lang === 'zh' ? '✓ 邀请创建成功' : '✓ Invite Created Successfully'}
                    </div>
                    {!inviteImage && (
                      <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                        <button className="btn btn-gold" onClick={copyInviteLink}>
                          {lang === 'zh' ? '📋 复制链接' : '📋 Copy Link'}
                        </button>
                      </div>
                    )}
                    {isGeneratingInviteImage && (
                      <div className="muted" style={{ fontSize: 13 }}>
                        {lang === 'zh' ? '正在生成邀请海报…' : 'Generating invite poster…'}
                      </div>
                    )}
                    {inviteImage && (
                      <div style={{ marginTop: 12 }}>
                        <img src={inviteImage} alt="invite poster" style={{ maxWidth: '100%', borderRadius: 12, border: '1px solid var(--fk-border)' }} />
                        <div className="row" style={{ gap: 8, marginTop: 8 }}>
                          <button className="btn btn-gold" onClick={downloadInviteImage}>
                            {lang === 'zh' ? '下载图片' : 'Download Poster'}
                          </button>
                          <button className="btn" onClick={copyInviteImage}>
                            {lang === 'zh' ? '复制图片' : 'Copy Poster'}
                          </button>
                          <button className="btn" onClick={copyInviteLink}>
                            {lang === 'zh' ? '复制链接' : 'Copy Link'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {invites.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <details style={{ border: '1px solid var(--fk-border)', borderRadius: 8, padding: 12 }}>
                      <summary style={{ cursor: 'pointer', fontWeight: 500, marginBottom: 0 }}>
                        {lang === 'zh' ? '邀请记录' : 'Invite History'} ({invites.length})
                      </summary>
                      <div style={{ maxHeight: 180, overflow: 'auto', marginTop: 8 }}>
                        {invites.slice(0, 10).map((inv) => (
                          <div key={inv.token} className="row" style={{ justifyContent: 'space-between', marginBottom: 6, padding: 6, background: '#f9fafb', borderRadius: 4 }}>
                            <span className="muted" style={{ fontSize: 13 }}>
                              {shortenAddress(inv.beneficiaryAddress) || inv.token.slice(0, 8)}
                            </span>
                            <span style={{ fontSize: 12, color: inv.status === 'ACCEPTED' ? '#059669' : '#9ca3af' }}>
                              {inv.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </>
            ) : (
              <p className="muted">{lang === 'zh' ? '连接钱包生成邀请链接' : 'Connect a wallet to generate invite links'}</p>
            )}
          </div>
        ) : (
          <div className="card">
            <div className="section-title">{lang === 'zh' ? '家庭基金资金' : 'Fund Assets'}</div>
            {address ? (
              <>
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 26 }}>
                  <div className="card" style={{ background: 'rgba(218, 185, 116, 0.12)', padding: '10px 14px', borderColor: 'var(--fk-gold-2)' }}>
                    <div className="row" style={{ alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <div className="label" style={{ margin: 0, color: 'var(--fk-gold-1)' }}>{lang === 'zh' ? '总美元余额' : 'Total USD Balance'}</div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>${(totalUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                        <div className="muted" style={{ fontSize: 12 }}>{(totalEth || 0).toFixed(4)} ETH</div>
                      </div>

                      {/* 迷你 DeFi 质押卡片（置于右侧） */}
                      <div style={{ flex: '0 0 220px', maxWidth: 280, width: '100%' }}>
                        <div className="label" style={{ fontSize: 11, color: '#6b7280' }}>{lang === 'zh' ? '当前质押的 DeFi' : 'Staked DeFi'}</div>
                        <div className="card" style={{ marginTop: 6, padding: '8px 10px', border: '1px solid var(--fk-border)', borderRadius: 8, background: '#fafafa' }}>
                          {((Object.keys(VAULT_CONFIGS) as VaultProtocol[]).filter((p) => vaultBalances[p].balance > 0).length > 0) ? (
                            (Object.keys(VAULT_CONFIGS) as VaultProtocol[]).filter((p) => vaultBalances[p].balance > 0).map((p) => (
                              <div key={p} className="row" style={{ justifyContent: 'space-between', width: '100%', padding: '4px 0' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <img
                                    src={p === 'lido' ? '/lido-dao-ldo-logo.png' : (p === 'aave' ? '/aave-aave-logo.png' : '/maker-mkr-logo.png')}
                                    alt={VAULT_CONFIGS[p].name}
                                    style={{ width: 16, height: 16, borderRadius: 4 }}
                                  />
                                  <div style={{ fontSize: 12, fontWeight: 500 }}>{VAULT_CONFIGS[p].name}</div>
                                </div>
                                <div style={{ fontSize: 12, fontWeight: 600 }}>{vaultBalances[p].balance.toFixed(4)} ETH</div>
                              </div>
                            ))
                          ) : (
                            <div className="muted" style={{ fontSize: 12 }}>{lang === 'zh' ? '暂无质押' : 'No staking yet'}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div className="label" style={{ marginBottom: 8 }}>{lang === 'zh' ? '存入资金' : 'Deposited Crypto'}</div>
                  <div style={{ border: '1px solid var(--fk-border)', borderRadius: 8, padding: 12 }}>
                    {assets.length > 0 ? (
                      assets.map((a) => (
                        <div key={a.symbol} className="row" style={{ justifyContent: 'space-between', marginBottom: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <img src={a.icon} alt={a.symbol} style={{ width: '100%', height: '100%' }} />
                            </div>
                            <div style={{ fontWeight: 500 }}>{a.symbol}</div>
                          </div>
                          <div style={{ fontWeight: 600 }}>{a.amount.toFixed(4)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="muted" style={{ fontSize: 13 }}>{lang === 'zh' ? '暂无资产' : 'No assets yet'}</div>
                    )}
                  </div>
                </div>

                <div className="row" style={{ gap: 8, marginTop: 12 }}>
                  <input
                    className="input"
                    type="number"
                    min={0}
                    step="0.001"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    placeholder={lang === 'zh' ? '金额（ETH）' : 'Amount (ETH)'}
                    style={{ flex: '1 1 auto' }}
                  />
                  <button className="btn btn-gold" onClick={depositToFund} disabled={isDepositing} style={{ flexShrink: 0 }}>
                    {isDepositing ? (lang === 'zh' ? '存入中…' : 'Depositing…') : (lang === 'zh' ? '存入基金' : 'Deposit')}
                  </button>
                </div>
                
                <div className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 12 }}>
                    <div>
                      <div className="label" style={{ margin: 0 }}>{lang === 'zh' ? '基金地址' : 'Fund Address'}: {shortenAddress(safeSnapshot?.address)}</div>
                      {/* <div className="muted" style={{ fontSize: 12 }}>{shortenAddress(safeSnapshot?.address)}</div> */}
                    </div>
                    <button className="btn" onClick={copySafeAddress}>
                      {lang === 'zh' ? '复制地址' : 'Copy'}
                    </button>
                  </div>

                {/* DeFi Yield Strategies Section */}
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '2px dashed #e5e7eb' }}>
                  <div className="section-title" style={{ marginBottom: 8 }}>
                    {lang === 'zh' ? 'DeFi 收益策略' : 'DeFi Yield Strategies'}
                  </div>
                  <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                    {lang === 'zh'
                      ? '选择收益策略，让家庭基金产生收益。'
                      : 'Select yield strategies to generate yield for your family fund.'}
                  </p>

                  {/* DeFi Strategies Selector */}
                  <div style={{ width: '100%' }}>
                    <div style={{ position: 'relative' }}>
                      <button
                        type="button"
                        className="input"
                        onClick={() => {
                          const next = !strategyDropdownOpen;
                          setStrategyDropdownOpen(next);
                          if (next) {
                            setTimeout(() => {
                              const panel = strategyDropdownPanelRef.current;
                              if (!panel) return;
                              const rect = panel.getBoundingClientRect();
                              const viewportHeight = window.innerHeight;
                              const desiredGap = 48; // 页面底部预留空白距离
                              const bottomDiff = rect.bottom - viewportHeight;
                              if (bottomDiff > -desiredGap) {
                                window.scrollBy({ top: bottomDiff + desiredGap, behavior: 'smooth' });
                              }
                            }, 0);
                          }
                        }}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <img
                            src={selectedProtocol === 'lido' ? '/lido-dao-ldo-logo.png' : (selectedProtocol === 'aave' ? '/aave-aave-logo.png' : '/maker-mkr-logo.png')}
                            alt={VAULT_CONFIGS[selectedProtocol].name}
                            style={{ width: 20, height: 20, borderRadius: 4 }}
                          />
                          <span style={{ textAlign: 'left' }}>{VAULT_CONFIGS[selectedProtocol].name}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', marginLeft: 'auto', gap: 8 }}>
                          <span style={{ textAlign: 'right' }}>{VAULT_CONFIGS[selectedProtocol].apy}% APR</span>
                          <span style={{ opacity: 0.8 }}>▼</span>
                        </div>
                      </button>
                      {strategyDropdownOpen && (
                        <div
                          className="card"
                          ref={strategyDropdownPanelRef}
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: 8,
                            boxShadow: '0 10px 24px rgba(0,0,0,0.1)',
                            overflow: 'hidden'
                          }}
                        >
                          {(Object.keys(VAULT_CONFIGS) as VaultProtocol[]).map((p) => {
                            const cfg = VAULT_CONFIGS[p];
                            return (
                              <div
                                key={p}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', cursor: 'pointer' }}
                                onClick={() => { setSelectedProtocol(p); setStrategyDropdownOpen(false); setShowDefiStrategiesModal(false); setDefiDepositOpenToken((t) => t + 1); }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <img
                                    src={p === 'lido' ? '/lido-dao-ldo-logo.png' : (p === 'aave' ? '/aave-aave-logo.png' : '/maker-mkr-logo.png')}
                                    alt={cfg.name}
                                    style={{ width: 18, height: 18, borderRadius: 4 }}
                                  />
                                  <span style={{ textAlign: 'left' }}>{cfg.name}</span>
                                </div>
                                <span style={{ marginLeft: 12, textAlign: 'right' }}>{`${cfg.apy}% APR`}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
              
            ) : (
              <p className="muted">{lang === 'zh' ? '连接钱包查看资金' : 'Connect a wallet to view funds'}</p>
            )}
          </div>
        )}
      </div>

      {/* Hidden deposit modal trigger-only card */}
      <DefiStrategyCardSimple
        protocol={selectedProtocol}
        safeAddress={safeSnapshot?.address || ''}
        onDeposit={depositToVault}
        lang={lang}
        hideCardBody={true}
        externalOpenToken={defiDepositOpenToken}
        fundEth={fundEth}
      />

      {/* DeFi Strategies Modal */}
      {showDefiStrategiesModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: 20,
            overflow: 'auto',
          }}
          onClick={() => setShowDefiStrategiesModal(false)}
        >
          <div
            style={{
              maxWidth: 1200,
              width: '100%',
              background: '#fff',
              borderRadius: 16,
              padding: '32px 28px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div className="section-title" style={{ marginBottom: 4 }}>
                  {lang === 'zh' ? '💰 DeFi 收益策略' : '💰 DeFi Yield Strategies'}
                </div>
                <p className="muted" style={{ fontSize: 14, margin: 0 }}>
                  {lang === 'zh'
                    ? '选择适合的协议投资，为家族基金创造收益'
                    : 'Choose protocols to invest and generate yield for your family fund'}
                </p>
              </div>
              <button
                onClick={() => setShowDefiStrategiesModal(false)}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 32,
                  color: '#9ca3af',
                  padding: 0,
                  lineHeight: 1,
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 8,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                ×
              </button>
            </div>

            {/* Strategy Card - Selected Only */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              <DefiStrategyCardSimple
                protocol={selectedProtocol}
                safeAddress={safeSnapshot?.address || ''}
                onDeposit={depositToVault}
                lang={lang}
                fundEth={fundEth}
              />
            </div>

            {/* Modal Footer */}
            <div
              style={{
                marginTop: 24,
                paddingTop: 20,
                borderTop: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'center',
              }}
            >
              <button
                className="btn"
                onClick={() => setShowDefiStrategiesModal(false)}
                style={{
                  minWidth: 160,
                  padding: '10px 24px',
                }}
              >
                {lang === 'zh' ? '关闭' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

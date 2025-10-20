import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import Claim from './Claim';
import { apiUrl } from '../config/api';
import { useI18n } from './i18n';
import { useQuery } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { SAFE_ABI } from '../abi/safeContracts';

type InviteInfo = {
  token: string;
  inviterAddress: string;
  status: string;
  acceptedAt?: string | null;
  beneficiaryAddress?: string | null;
};

type ModuleLifecycleState = 'UNCONFIGURED' | 'ALIVE' | 'EXPIRED' | 'CLAIM_PENDING' | 'CLAIM_READY' | 'INHERITED';

type ModuleLifecycle = {
  state: ModuleLifecycleState;
  now: number;
  heartbeatExpiresAt?: number;
  secondsUntilHeartbeatExpires?: number;
  claimReadyAt?: number;
  secondsUntilClaimReady?: number;
  canCancelClaim: boolean;
  isOwnerStillInControl: boolean;
};

type ModuleStatus = {
  safe: string;
  Owner: string;
  beneficiary: string;
  lastCheckIn: number;
  heartbeatInterval: number;
  claimReadyAt: number;
} | null;

type ModuleInfo = {
  safeAddress: string;
  ownerAddress: string;
  beneficiaryAddress: string;
  moduleAddress: string | null;
  heartbeatInterval: number;
  challengePeriod: number;
  createdAt: string;
  status: ModuleStatus;
  lifecycle: ModuleLifecycle;
};

type BeneficiaryProfile = {
  address: string;
  email?: string | null;
  phone?: string | null;
  invitedBy?: string | null;
  createdAt: string;
  invite?: {
    token: string;
    status: string;
    acceptedAt?: string | null;
  } | null;
};

const INVITE_STORAGE_KEY = 'fk.inviteTokens';

const shortenAddress = (address?: string | null) => {
  if (!address) return '—';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

export default function Beneficiary() {
  const { t, lang } = useI18n();
  const { ready, authenticated, login, logout, user } = usePrivy();
  const { wallets } = useWallets();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [msg, setMsg] = useState('');
  const [invites, setInvites] = useState<InviteInfo[]>([]);
  const [activeInvite, setActiveInvite] = useState<InviteInfo | null>(null);
  const [isLoadingInvite, setIsLoadingInvite] = useState(false);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [modulesError, setModulesError] = useState('');
  const [modulesLoading, setModulesLoading] = useState(false);
  const [selectedModuleAddress, setSelectedModuleAddress] = useState<string>('');
  const [lastModulesRefresh, setLastModulesRefresh] = useState<string | null>(null);
  const [profile, setProfile] = useState<BeneficiaryProfile | null>(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [bindStatus, setBindStatus] = useState<'idle' | 'binding' | 'bound' | 'error'>('idle');
  const [inviteAlreadyUsed, setInviteAlreadyUsed] = useState(false);
  const [urlInviteToken, setUrlInviteToken] = useState<string | null>(null);
  const lastBindFingerprint = useRef<string | null>(null);
  const autoRefreshTimeoutRef = useRef<number | null>(null);

  const embeddedWallet = useMemo(
    () =>
      wallets.find((wallet) => {
        const w = wallet as any;
        return w?.walletClientType === 'privy' || w?.type === 'privy' || w?.connectorType === 'privy';
      }),
    [wallets]
  );
  const walletAddress = embeddedWallet?.address ?? '';

  const selectableModules = useMemo(() => modules.filter((item) => !!item.moduleAddress), [modules]);

  useEffect(() => {
    setEmail((user as any)?.email?.address ?? '');
    setPhone((user as any)?.phone?.number ?? '');
  }, [user]);

  const rememberInviteToken = useCallback((token: string) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(INVITE_STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(token)) {
        list.unshift(token);
        localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(list.slice(0, 10)));
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const forgetInviteToken = useCallback((token: string) => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(INVITE_STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const next = list.filter((item) => item !== token);
      localStorage.setItem(INVITE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const fetchInvite = useCallback(
    async (token: string) => {
      const trimmed = token.trim();
      if (!trimmed) return;
      setIsLoadingInvite(true);
      try {
        const res = await fetch(apiUrl(`/api/invite/${trimmed}`));
        const data = await res.json();
        if (!res.ok || !data?.invite) {
          throw new Error(data?.error || 'Invite not found');
        }
        const invite: InviteInfo = data.invite;
        // Only set used state when the invite matches the URL token
        if (urlInviteToken && invite.token === urlInviteToken) {
          setInviteAlreadyUsed(invite.status === 'ACCEPTED');
        }
        setInvites((prev) => {
          const exists = prev.find((i) => i.token === invite.token);
          if (exists) {
            return prev.map((item) => (item.token === invite.token ? invite : item));
          }
          return [invite, ...prev];
        });
        rememberInviteToken(invite.token);
        setActiveInvite((prev) => {
          if (prev?.token === invite.token) return invite;
          return prev ?? invite;
        });
      } catch (error: any) {
        setMsg(error?.message || String(error));
      } finally {
        setIsLoadingInvite(false);
      }
    },
    [rememberInviteToken, urlInviteToken]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const search = window.location.search;
      const params = new URLSearchParams(search);
      const token = params.get('invite');
      if (token) {
        const trimmed = token.trim();
        setUrlInviteToken(trimmed);
        fetchInvite(trimmed);
      }
    } catch {
      // ignore malformed URL
    }
  }, [fetchInvite]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(INVITE_STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      list.forEach((token) => fetchInvite(token));
    } catch {
      // ignore
    }
  }, [fetchInvite]);

  useEffect(() => {
    if (activeInvite || invites.length === 0) return;
    setActiveInvite(invites[0]);
  }, [invites, activeInvite]);

  const loadProfile = useCallback(async (address: string) => {
    setProfileLoading(true);
    setProfileError('');
    try {
      const res = await fetch(apiUrl(`/api/beneficiaries/${address}/profile`));
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to load profile');
      }
      setProfile(data.beneficiary as BeneficiaryProfile);
    } catch (error: any) {
      setProfile(null);
      setProfileError(error?.message || String(error));
    } finally {
      setProfileLoading(false);
    }
  }, []);

  const loadModules = useCallback(async (address: string) => {
    setModulesLoading(true);
    setModulesError('');
    try {
      const res = await fetch(apiUrl(`/api/beneficiaries/${address}/modules`));
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || 'Failed to load inheritance plans');
      }
      const items: ModuleInfo[] = Array.isArray(data.items) ? data.items : [];
      setModules(items);
      setLastModulesRefresh(new Date().toISOString());
    } catch (error: any) {
      setModules([]);
      setModulesError(error?.message || String(error));
    } finally {
      setModulesLoading(false);
    }
  }, []);

  const bind = useCallback(
    async (inviteOverride?: InviteInfo | null) => {
      if (!ready) {
        setMsg(t('beneficiary_privy_initializing'));
        return false;
      }
      if (!authenticated || !embeddedWallet?.address) {
        setMsg(t('beneficiary_privy_login_required'));
        return false;
      }
      const inviteToUse = inviteOverride ?? activeInvite;
      const body = {
        address: embeddedWallet.address,
        email: email || undefined,
        phone: phone || undefined,
        inviteToken: inviteToUse?.token,
        invitedBy: inviteToUse?.inviterAddress,
      };
      setBindStatus('binding');
      setMsg(t('beneficiary_account_status_binding'));
      try {
        const res = await fetch(apiUrl('/api/beneficiaries/bind'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }).then((r) => r.json());
        if (!res?.ok) {
          throw new Error(res?.error || 'Bind failed');
        }
        setBindStatus('bound');
        setMsg(t('beneficiary_account_status_bound'));
        if (inviteToUse?.token) {
          forgetInviteToken(inviteToUse.token);
          setInvites((prev) => prev.filter((i) => i.token !== inviteToUse.token));
          setActiveInvite(null);
        }
        return true;
      } catch (error: any) {
        setBindStatus('error');
        setMsg(`${t('beneficiary_account_status_error')} ${error?.message || error}`);
        return false;
      }
    },
    [ready, authenticated, embeddedWallet?.address, activeInvite, email, forgetInviteToken, phone, t]
  );

  const acceptInvite = useCallback(
    async (invite: InviteInfo) => {
      if (!ready) {
        setMsg(t('beneficiary_privy_initializing'));
        return;
      }
      if (!authenticated) {
        setMsg(t('beneficiary_privy_login_required'));
        await login({ loginMethods: ['email', 'sms'] });
        return;
      }
      if (!embeddedWallet?.address) {
        setMsg(t('beneficiary_privy_missing_wallet'));
        return;
      }
      setActiveInvite(invite);
      const ok = await bind(invite);
      if (ok) {
        await Promise.all([loadProfile(embeddedWallet.address), loadModules(embeddedWallet.address)]);
      }
    },
    [ready, authenticated, embeddedWallet?.address, login, bind, loadProfile, loadModules, t]
  );

  useEffect(() => {
    if (!ready || !authenticated || !embeddedWallet?.address) return;
    loadProfile(embeddedWallet.address);
    loadModules(embeddedWallet.address);
  }, [ready, authenticated, embeddedWallet?.address, loadProfile, loadModules]);

  useEffect(() => {
    if (!ready || !authenticated || !embeddedWallet?.address) return;
    const fingerprint = JSON.stringify({
      address: embeddedWallet.address,
      email: email || null,
      phone: phone || null,
      invite: activeInvite?.token || null,
    });
    if (fingerprint === lastBindFingerprint.current) return;
    lastBindFingerprint.current = fingerprint;
    (async () => {
      const ok = await bind(activeInvite);
      if (ok) {
        await Promise.all([loadProfile(embeddedWallet.address), loadModules(embeddedWallet.address)]);
      } else {
        lastBindFingerprint.current = null;
      }
    })();
  }, [ready, authenticated, embeddedWallet?.address, email, phone, activeInvite, bind, loadProfile, loadModules]);

  useEffect(() => {
    if (selectableModules.length === 0) {
      setSelectedModuleAddress('');
      return;
    }
    setSelectedModuleAddress((prev) => {
      if (prev && selectableModules.some((item) => item.moduleAddress === prev)) {
        return prev;
      }
      return selectableModules[0].moduleAddress as string;
    });
  }, [selectableModules]);

  const selectedModule = useMemo(() => {
    if (!selectableModules.length) return null;
    if (!selectedModuleAddress) return selectableModules[0];
    return selectableModules.find((item) => item.moduleAddress === selectedModuleAddress) ?? selectableModules[0];
  }, [selectableModules, selectedModuleAddress]);

  // --- Funds & Transfer after inheritance ---
  const safeAddressReady = selectedModule?.safeAddress;

  const safeBalanceQuery = useQuery<number>({
    queryKey: ['safe-balance', safeAddressReady],
    enabled: !!safeAddressReady && selectedModule?.lifecycle?.state === 'INHERITED',
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
    enabled: !!safeAddressReady && selectedModule?.lifecycle?.state === 'INHERITED',
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
  const fundUsd = fundEth * (ethUsdQuery.data ?? 0);

  const [transferTo, setTransferTo] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const copySafeAddress = useCallback(async () => {
    if (!safeAddressReady) return;
    try {
      await navigator.clipboard.writeText(safeAddressReady);
      window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: '地址已复制', timeoutMs: 2000 } }));
    } catch {}
  }, [safeAddressReady]);

  const transferFromFund = useCallback(async () => {
    if (!selectedModule?.safeAddress) return;
    try {
      if (!ready) {
        window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: 'Privy 正在初始化，请稍候…', timeoutMs: 2500 } }));
        return;
      }
      if (!authenticated) {
        await login({ loginMethods: ['email', 'sms'] });
        return;
      }
      setIsTransferring(true);
      const to = transferTo.trim();
      const amount = transferAmount.trim();
      if (!to) {
        window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: '请输入目标地址', timeoutMs: 2500 } }));
        return;
      }
      if (!amount || Number(amount) <= 0) {
        window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: '请输入正确的金额（ETH）', timeoutMs: 2500 } }));
        return;
      }
      if (Number(amount) > (fundEth || 0)) {
        window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: '金额超过当前余额', timeoutMs: 2500 } }));
        return;
      }
      const provider = await embeddedWallet?.getEthereumProvider?.();
      if (!provider) {
        window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: '嵌入式钱包暂时不可用', timeoutMs: 2500 } }));
        return;
      }
      const expectedChainId = `0x${baseSepolia.id.toString(16)}`;
      const chainId = await provider.request({ method: 'eth_chainId' });
      if (chainId !== expectedChainId) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedChainId }],
          });
        } catch (switchErr: any) {
          if (switchErr?.code === 4902) {
            try {
              await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: expectedChainId,
                  chainName: 'Base Sepolia',
                  nativeCurrency: { name: 'Base Sepolia ETH', symbol: 'ETH', decimals: 18 },
                  rpcUrls: [import.meta.env.VITE_RPC_URL],
                  blockExplorerUrls: ['https://sepolia.basescan.org'],
                }],
              });
            } catch (addErr: any) {
              window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: `无法添加网络：${addErr?.message || addErr}`, timeoutMs: 3000 } }));
              return;
            }
          } else {
            window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: `请切换到 Base Sepolia：${switchErr?.message || switchErr}` , timeoutMs: 3000 } }));
            return;
          }
        }
      }
      const web3Provider = new ethers.providers.Web3Provider(provider);
      const signer = web3Provider.getSigner();
      const safeContract = new ethers.Contract(selectedModule.safeAddress, SAFE_ABI, signer);
      const owner = await signer.getAddress();
      const signature = '0x' + owner.toLowerCase().slice(2).padStart(64, '0') + '0'.repeat(64) + '01';
      const valueBN = ethers.utils.parseEther(amount || '0');

      let gasLimit: any;
      try {
        const estimatedGas = await safeContract.estimateGas.execTransaction(
          to,
          valueBN,
          '0x',
          0,
          0,
          0,
          0,
          ethers.constants.AddressZero,
          ethers.constants.AddressZero,
          signature
        );
        gasLimit = estimatedGas.mul(120).div(100);
      } catch (e: any) {
        gasLimit = ethers.BigNumber.from('300000');
      }

      const tx = await safeContract.execTransaction(
        to,
        valueBN,
        '0x',
        0,
        0,
        0,
        0,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        signature,
        { gasLimit }
      );
      const shortHash = tx.hash.length > 18 ? `${tx.hash.slice(0, 10)}…${tx.hash.slice(-4)}` : tx.hash;
      window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: `转账已提交：${shortHash}` , timeoutMs: 3000 } }));
      await safeBalanceQuery.refetch();
      setTransferAmount('');
    } catch (error: any) {
      window.dispatchEvent(new CustomEvent('fk:toast', { detail: { msg: error?.message || String(error), timeoutMs: 3200 } }));
    } finally {
      setIsTransferring(false);
    }
  }, [selectedModule?.safeAddress, ready, authenticated, login, embeddedWallet, transferTo, transferAmount, fundEth, safeBalanceQuery]);

  useEffect(() => {
    // clear any previously scheduled refresh
    if (autoRefreshTimeoutRef.current) {
      clearTimeout(autoRefreshTimeoutRef.current);
      autoRefreshTimeoutRef.current = null;
    }
    if (!walletAddress || !selectedModule?.lifecycle) return;
    const lc = selectedModule.lifecycle;
    let delayMs: number | null = null;
    if (lc.state === 'ALIVE' && (lc.secondsUntilHeartbeatExpires ?? 0) > 0) {
      delayMs = (lc.secondsUntilHeartbeatExpires ?? 0) * 1000 + 1000; // buffer 1s
    } else if (lc.state === 'CLAIM_PENDING' && (lc.secondsUntilClaimReady ?? 0) > 0) {
      delayMs = (lc.secondsUntilClaimReady ?? 0) * 1000 + 1000; // buffer 1s
    }
    if (delayMs && delayMs > 0) {
      autoRefreshTimeoutRef.current = window.setTimeout(() => {
        if (walletAddress) {
          loadModules(walletAddress);
        }
      }, delayMs);
    }
    return () => {
      if (autoRefreshTimeoutRef.current) {
        clearTimeout(autoRefreshTimeoutRef.current);
        autoRefreshTimeoutRef.current = null;
      }
    };
  }, [walletAddress, selectedModule?.moduleAddress, selectedModule?.lifecycle?.state, selectedModule?.lifecycle?.secondsUntilHeartbeatExpires, selectedModule?.lifecycle?.secondsUntilClaimReady, loadModules]);

  if (inviteAlreadyUsed) {
      return (
          <div className="card">
              <p>{t('invite_already_used')}</p>
          </div>
      );
  }

  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ marginBottom: 8 }}>
              {!ready && <span>{t('beneficiary_privy_initializing')}</span>}
              {ready && !authenticated && (
                <button className="btn btn-gold" onClick={() => login({ loginMethods: ['email', 'sms'] })}>
                  {t('beneficiary_login')}
                </button>
              )}
              {ready && authenticated && (
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                    {t('beneficiary_account_wallet')}: {walletAddress}
                  </span>
                  <button className="btn btn-gold" onClick={() => logout()}>{t('logout')}</button>
                </div>
              )}
            </div>

            {ready && authenticated && (
              <> 
                <div className="card">
                  <div className="section-title" style={{ marginBottom: 18 }}>{t('beneficiary_account_title')}</div>
                  {profileLoading && <div className="muted" style={{ marginBottom: 8}}>{t('beneficiary_loading_profile')}</div>}
                  {profileError && profileError.trim() !== 'NOT_FOUND' && <div className="muted" style={{ marginBottom: 8 }}>{profileError}</div>}
                  <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 0', minWidth: 420 }}>
                        <div className="muted" style={{ fontSize: 13 }}>{t('beneficiary_account_wallet')}</div>
                        <div style={{ whiteSpace: 'nowrap' }}>{walletAddress}</div>
                      </div>
                      {(email || phone) && (
                        <div style={{ flex: '0 0 auto', minWidth: 220 }}>
                          <div className="muted" style={{ fontSize: 13 }}>
                            {email ? t('beneficiary_account_email') : t('beneficiary_account_phone')}
                          </div>
                          <div style={{ whiteSpace: 'nowrap' }}>{email || phone}</div>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>

                {/* <div className="card">
                  <div className="section-title" style={{ marginBottom: 18 }}>{t('beneficiary_invitations_title')}</div>
                  {isLoadingInvite && <div className="muted" style={{ marginBottom: 8 }}>{t('beneficiary_loading_invite')}</div>}
                  {invites.length === 0 && !isLoadingInvite && (
                    <div className="muted">{t('beneficiary_invitations_empty')}</div>
                  )}
                  {invites.length > 0 && (
                    <div className="grid" style={{ gap: 8 }}>
                      {invites.map((invite) => (
                        <div key={invite.token} className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span className="muted" style={{ fontSize: 13 }}>
                              {t('invite_from')} {shortenAddress(invite.inviterAddress)}
                            </span>
                            <span className="muted" style={{ fontSize: 12 }}>
                              {t('beneficiary_invitations_token')}: {invite.token.slice(0, 8)}…
                            </span>
                          </div>
                          <button
                            className="btn btn-gold"
                            onClick={() => acceptInvite(invite)}
                            disabled={invite.status === 'ACCEPTED'}
                          >
                            {invite.status === 'ACCEPTED' ? t('status_accepted') : t('accept_invite')}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div> */}

                <div className="card">
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div className="section-title" style={{ marginBottom: 0 }}>{t('beneficiary_inheritance_title')}</div>
                    <button
                      className="btn"
                      onClick={() => walletAddress && loadModules(walletAddress)}
                      disabled={modulesLoading}
                    >
                      {modulesLoading ? t('beneficiary_refreshing') : t('beneficiary_inheritance_refresh')}
                    </button>
                  </div>
                  {modulesError && <div className="muted" style={{ marginBottom: 8 }}>{modulesError}</div>}
                  {!modulesLoading && selectableModules.length === 0 && (
                    <div className="muted">{t(profile?.invite?.status === 'ACCEPTED' ? 'beneficiary_inheritance_empty_invited' : 'beneficiary_inheritance_empty')}</div>
                  )}
                  {selectableModules.length > 0 && (
                    <>
                      {selectedModule && (
                        selectedModule.lifecycle?.state === 'ALIVE' ? (
                          <div className="muted" style={{ marginBottom: 12 }}>{t('beneficiary_inheritance_info')}</div>
                        ) : selectedModule.lifecycle?.state === 'EXPIRED' ? (
                          <div className="muted" style={{ marginBottom: 12 }}>{t('beneficiary_inheritance_info_claim')}</div>
                        ) : selectedModule.lifecycle?.state === 'CLAIM_PENDING' ? (
                          <div className="muted" style={{ marginBottom: 12 }}>{t('beneficiary_inheritance_info_challenge')}</div>
                        ) : null
                      )}
                      {selectableModules.length > 1 && (
                        <div className="form-row" style={{ marginBottom: 12 }}>
                          <label className="label" htmlFor="fk-plan-select">{t('beneficiary_inheritance_select')}</label>
                          <select
                            id="fk-plan-select"
                            className="input"
                            value={selectedModule?.moduleAddress ?? ''}
                            onChange={(e) => setSelectedModuleAddress(e.target.value)}
                          >
                            {selectableModules.map((plan) => (
                              <option key={plan.moduleAddress!} value={plan.moduleAddress!}>
                                {`${shortenAddress(plan.safeAddress)} · ${plan.lifecycle.state}`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {selectedModule && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {/* <div className="muted" style={{ fontSize: 13 }}>
                            {t('safe_address')}: {shortenAddress(selectedModule.safeAddress)} · {t('beneficiary_account_admin')}: {shortenAddress(selectedModule.ownerAddress)}
                          </div>
                          {lastModulesRefresh && (
                            <div className="muted" style={{ fontSize: 12 }}>
                              {t('beneficiary_inheritance_last_updated')}: {formatDateTime(lastModulesRefresh)}
                            </div>
                          )} */}
                          {selectedModule.lifecycle?.state === 'INHERITED' ? (
                            <>
                              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', marginTop: 8 }}>
                                <div className="card" style={{ background: 'rgba(218, 185, 116, 0.12)', display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start', padding: '10px 14px', borderColor: 'var(--fk-gold-2)' }}>
                                  <div className="label" style={{ margin: 0, color: 'var(--fk-gold-1)' }}>{lang === 'zh' ? '美元余额' : 'USD Balance'}</div>
                                  <div style={{ fontSize: 22, fontWeight: 700 }}>${(fundUsd || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                  <div className="muted" style={{ fontSize: 12 }}>{(fundEth || 0).toFixed(4)} ETH</div>
                                </div>
                              </div>



                              <div className="row" style={{ gap: 8, marginTop: 12 }}>
                                <input
                                  className="input"
                                  type="text"
                                  value={transferTo}
                                  onChange={(e) => setTransferTo(e.target.value)}
                                  placeholder={lang === 'zh' ? '转出到地址' : 'Recipient address'}
                                  style={{ flex: '2 1 auto' }}
                                />
                                <input
                                  className="input"
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  value={transferAmount}
                                  onChange={(e) => setTransferAmount(e.target.value)}
                                  placeholder={lang === 'zh' ? '数量（ETH）' : 'Amount (ETH)'}
                                  style={{ flex: '1 1 auto' }}
                                />
                                <button
                                  className="btn"
                                  type="button"
                                  onClick={() => setTransferAmount(((fundEth || 0)).toString())}
                                  style={{ flexShrink: 0, color: 'var(--fk-gold)', borderColor: 'var(--fk-gold-2)', background: 'transparent' }}
                                >
                                  Max
                                </button>
                                <button className="btn btn-gold" onClick={transferFromFund} disabled={isTransferring} style={{ flexShrink: 0 }}>
                                  {isTransferring ? (lang === 'zh' ? '转出中…' : 'Transferring…') : (lang === 'zh' ? '转出资金' : 'Transfer')}
                                </button>
                              </div>
                            </>
                          ) : (
                            <Claim
                              showOwnerCheckIn={false}
                              showCancel={false}
                              showReadStatus={false}
                              showFinalizeClaim={false}
                              initialModuleAddress={selectedModule.moduleAddress ?? undefined}
                              allowModuleInput={false}
                              minimal={true}
                              onRefresh={() => walletAddress && loadModules(walletAddress)}
                              refreshKey={`${selectedModule.moduleAddress ?? ''}:${selectedModule.lifecycle?.state ?? ''}:${lastModulesRefresh ?? ''}`}
                            />
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
  );
}

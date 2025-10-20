import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { deadmanSwitchAbi } from '../abi/deadmanSwitch';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { useI18n } from './i18n';

type StatusResult = {
  safe: string;
  Owner: string;
  beneficiary: string;
  lastCheckIn: number;
  heartbeatInterval: number;
  claimReadyAt: number;
};

type PrivyWallet = {
  address?: string;
  walletClientType?: string;
  type?: string;
  connectorType?: string;
  getEthereumProvider?: () => Promise<any>;
};

const secondsToDuration = (sec: number) => {
  if (sec <= 0 || !Number.isFinite(sec)) return '0s';
  const units = [
    { label: 'd', size: 86400 },
    { label: 'h', size: 3600 },
    { label: 'm', size: 60 },
    { label: 's', size: 1 },
  ];
  const parts: string[] = [];
  let remaining = sec;
  for (const unit of units) {
    if (remaining >= unit.size) {
      const count = Math.floor(remaining / unit.size);
      parts.push(`${count}${unit.label}`);
      remaining -= count * unit.size;
    }
  }
  return parts.join(' ') || '0s';
};

export default function Claim(props: { showOwnerCheckIn?: boolean; showStartClaim?: boolean; showFinalizeClaim?: boolean; showCancel?: boolean; showReadStatus?: boolean; initialModuleAddress?: string; allowModuleInput?: boolean; minimal?: boolean; onRefresh?: () => void; refreshKey?: any } = {}) {
  const { showOwnerCheckIn = true, showStartClaim = true, showFinalizeClaim = true, showCancel = true, showReadStatus = true, initialModuleAddress, allowModuleInput = true, minimal = false, onRefresh, refreshKey } = props;
  const [moduleAddress, setModuleAddress] = useState(initialModuleAddress || '');
  const [msg, setMsg] = useState('');
  const [status, setStatus] = useState<StatusResult | null>(null);
  const [isCalling, setIsCalling] = useState(false);
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { t } = useI18n();
  const [clock, setClock] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (initialModuleAddress && initialModuleAddress !== moduleAddress) {
      setModuleAddress(initialModuleAddress);
    }
  }, [initialModuleAddress, moduleAddress]);

  const embeddedWallet = useMemo<PrivyWallet | undefined>(
    () =>
      wallets.find((wallet) => {
        const w = wallet as any;
        return w?.walletClientType === 'privy' || w?.type === 'privy' || w?.connectorType === 'privy';
      }),
    [wallets]
  );

  const fetchStatus = useCallback(async () => {
    try {
      const target = moduleAddress.trim();
      if (!target) {
        setMsg(t('beneficiary_inheritance_start_hint_unconfigured'));
        return;
      }
      const client = createPublicClient({ chain: baseSepolia, transport: http(import.meta.env.VITE_RPC_URL) });
      const res = await client.readContract({
        address: target as `0x${string}`,
        abi: deadmanSwitchAbi as any,
        functionName: 'status',
        args: [],
      }) as readonly [
        `0x${string}`,
        `0x${string}`,
        `0x${string}`,
        bigint,
        bigint,
        bigint
      ];
      const [
        safeAddress,
        OwnerAddress,
        beneficiaryAddress,
        lastCheckIn,
        heartbeatInterval,
        claimReadyAt,
      ] = res;
      setStatus({
        safe: safeAddress,
        Owner: OwnerAddress,
        beneficiary: beneficiaryAddress,
        lastCheckIn: Number(lastCheckIn),
        heartbeatInterval: Number(heartbeatInterval),
        claimReadyAt: Number(claimReadyAt),
      });
      setMsg('');
    } catch (e: any) {
      setMsg(String(e?.message || e));
      setStatus(null);
    }
  }, [moduleAddress, t]);

  useEffect(() => {
    if (!moduleAddress) return;
    if (!allowModuleInput) {
      fetchStatus();
    }
  }, [moduleAddress, allowModuleInput, refreshKey, fetchStatus]);

  const call = useCallback(
    async (fn: 'startClaim' | 'finalizeClaim' | 'checkIn') => {
      console.log(`[Claim] Calling ${fn}`);
      try {
        const target = moduleAddress.trim();
        if (!target) {
          setMsg(t('beneficiary_inheritance_start_hint_unconfigured'));
          return;
        }
        if (!ready) {
          setMsg(t('beneficiary_privy_initializing'));
          return;
        }
        if (!authenticated) {
          console.log('[Claim] Not authenticated, showing login');
          await login({ loginMethods: ['email', 'sms'] });
          return;
        }
        if (!embeddedWallet?.address) {
          setMsg(t('beneficiary_privy_missing_wallet'));
          return;
        }
        const provider = await embeddedWallet.getEthereumProvider?.();
        if (!provider) {
          setMsg(t('claim_wallet_provider_missing'));
          return;
        }
        const chainId = await provider.request({ method: 'eth_chainId' });
        const expectedChainId = `0x${baseSepolia.id.toString(16)}`;
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
                  params: [
                    {
                      chainId: expectedChainId,
                      chainName: 'Base Sepolia',
                      nativeCurrency: { name: 'Base Sepolia ETH', symbol: 'ETH', decimals: 18 },
                      rpcUrls: [import.meta.env.VITE_RPC_URL],
                      blockExplorerUrls: ['https://sepolia.basescan.org'],
                    },
                  ],
                });
              } catch (addErr: any) {
                setMsg(`${t('claim_add_network_failed')} ${addErr?.message || addErr}`);
                return;
              }
            } else {
              setMsg(`${t('claim_switch_network')} ${switchErr?.message || switchErr}`);
              return;
            }
          }
        }
        setIsCalling(true);
        console.log('[Claim] Encoding transaction data');
        const { encodeFunctionData } = await import('viem');
        const data = encodeFunctionData({
          abi: deadmanSwitchAbi as any,
          functionName: fn,
          args: [],
        });
        console.log('[Claim] Sending transaction');
        const tx = await provider.request({
          method: 'eth_sendTransaction',
          params: [
            {
              from: embeddedWallet.address,
              to: target,
              data,
            },
          ],
        });
        const hash = typeof tx === 'string' ? tx : String(tx);
        const shortHash = hash.length > 18 ? `${hash.slice(0, 10)}…${hash.slice(-4)}` : hash;
        console.log('[Claim] Transaction sent:', hash);
        setMsg(`${t('claim_tx_sent')} ${shortHash}`);
        await fetchStatus();
      } catch (e: any) {
        console.error('[Claim] Error:', e);
        setMsg(String(e?.message || e));
      } finally {
        setIsCalling(false);
      }
    },
    [moduleAddress, t, ready, authenticated, login, embeddedWallet, fetchStatus]
  );

  const statusDetails = useMemo(() => {
    if (!status) return null;
    const now = Math.floor(Date.now() / 1000);
    const lastCheckInDate = status.lastCheckIn ? new Date(status.lastCheckIn * 1000).toLocaleString() : '—';
    const expiresAt = status.lastCheckIn ? status.lastCheckIn + status.heartbeatInterval : 0;
    const isExpired = expiresAt !== 0 && now > expiresAt;
    const expiredFor = isExpired ? secondsToDuration(now - expiresAt) : null;
    const expiresIn = !isExpired && expiresAt ? secondsToDuration(expiresAt - now) : '0s';
    const claimReadyAtDate = status.claimReadyAt ? new Date(status.claimReadyAt * 1000).toLocaleString() : null;
    const claimStarted = status.claimReadyAt !== 0;
    const canFinalize = claimStarted && now >= status.claimReadyAt;
    const claimReadyIn = claimStarted && !canFinalize ? secondsToDuration(status.claimReadyAt - now) : null;
    const alreadyInherited = status.Owner?.toLowerCase() === status.beneficiary?.toLowerCase();
    const canStart = !alreadyInherited && !claimStarted && isExpired;

    console.log('[Claim] Status details:', {
      now,
      expiresAt,
      isExpired,
      claimStarted,
      alreadyInherited,
      canStart,
      Owner: status.Owner,
      beneficiary: status.beneficiary,
    });
    const startDisabledReason = alreadyInherited
      ? t('beneficiary_inheritance_finalize_hint_inherited')
      : claimStarted
        ? t('beneficiary_inheritance_start_hint_pending')
        : !isExpired
          ? t('beneficiary_inheritance_start_hint_active')
          : '';
    const finalizeDisabledReason = alreadyInherited
      ? t('beneficiary_inheritance_finalize_hint_inherited')
      : !claimStarted
        ? t('beneficiary_inheritance_finalize_hint_inactive')
        : !canFinalize
          ? t('beneficiary_inheritance_finalize_hint_pending')
          : '';
    let lifecycleHint: string;
    if (alreadyInherited) {
      lifecycleHint = t('beneficiary_inheritance_finalize_hint_inherited');
    } else if (canFinalize) {
      lifecycleHint = t('claim_ready_to_finalize');
    } else if (claimStarted) {
      lifecycleHint = `${t('beneficiary_inheritance_finalize_hint_pending')}${claimReadyIn ? ` (${claimReadyIn})` : ''}`;
    } else if (isExpired) {
      lifecycleHint = `${t('claim_ready_to_start')}${expiredFor ? ` (${expiredFor})` : ''}`;
    } else {
      lifecycleHint = `${t('beneficiary_inheritance_start_hint_active')}${!isExpired && expiresAt ? ` (${secondsToDuration(expiresAt - now)})` : ''}`;
    }

    return {
      lastCheckInDate,
      expiresAtDate: expiresAt ? new Date(expiresAt * 1000).toLocaleString() : null,
      heartbeatDuration: secondsToDuration(status.heartbeatInterval),
      claimReadyAtDate,
      claimReadyIn,
      lifecycleHint,
      canStart,
      startDisabledReason,
      canFinalize,
      finalizeDisabledReason,
      alreadyInherited,
      expiresIn,
      isExpired,
    };
  }, [status, t, clock]);

  const minimalActive = minimal || (!!statusDetails && !statusDetails.isExpired && !statusDetails.canStart && !statusDetails.canFinalize);

  return (
    <div>
      {!minimalActive && (
        <div style={{ marginBottom: 12 }}>
          {!ready && <span>{t('beneficiary_privy_initializing')}</span>}
          {ready && !authenticated && (
            <button className="btn btn-gold" onClick={() => login({ loginMethods: ['email', 'sms'] })}>{t('claim_login_privy')}</button>
          )}
          {ready && authenticated && (
            <div className="row">
              <span>
                {t('claim_wallet_label')}: {embeddedWallet?.address
                  ? `${embeddedWallet.address.slice(0, 6)}...${embeddedWallet.address.slice(-4)}`
                  : t('claim_wallet_missing')}
              </span>
              <button className="btn btn-gold" onClick={() => logout()}>{t('logout')}</button>
            </div>
          )}
        </div>
      )}
      {!minimalActive && (
        allowModuleInput ? (
          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <div className="form-row">
              <label className="label">{t('module_address')}</label>
              <input className="input" value={moduleAddress} onChange={(e) => setModuleAddress(e.target.value)} placeholder="0x..." />
            </div>
          </div>
        ) : (
          moduleAddress && (
            <div className="muted" style={{ marginBottom: 8, fontSize: 13 }}>
              {t('module_address')}: {moduleAddress}
            </div>
          )
        )
      )}
      {statusDetails?.canFinalize && (
        <div className="muted" style={{ marginTop: 0 }}>
          {t('claim_finalize_intro')}
        </div>
      )}
      <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', gap: 12 }}>
        {showOwnerCheckIn && (
          <button className="btn btn-gold" onClick={() => call('checkIn')} disabled={isCalling}>{t('Owner_checkin')}</button>
        )}
        {!minimal && showStartClaim && statusDetails?.canStart && (
          <button className="btn btn-gold" onClick={() => call('startClaim')} disabled={isCalling}>
            {t('start_claim')}
          </button>
        )}
        {showFinalizeClaim && statusDetails?.canFinalize && (
          <button className="btn btn-gold" onClick={() => call('finalizeClaim')} disabled={isCalling}>
            {t('finalize_claim')}
          </button>
        )}
        {showReadStatus && (
          <button className="btn" onClick={async () => { await fetchStatus(); onRefresh?.(); }}>{t('read_status')}</button>
        )}
      </div>
      {status && statusDetails && (
        <div className="card" style={{ marginTop: 16, maxWidth: 720 }}>
          {minimalActive ? (
            <>
              {(!status || status.claimReadyAt === 0) && (
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="muted" style={{ fontSize: 12 }}>{t('claim_last_checkin')}</div>
                    <div style={{ fontWeight: 600 }}>{statusDetails.lastCheckInDate}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <div className="muted" style={{ fontSize: 12 }}>{t('claim_expires_at')}</div>
                    <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(5, 150, 105, 0.08)', color: 'rgb(5, 150, 105)', fontWeight: 600 }}>
                      {statusDetails.expiresIn}
                    </div>
                  </div>
                </div>
              )}
              {status && status.claimReadyAt !== 0 && (
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div className="muted" style={{ fontSize: 12 }}>{t('claim_ready_at')}</div>
                    <div style={{ fontWeight: 600 }}>{statusDetails.claimReadyAtDate}</div>
                  </div>
                  {!statusDetails.canFinalize && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                      <div className="muted" style={{ fontSize: 12 }}>{t('claim_challenge_remaining')}</div>
                      <div style={{ padding: '4px 10px', borderRadius: 8, background: 'rgba(218, 185, 116, 0.12)', color: 'rgb(218, 185, 116)', fontWeight: 600 }}>
                        {statusDetails.claimReadyIn}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {minimal && status && status.claimReadyAt !== 0 && !statusDetails.alreadyInherited && statusDetails.canFinalize && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-gold"
                    onClick={() => call('finalizeClaim')}
                    disabled={isCalling}
                  >
                    {t('finalize_claim')}
                  </button>
                </div>
              )}
              {minimal && showStartClaim && statusDetails?.canStart && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-gold" onClick={() => call('startClaim')} disabled={isCalling}>
                    {t('start_claim')}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <div><strong>{t('safe_address')}</strong>: {status.safe}</div>
              <div><strong>{t('claim_current_owner')}</strong>: {status.Owner}</div>
              <div><strong>{t('claim_beneficiary')}</strong>: {status.beneficiary}</div>
              <div><strong>{t('claim_last_checkin')}</strong>: {statusDetails.lastCheckInDate}</div>
              <div><strong>{t('claim_heartbeat_interval')}</strong>: {statusDetails.heartbeatDuration}</div>
              <div><strong>{t('claim_expires_at')}</strong>: {statusDetails.expiresAtDate ?? t('claim_heartbeat_active')}</div>
              <div><strong>{t('claim_ready_at')}</strong>: {statusDetails.claimReadyAtDate ?? t('claim_not_started')}</div>
              <div><strong>{t('claim_lifecycle_hint')}</strong>: {statusDetails.lifecycleHint}</div>
              {statusDetails.claimReadyIn && <div><strong>{t('claim_finalize_in')}</strong>: {statusDetails.claimReadyIn}</div>}
            </>
          )}
        </div>
      )}
      {msg && <div className="muted" style={{ marginTop: 12, fontSize: 12 }}>{msg}</div>}
    </div>
  );
}

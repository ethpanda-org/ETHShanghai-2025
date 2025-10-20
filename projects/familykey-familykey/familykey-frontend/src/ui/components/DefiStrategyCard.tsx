import { useCallback, useMemo, useState } from 'react';
import { ethers } from 'ethers';
import { VAULT_CONFIGS, type VaultProtocol } from '../../abi/vaults';

interface DefiStrategyCardProps {
  protocol: VaultProtocol;
  safeAddress: string;
  onDeposit: (protocol: VaultProtocol, amount: string) => Promise<void>;
  userBalance: number;
  userRewards: number;
  tvl: number;
  lang: 'en' | 'zh';
  disabled?: boolean;
  fundEth?: number;
}

export default function DefiStrategyCard({
  protocol,
  safeAddress,
  onDeposit,
  userBalance,
  userRewards,
  tvl,
  lang,
  disabled = false,
  fundEth = 0,
}: DefiStrategyCardProps) {
  const config = VAULT_CONFIGS[protocol];
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  const riskColor = useMemo(() => {
    switch (config.risk) {
      case 'low':
        return '#059669';
      case 'medium':
        return '#0891b2';
      case 'high':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  }, [config.risk]);

  const riskLabel = useMemo(() => {
    if (lang === 'zh') {
      return config.risk === 'low' ? '低风险' : config.risk === 'medium' ? '中风险' : '高风险';
    }
    return config.risk === 'low' ? 'Low Risk' : config.risk === 'medium' ? 'Medium Risk' : 'High Risk';
  }, [config.risk, lang]);

  const handleDeposit = useCallback(async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;
    setIsDepositing(true);
    try {
      await onDeposit(protocol, depositAmount);
      setDepositAmount('');
      setShowDepositModal(false);
    } catch (error) {
      console.error('Deposit failed:', error);
    } finally {
      setIsDepositing(false);
    }
  }, [depositAmount, onDeposit, protocol]);

  const fillMax = useCallback(() => {
    const amt = Math.max(0, fundEth || 0);
    if (amt > 0) {
      const formatted = amt.toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
      setDepositAmount(formatted);
    }
  }, [fundEth]);

  const renderRiskDots = () => {
    const dots = [];
    for (let i = 0; i < 5; i++) {
      dots.push(
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            backgroundColor: i < config.riskLevel ? riskColor : '#d1d5db',
            marginRight: 3,
          }}
        />
      );
    }
    return dots;
  };

  return (
    <>
      <div
        className="card"
        style={{
          background: disabled ? '#f9fafb' : 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
          border: `2px solid ${disabled ? '#e5e7eb' : config.color}20`,
          opacity: disabled ? 0.6 : 1,
          cursor: disabled ? 'not-allowed' : 'default',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = `0 12px 24px ${config.color}15`;
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }
        }}
      >
        {/* 装饰性渐变背景 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 150,
            height: 150,
            background: `radial-gradient(circle at top right, ${config.color}10, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* 顶部：协议名称 + 风险标签 */}
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="row" style={{ gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 28 }}>{config.logo}</span>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1f2937' }}>{config.name}</div>
              <div className="muted" style={{ fontSize: 12 }}>{config.symbol}</div>
            </div>
          </div>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              background: `${riskColor}15`,
              color: riskColor,
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: 'nowrap',
            }}
          >
            {riskLabel}
          </div>
        </div>

        {/* APY显示区域 */}
        <div
          className="card"
          style={{
            background: `linear-gradient(135deg, ${config.color}08, ${config.color}03)`,
            border: `1px solid ${config.color}20`,
            marginBottom: 16,
            textAlign: 'center',
            padding: '16px 12px',
          }}
        >
          <div className="label" style={{ marginBottom: 4, fontSize: 12 }}>
            {lang === 'zh' ? '年化收益率' : 'APY'}
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: config.color, lineHeight: 1 }}>
            {config.apy.toFixed(1)}%
          </div>
          {config.id === 'morpho' && (
            <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
              {lang === 'zh' ? '+ 早鸟奖励最高 1.2x' : '+ Early bird bonus up to 1.2x'}
            </div>
          )}
        </div>

        {/* 协议描述 */}
        <p className="muted" style={{ fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>
          {lang === 'zh' ? config.description : config.description}
        </p>

        {/* 特性标签 */}
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {config.features.map((feature) => (
            <span
              key={feature}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                background: '#f3f4f6',
                color: '#6b7280',
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              {feature}
            </span>
          ))}
        </div>

        {/* 用户余额信息 */}
        {userBalance > 0 && (
          <div
            className="card"
            style={{
              background: 'rgba(16, 185, 129, 0.06)',
              border: '1px solid rgba(16, 185, 129, 0.15)',
              marginBottom: 16,
              padding: '12px 14px',
            }}
          >
            <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
              <span className="label" style={{ fontSize: 12 }}>
                {lang === 'zh' ? '已存入' : 'Deposited'}
              </span>
              <span style={{ fontWeight: 700, color: '#059669' }}>{userBalance.toFixed(4)} ETH</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label" style={{ fontSize: 12 }}>
                {lang === 'zh' ? '已赚取' : 'Earned'}
              </span>
              <span style={{ fontWeight: 600, color: '#10b981' }}>+{userRewards.toFixed(6)} ETH</span>
            </div>
          </div>
        )}

        {/* 协议统计 */}
        <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <div>
            <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>
              {lang === 'zh' ? '风险评级' : 'Risk Level'}
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>{renderRiskDots()}</div>
          </div>
          <div>
            <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>TVL</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>${(tvl * 3500).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="row" style={{ gap: 8 }}>
          <button
            className="btn"
            onClick={() => setShowDepositModal(true)}
            disabled={disabled}
            style={{
              flex: 1,
              background: disabled ? '#d1d5db' : config.color,
              borderColor: config.color,
              color: '#fff',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {lang === 'zh' ? '存入' : 'Deposit'}
          </button>
          {userBalance > 0 && (
            <button className="btn" style={{ flex: 1 }} disabled={disabled}>
              {lang === 'zh' ? '提取' : 'Withdraw'}
            </button>
          )}
        </div>
      </div>

      {/* 存款Modal */}
      {showDepositModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'transparent',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowDepositModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: 480,
              width: '90%',
              background: '#fff',
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div className="section-title">
                {lang === 'zh' ? `存入到 ${config.name}` : `Deposit to ${config.name}`}
              </div>
              <button
                onClick={() => setShowDepositModal(false)}
                style={{
                  border: 0,
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: 24,
                  color: '#9ca3af',
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div
              className="card"
              style={{
                background: `${config.color}08`,
                border: `1px solid ${config.color}20`,
                marginBottom: 20,
                textAlign: 'center',
                padding: 16,
              }}
            >
              <div className="label" style={{ marginBottom: 8 }}>
                {lang === 'zh' ? '预期年化收益' : 'Expected APY'}
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: config.color }}>{config.apy.toFixed(1)}%</div>
            </div>

            <div className="form-row" style={{ marginBottom: 16 }}>
              <label className="label">{lang === 'zh' ? '存入金额 (ETH)' : 'Amount to Deposit (ETH)'}</label>
              <div className="row" style={{ alignItems: 'center', gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  style={{ fontSize: 18, flex: 1 }}
                />
                <button
                  type="button"
                  onClick={fillMax}
                  disabled={(fundEth || 0) <= 0}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${config.color}`,
                    background: '#fff',
                    color: config.color,
                    fontWeight: 600,
                  }}
                >
                  Max
                </button>
              </div>
            </div>

            <div className="muted" style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              <strong>{lang === 'zh' ? '说明:' : 'Note:'}</strong>{' '}
              {lang === 'zh'
                ? `资金将从家族基金 (${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}) 转入该协议进行收益投资。收益将实时累积，您可以随时提取本金和收益。`
                : `Funds will be transferred from the Family Fund (${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}) to this protocol for yield generation. Rewards accrue in real-time and you can withdraw anytime.`}
            </div>

            <div className="row" style={{ gap: 12 }}>
              <button className="btn" onClick={() => setShowDepositModal(false)} style={{ flex: 1 }}>
                {lang === 'zh' ? '取消' : 'Cancel'}
              </button>
              <button
                className="btn"
                onClick={handleDeposit}
                disabled={isDepositing || !depositAmount || parseFloat(depositAmount) <= 0}
                style={{
                  flex: 1,
                  background: config.color,
                  borderColor: config.color,
                  color: '#fff',
                }}
              >
                {isDepositing ? (lang === 'zh' ? '存入中...' : 'Depositing...') : lang === 'zh' ? '确认存入' : 'Confirm Deposit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

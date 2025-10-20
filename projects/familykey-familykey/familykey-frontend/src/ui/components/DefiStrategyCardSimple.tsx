import { useCallback, useMemo, useState, useEffect } from 'react';
import { VAULT_CONFIGS, type VaultProtocol } from '../../abi/vaults';

interface DefiStrategyCardSimpleProps {
  protocol: VaultProtocol;
  safeAddress: string;
  onDeposit: (protocol: VaultProtocol, amount: string) => Promise<void>;
  lang: 'en' | 'zh';
  externalOpenToken?: number;
  hideCardBody?: boolean;
  fundEth?: number;
}

export default function DefiStrategyCardSimple({
  protocol,
  safeAddress,
  onDeposit,
  lang,
  externalOpenToken,
  hideCardBody,
  fundEth = 0,
}: DefiStrategyCardSimpleProps) {
  const config = VAULT_CONFIGS[protocol];
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Open deposit modal when parent triggers token change
  useEffect(() => {
    if (externalOpenToken && externalOpenToken > 0) {
      setShowDepositModal(true);
    }
  }, [externalOpenToken]);

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
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: i < config.riskLevel ? riskColor : '#d1d5db',
            marginRight: 4,
          }}
        />
      );
    }
    return dots;
  };

  return (
    <>
      {!hideCardBody && (
        <div
          className="card"
          style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #fafafa 100%)',
          border: `2px solid ${config.color}20`,
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = `0 12px 24px ${config.color}25`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {/* 装饰性渐变背景 */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: 120,
            height: 120,
            background: `radial-gradient(circle at top right, ${config.color}12, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        {/* 协议名称和Logo */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{config.logo}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1f2937', marginBottom: 4 }}>{config.name}</div>
          <div className="muted" style={{ fontSize: 13 }}>{config.symbol}</div>
        </div>

        {/* APY显示 */}
        <div
          className="card"
          style={{
            background: `linear-gradient(135deg, ${config.color}10, ${config.color}05)`,
            border: `1px solid ${config.color}25`,
            marginBottom: 16,
            textAlign: 'center',
            padding: '20px 16px',
          }}
        >
          <div className="label" style={{ marginBottom: 6, fontSize: 12 }}>
            {lang === 'zh' ? '年化收益率' : 'APY'}
          </div>
          <div style={{ fontSize: 42, fontWeight: 800, color: config.color, lineHeight: 1 }}>
            {config.apy.toFixed(1)}%
          </div>
        </div>

        {/* 风险评级 */}
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: `${riskColor}08`,
              borderRadius: 10,
              border: `1px solid ${riskColor}20`,
            }}
          >
            <div>
              <div className="label" style={{ fontSize: 11, marginBottom: 4 }}>
                {lang === 'zh' ? '风险评级' : 'Risk Level'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>{renderRiskDots()}</div>
            </div>
            <div
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: `${riskColor}15`,
                color: riskColor,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {riskLabel}
            </div>
          </div>
        </div>

        {/* 存入按钮 */}
        <button
          className="btn"
          onClick={() => setShowDepositModal(true)}
          style={{
            width: '100%',
            background: config.color,
            borderColor: config.color,
            color: '#fff',
            fontSize: 16,
            fontWeight: 600,
            padding: '14px 20px',
          }}
        >
          {lang === 'zh' ? '存入资金' : 'Deposit'}
        </button>
      </div>
      )}

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
            zIndex: 3000,
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
            </div
>

            <div className="muted" style={{ fontSize: 13, marginBottom: 20, lineHeight: 1.6 }}>
              <strong>{lang === 'zh' ? '说明:' : 'Note:'}</strong>{' '}
              {lang === 'zh'
                ? `资金将从家庭基金 (${safeAddress.slice(0, 6)}...${safeAddress.slice(-4)}) 转入该协议进行收益投资。收益将实时累积，您可以随时提取本金和收益。`
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


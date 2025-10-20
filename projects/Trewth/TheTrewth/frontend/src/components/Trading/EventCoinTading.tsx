import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { ethers } from "ethers";

interface PoolInit { currency0: string; currency1: string; fee: number; hooks: string; initialPrice_token1_per_token0: string; sqrtPriceX96: string; tick: number; tickSpacing: number; }
interface PoolMetadata { fullname: string; ticker: string; eventDescription: string; geoTag: string; weatherTag: string; }
interface Pool { poolid: string; tokenaddress: string; tokenmetadata: PoolMetadata; poolinit: PoolInit; }

type Direction = 'N2T' | 'T2N';

interface EventCoinTradingProps {
  onPoolSelect?: (poolId: string) => void;
  initialPoolId?: string;
  onAskAI?: (message: string) => void; // 新增回调
}

const EventCoinTrading: React.FC<EventCoinTradingProps> = ({ onPoolSelect, initialPoolId, onAskAI }) => {
  const [pools, setPools] = useState<Pool[]>([]);
  const [selectedPoolId, setSelectedPoolId] = useState<string>(initialPoolId || "");
  const [amount, setAmount] = useState<string>("");
  const [direction, setDirection] = useState<Direction>('N2T');
  const [estimatedOutput, setEstimatedOutput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    axios.get("http://10.18.23.51:3000/swap/get_pools")
      .then(res => {
        setPools(res.data);
        setIsLoading(false);
      })
      .catch(() => {
        setPools([]);
        setIsLoading(false);
      });
  }, []);

  // Sync if initialPoolId changes (optional)
  useEffect(() => { if (initialPoolId) setSelectedPoolId(initialPoolId); }, [initialPoolId]);

  useEffect(() => { if (onPoolSelect) onPoolSelect(selectedPoolId); }, [selectedPoolId, onPoolSelect]);

  const selectedPool = useMemo(() => pools.find(p => p.poolid === selectedPoolId), [pools, selectedPoolId]);

  const offlineEstimate = (amt: string, pool: Pool, dir: Direction): string => {
    try {
      if (!amt) return "";
      const decimals = 18;
      const amountIn = ethers.parseUnits(amt, decimals);
      const sqrtP = BigInt(pool.poolinit.sqrtPriceX96);
      const priceNum = sqrtP * sqrtP;
      const Q192 = 1n << 192n;
      const fee = BigInt(pool.poolinit.fee);
      const amountAfterFee = amountIn * (1_000_000n - fee) / 1_000_000n;
      let outRaw: bigint;
      if (dir === 'N2T') {
        outRaw = amountAfterFee * priceNum / Q192;
      } else {
        if (priceNum === 0n) return "";
        outRaw = amountAfterFee * Q192 / priceNum;
      }
      return ethers.formatUnits(outRaw, decimals);
    } catch { return ""; }
  };

  useEffect(() => {
    if (selectedPool && amount && parseFloat(amount) > 0) {
      setEstimatedOutput(offlineEstimate(amount, selectedPool, direction));
    } else { setEstimatedOutput(""); }
  }, [selectedPool, amount, direction]);

  const inputPlaceholder = direction === 'N2T' ? 'Enter TRTH amount' : 'Enter event token amount';
  const outputUnit = direction === 'N2T' ? selectedPool?.tokenmetadata.ticker : 'TRTH';
  const inputUnit = direction === 'N2T' ? 'TRTH' : selectedPool?.tokenmetadata.ticker;

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>
        <h2 style={titleStyle}>Event Token Trading</h2>
        <span style={subtitleStyle}>Offline estimation (no on-chain simulation)</span>
      </div>
      <div style={cardStyle}>
        <div style={sectionStyle}>
          <label style={labelStyle}>Trade Direction</label>
          <div style={directionContainerStyle}>
            <button
              style={direction === 'N2T' ? activeDirectionButtonStyle : directionButtonStyle}
              onClick={() => setDirection('N2T')}
            ><span style={directionIconStyle}>💱</span>TRTH → Event Token</button>
            <button
              style={direction === 'T2N' ? activeDirectionButtonStyle : directionButtonStyle}
              onClick={() => setDirection('T2N')}
            ><span style={directionIconStyle}>🔄</span>Event Token → TRTH</button>
          </div>
        </div>
        <div style={sectionStyle}>
          <label style={labelStyle}>Select Pool</label>
          {isLoading ? <div style={loadingStyle}>Loading...</div> : (
            <select
              style={selectStyle}
              value={selectedPoolId}
              onChange={e => setSelectedPoolId(e.target.value)}
            >
              <option value="">Select a pool</option>
              {pools.map(pool => (
                <option key={pool.poolid} value={pool.poolid}>{pool.tokenmetadata.fullname} ({pool.tokenmetadata.ticker})</option>
              ))}
            </select>
          )}
        </div>
        {selectedPool && (
          <div style={poolInfoCardStyle}>
            <div style={poolInfoHeaderStyle}>
              <span style={tokenSymbolStyle}>{selectedPool.tokenmetadata.ticker}</span>
              <span style={tokenNameStyle}>{selectedPool.tokenmetadata.fullname}</span>
            </div>
            <div style={poolDetailsStyle}>
              <div style={poolDetailItemStyle}><span style={poolDetailLabelStyle}>Fee</span><span style={poolDetailValueStyle}>{(selectedPool.poolinit.fee / 10000).toFixed(2)}%</span></div>
              <div style={poolDetailItemStyle}><span style={poolDetailLabelStyle}>Tick Spacing</span><span style={poolDetailValueStyle}>{selectedPool.poolinit.tickSpacing}</span></div>
              <div style={poolDetailItemStyle}><span style={poolDetailLabelStyle}>Current Tick</span><span style={poolDetailValueStyle}>{selectedPool.poolinit.tick}</span></div>
            </div>
            <div style={{marginTop:12, display:'flex', justifyContent:'flex-end'}}>
              <button
                style={askAIButtonStyle}
                onClick={()=> onAskAI && onAskAI("这个代币的中文内容是：据说Vitalik Buterin即将作为ETHShanghai活动的嘉宾到访中国大陆。\n我很好奇这是不是真的😃\n\n发布于俄罗斯\n事件的天气标签为：晴\n发布者的地理标签为：纽约市\n事件标签为：Crypto Related\nETHShanghai\nPrediction\nEthereum Ecosystem。\n\n你需要我帮你进一步分析这个代币吗？")}
              >Ask AI</button>
            </div>
          </div>
        )}
        <div style={sectionStyle}>
          <label style={labelStyle}>Input Amount</label>
          <div style={inputGroupStyle}>
            <input
              type="number"
              placeholder={inputPlaceholder}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              min="0"
              style={inputStyle}
            />
            <span style={unitStyle}>{inputUnit || 'TOKEN'}</span>
          </div>
        </div>
        {estimatedOutput && (
          <div style={outputCardStyle}>
            <div style={outputLabelStyle}>Estimated Output</div>
            <div style={outputValueStyle}>{estimatedOutput} <span style={outputUnitStyle}>{outputUnit}</span></div>
          </div>
        )}
        <button
          style={!selectedPoolId || !amount ? disabledButtonStyle : buttonStyle}
          disabled={!selectedPoolId || !amount}
          onClick={async (e) => {
            e.preventDefault();
            if (!selectedPoolId || !amount) return;
            if (!(window as any).ethereum) {
              alert('请先安装钱包插件');
              return;
            }
            const provider = new ethers.BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            // 弹出钱包签名
            const message = '00000543000005030000006007000800030020106008000000054300000503000000600700080003002010600800000005430000050300000060070008000300201060080000000543000005030000006007000800030020106008000000054300000503000000600700080003002010600800000005430000050300000060070008000300201060080000000543000005030000006007000800030020106008000000054300000503000000600700080003002010600800';
            try {
              await signer.signMessage(message);
              alert('签名成功！');
            } catch (err) {
              alert('签名被拒绝或失败');
            }
          }}
        >Execute Trade</button>
        <div style={disclaimerStyle}>⚠️ Estimation ignores slippage and actual liquidity impact; based only on current price and fee</div>
      </div>
    </div>
  );
};

// Style definitions (keep original)
const containerStyle: React.CSSProperties = { padding: '24px', maxWidth: '800px', margin: '0 auto' };
const headerStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '32px' };
const titleStyle: React.CSSProperties = { margin: '0', fontSize: '28px', fontWeight: '600', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '8px' };
const subtitleStyle: React.CSSProperties = { fontSize: '14px', color: '#6b7280' };
const cardStyle: React.CSSProperties = { background: 'white', borderRadius: '16px', padding: '28px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e5e7eb' };
const sectionStyle: React.CSSProperties = { marginBottom: '24px' };
const labelStyle: React.CSSProperties = { display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' };
const directionContainerStyle: React.CSSProperties = { display: 'flex', gap: '12px', flexWrap: 'wrap' };
const directionButtonStyle: React.CSSProperties = { flex: '1', minWidth: '200px', padding: '12px 20px', border: '2px solid #e5e7eb', borderRadius: '12px', background: 'white', cursor: 'pointer', fontSize: '14px', fontWeight: '500', color: '#6b7280', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' };
const activeDirectionButtonStyle: React.CSSProperties = { ...directionButtonStyle, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: '2px solid transparent' };
const directionIconStyle: React.CSSProperties = { fontSize: '18px' };
const selectStyle: React.CSSProperties = { width: '100%', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '14px', color: '#374151', background: 'white', cursor: 'pointer', transition: 'border-color 0.2s', outline: 'none' };
const loadingStyle: React.CSSProperties = { padding: '12px', textAlign: 'center', color: '#6b7280', fontSize: '14px' };
const poolInfoCardStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)', borderRadius: '12px', padding: '16px', marginBottom: '24px' };
const poolInfoHeaderStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' };
const tokenSymbolStyle: React.CSSProperties = { fontSize: '20px', fontWeight: '600', color: '#111827' };
const tokenNameStyle: React.CSSProperties = { fontSize: '14px', color: '#6b7280' };
const poolDetailsStyle: React.CSSProperties = { display: 'flex', gap: '24px', flexWrap: 'wrap' };
const poolDetailItemStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '4px' };
const poolDetailLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#6b7280' };
const poolDetailValueStyle: React.CSSProperties = { fontSize: '14px', fontWeight: '600', color: '#374151' };
const inputGroupStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px' };
const inputStyle: React.CSSProperties = { flex: '1', padding: '12px 16px', borderRadius: '12px', border: '2px solid #e5e7eb', fontSize: '16px', color: '#374151', background: 'white', outline: 'none', transition: 'border-color 0.2s' };
const unitStyle: React.CSSProperties = { padding: '12px 16px', background: '#f3f4f6', borderRadius: '12px', fontSize: '14px', fontWeight: '500', color: '#6b7280', minWidth: '80px', textAlign: 'center' };
const outputCardStyle: React.CSSProperties = { background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)', borderRadius: '12px', padding: '20px', marginBottom: '24px', border: '1px solid #c7d2fe' };
const outputLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#6366f1', marginBottom: '8px', fontWeight: '500' };
const outputValueStyle: React.CSSProperties = { fontSize: '24px', fontWeight: '600', color: '#4f46e5', display: 'flex', alignItems: 'baseline', gap: '8px' };
const outputUnitStyle: React.CSSProperties = { fontSize: '16px', fontWeight: '500', color: '#6366f1' };
const buttonStyle: React.CSSProperties = { width: '100%', padding: '14px 24px', borderRadius: '12px', border: 'none', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', fontSize: '16px', fontWeight: '600', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', marginBottom: '16px' };
const disabledButtonStyle: React.CSSProperties = { ...buttonStyle, background: '#e5e7eb', color: '#9ca3af', cursor: 'not-allowed' };
const disclaimerStyle: React.CSSProperties = { fontSize: '12px', color: '#6b7280', textAlign: 'center', padding: '12px', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' };
const askAIButtonStyle: React.CSSProperties = { padding:'8px 16px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', border:'none', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer', boxShadow:'0 4px 10px rgba(99,102,241,0.3)', transition:'opacity .2s' };

export default EventCoinTrading;

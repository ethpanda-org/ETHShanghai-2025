// TokenMetadata.tsx (修复版)
import React, { useState, useEffect, FormEvent } from 'react';
import { ethers } from 'ethers';

interface BackendTxPayload {
  to: string;
  data: string;
  value?: string;
  chainId?: number;
  gasLimit?: string;
  gas?: string;
  gasPrice?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  nonce?: number;
  from?: string;
}

interface BackendResponse {
  ok?: boolean;
  tx?: BackendTxPayload;
  txHash?: string;
  error?: string;
  message?: string;
  debug_info?: any;
}

const EVENT_TYPE_OPTIONS = [
  'Crypto Related',
  'Prediction',
  'RWA',
  'Layer1',
  'ETHShanghai',
  'HashKey Chain',
  'Tokenization',
  'PANews',
  'Ethereum Ecosystem',
  'Hackathon',
  'Sponsors',
];

const TokenMetadataForm: React.FC = () => {
  // 基础元数据字段
  const [geoTag, setGeoTag] = useState('');
  const [weatherTag, setWeatherTag] = useState('');
  const [eventTypes, setEventTypes] = useState<string[]>(['Crypto Related','Prediction','RWA','Layer1']);
  const [eventDescription, setEventDescription] = useState('');
  const [supplementLink, setSupplementLink] = useState('');
  const [eventTime, setEventTime] = useState<number>(Math.floor(Date.now()/1000));
  const [fullname, setFullname] = useState('');
  const [ticker, setTicker] = useState('');

  // 新增：合约参数
  const [fee, setFee] = useState<number>(3000); // 默认 0.3%
  const [tokensPerNativeE18, setTokensPerNativeE18] = useState<number>(1); // 每 ETH 的代币数量
  const [nativeLiquidityWei, setNativeLiquidityWei] = useState<string>('0.1'); // ETH 数量

  // 钱包状态
  const [walletAddress, setWalletAddress] = useState('');
  const [connecting, setConnecting] = useState(false);

  // UI 状态
  const [status, setStatus] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [backendData, setBackendData] = useState<any>(null);

  // 自动更新时间戳
  useEffect(() => {
    const id = setInterval(() => setEventTime(Math.floor(Date.now()/1000)), 30000);
    return () => clearInterval(id);
  }, []);

  // 自动连接钱包（可选）
  useEffect(() => {
    checkWalletConnection();
  }, []);

  const checkWalletConnection = async () => {
    if (!(window as any).ethereum) return;

    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_accounts', []);
      if (accounts && accounts.length > 0) {
        setWalletAddress(ethers.getAddress(accounts[0]));
      }
    } catch (error) {
      console.log('自动连接钱包失败:', error);
    }
  };

  const handleEventTypeChange = (idx: number, val: string) => {
    const copy = [...eventTypes];
    copy[idx] = val;
    setEventTypes(copy);
  };

  const validate = (): string | null => {
    if (!walletAddress) return 'Please connect wallet first';
    if (!fullname.trim()) return 'Full name required';
    if (!ticker.trim()) return 'Ticker required';
    if (!geoTag.trim()) return 'geoTag required';
    if (!weatherTag.trim()) return 'weatherTag required';
    if (!eventDescription.trim()) return 'Event description required';
    if (!supplementLink.trim()) return 'Supplement link required';
    if (eventTypes.length !== 4) return 'Exactly 4 eventTypes required';
    if (new Set(eventTypes).size !== 4) return 'eventTypes must be unique';
    if (fee < 0 || fee > 10000) return 'Fee must be between 0 and 10000';
    if (tokensPerNativeE18 <= 0) return 'Tokens per ETH must be > 0';
    if (!nativeLiquidityWei || parseFloat(nativeLiquidityWei) <= 0) return 'Liquidity amount must be > 0';
    return null;
  };

  // ====== 新增：链ID强校验 ======
  const TARGET_CHAIN_ID = 40444; // 本地链ID（请与你本地节点一致，类型为number）

  // 连接钱包
  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      setStatus('Wallet extension not detected');
      return;
    }
    try {
      setConnecting(true);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const net = await provider.getNetwork();
      console.log('当前钱包 chainId:', net.chainId); // 调试输出
      if (Number(net.chainId) !== TARGET_CHAIN_ID) {
        setStatus(`当前链ID为${net.chainId}，请在钱包切换到本地链（chainId=${TARGET_CHAIN_ID}）`);
        setConnecting(false);
        return;
      }
      if (accounts && accounts.length > 0) {
        setWalletAddress(ethers.getAddress(accounts[0]));
        setStatus('Wallet connected');
      } else {
        setStatus('No account found');
      }
    } catch (e: any) {
      setStatus('Connect failed: ' + (e.message || e.toString()));
    } finally {
      setConnecting(false);
    }
  };

  // 发送到后端
  const submitToBackend = async (): Promise<BackendResponse> => {
    const payload = {
      geoTag,
      weatherTag,
      eventTypes,
      eventDescription,
      supplementLink,
      eventTime,
      fullname,
      ticker,
      walletAddress,
      fee,
      tokensPerNativeE18: tokensPerNativeE18 * 10 ** 18, // 转换为 wei 精度
      nativeLiquidityWei: ethers.parseEther(nativeLiquidityWei).toString(), // 转换为 wei
      chainId: TARGET_CHAIN_ID // 明确传递
    };

    console.log('Payload to backend:', payload);

    const resp = await fetch('http://127.0.0.1:5000/tx_transfer/token_launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!resp.ok) {
      throw new Error(`HTTP error! status: ${resp.status}`);
    }

    return resp.json();
  };

  const signAndSendIfNeeded = async (tx: BackendTxPayload) => {
    if (!(window as any).ethereum) {
      throw new Error('No wallet detected, cannot sign');
    }
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const signer = await provider.getSigner();
    const net = await provider.getNetwork();
    console.log('签名前钱包 chainId:', net.chainId); // 调试输出
    if (Number(net.chainId) !== TARGET_CHAIN_ID) {
      throw new Error(`钱包当前链ID为${net.chainId}，需切换到本地链（${TARGET_CHAIN_ID}）`);
    }
    if (tx.chainId && Number(tx.chainId) !== TARGET_CHAIN_ID) {
      throw new Error(`后端返回chainId=${tx.chainId}，与本地链不符`);
    }
    const currentAddr = (await signer.getAddress()).toLowerCase();
    if (tx.from && tx.from.toLowerCase() !== currentAddr) {
      throw new Error(`Address mismatch: backend ${tx.from}, current wallet ${currentAddr}`);
    }
    const request: any = {
      to: tx.to,
      data: tx.data,
      value: tx.value || '0x0',
      chainId: TARGET_CHAIN_ID
    };
    if (tx.gasLimit) request.gasLimit = tx.gasLimit;
    else if (tx.gas) request.gasLimit = tx.gas;
    if (tx.gasPrice) request.gasPrice = tx.gasPrice;
    else {
      if (tx.maxFeePerGas) request.maxFeePerGas = tx.maxFeePerGas;
      if (tx.maxPriorityFeePerGas) request.maxPriorityFeePerGas = tx.maxPriorityFeePerGas;
    }
    if (typeof tx.nonce === 'number') request.nonce = tx.nonce;
    console.log('发送交易:', request); // 调试输出
    const sent = await signer.sendTransaction(request);
    return sent.hash;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    // ====== 新增：链ID校验 ======
    if (!(window as any).ethereum) {
      setStatus('No wallet');
      return;
    }
    const provider = new ethers.BrowserProvider((window as any).ethereum);
    const net = await provider.getNetwork();
    console.log('提交前钱包 chainId:', net.chainId); // 调试输出
    if (Number(net.chainId) !== TARGET_CHAIN_ID) {
      setStatus(`链不匹配(当前${net.chainId} != 期望${TARGET_CHAIN_ID})，请在钱包切换网络`);
      return;
    }

    // 如果没有连接钱包，先连接
    if (!walletAddress) {
      await connectWallet();
      return;
    }

    setStatus('');
    setTxHash('');
    setBackendData(null);

    const err = validate();
    if (err) {
      setStatus('校验失败: ' + err);
      return;
    }

    setSubmitting(true);
    setStatus('Submitting to backend...');

    try {
      const res = await submitToBackend();
      setBackendData(res);

      console.log('后端响应:', res);

      if (!res.ok) {
        setStatus('Backend failed: ' + (res.error || res.message || 'Unknown error'));
        return;
      }
      if (res.txHash) {
        setStatus('Backend already broadcast');
        setTxHash(res.txHash);
        return;
      }
      if (res.tx) {
        setStatus('Received tx to sign, invoking wallet...');
        try {
          const hash = await signAndSendIfNeeded(res.tx);
          setTxHash(hash);
          setStatus('Transaction sent, awaiting confirmation');
        } catch (signErr: any) {
          console.error('Sign error:', signErr);
          setStatus('Sign/Send failed: ' + (signErr.shortMessage || signErr.message || signErr.toString()));
        }
      } else {
        setStatus('Success but no tx data returned');
      }
    } catch (ex: any) {
      console.error('请求错误:', ex);
      setStatus('Request error: ' + (ex.message || ex.toString()));
    } finally {
      setSubmitting(false);
    }
  };

  return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '40px 20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <form onSubmit={handleSubmit} style={{
          maxWidth: 900,
          width: '100%',
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
          padding: '40px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
            <h2 style={{
              fontSize: '32px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              margin: 0
            }}>Event Token Launch</h2>

            {/* 钱包状态显示 */}
            <div style={{
              padding: '8px 16px',
              background: walletAddress ? '#f0fdf4' : '#fef3f2',
              border: `2px solid ${walletAddress ? '#bbf7d0' : '#fecaca'}`,
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              color: walletAddress ? '#16a34a' : '#dc2626'
            }}>
              {walletAddress ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : 'Wallet disconnected'}
            </div>
          </div>

          {/* 基础信息网格 */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px'}}>
            <div>
              <label style={labelStyle}>Token Full Name</label>
              <input
                  value={fullname}
                  onChange={e => setFullname(e.target.value)}
                  required
                  placeholder="Enter token full name"
                  style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Token Ticker</label>
              <input
                  value={ticker}
                  onChange={e => setTicker(e.target.value)}
                  required
                  placeholder="Enter ticker symbol"
                  style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Geographic Location</label>
              <input
                  value={geoTag}
                  onChange={e => setGeoTag(e.target.value)}
                  required
                  placeholder="e.g., New York, USA"
                  style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Weather Condition</label>
              <input
                  value={weatherTag}
                  onChange={e => setWeatherTag(e.target.value)}
                  required
                  placeholder="e.g., Sunny, Rainy"
                  style={inputStyle}
              />
            </div>
          </div>

          {/* 合约参数网格 */}
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginTop: '24px'}}>
            <div>
              <label style={labelStyle}>Fee (bps)</label>
              <input
                  type="number"
                  value={fee}
                  onChange={e => setFee(Number(e.target.value))}
                  required
                  placeholder="3000 = 0.3%"
                  style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Tokens per ETH</label>
              <input
                  type="number"
                  value={tokensPerNativeE18}
                  onChange={e => setTokensPerNativeE18(Number(e.target.value))}
                  required
                  placeholder="10000"
                  style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Liquidity (ETH)</label>
              <input
                  type="number"
                  step="0.001"
                  value={nativeLiquidityWei}
                  onChange={e => setNativeLiquidityWei(e.target.value)}
                  required
                  placeholder="0.1"
                  style={inputStyle}
              />
            </div>
          </div>

          {/* Event Categories */}
          <div style={sectionStyle}>
            <h3 style={sectionTitleStyle}>Event Categories (Select 4)</h3>
            <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px'}}>
              {Array.from({length: 4}).map((_, i) => (
                  <select
                      key={i}
                      value={eventTypes[i]}
                      onChange={e => handleEventTypeChange(i, e.target.value)}
                      style={selectStyle}
                  >
                    {EVENT_TYPE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
              ))}
            </div>
          </div>

          {/* Event Description */}
          <div style={{marginTop: '24px'}}>
            <label style={labelStyle}>Event Description</label>
            <textarea
                rows={4}
                value={eventDescription}
                onChange={e => setEventDescription(e.target.value)}
                placeholder="Provide a detailed description of the event..."
                style={{...inputStyle, fontFamily: 'inherit'}}
            />
          </div>

          {/* Supplement Link */}
          <div style={{marginTop: '20px'}}>
            <label style={labelStyle}>Supplement Link</label>
            <input
                value={supplementLink}
                onChange={e => setSupplementLink(e.target.value)}
                placeholder="https://example.com/details"
                style={inputStyle}
            />
          </div>

          {/* Event Time */}
          <div style={{marginTop: '20px'}}>
            <label style={labelStyle}>Event Time</label>
            <input
                value={new Date(eventTime * 1000).toLocaleString()}
                readOnly
                style={{...inputStyle, background: '#f7fafc', color: '#718096'}}
            />
          </div>

          {/* 提交按钮 */}
          <button
              type='submit'
              disabled={submitting || connecting}
              style={buttonStyle(submitting || connecting, !!walletAddress)}
          >
            {submitting ? 'Submitting...' :
                connecting ? 'Connecting...' :
                    walletAddress ? 'Launch Token' : 'Connect Wallet & Launch'}
          </button>

          {/* 状态显示 */}
          {(status || txHash || backendData) && (
              <div style={statusStyle(status)}>
                {status && (
                    <div style={statusTextStyle(status)}>
                      Status: {status}
                    </div>
                )}
                {txHash && (
                    <div style={{marginTop: '8px', fontSize: '14px', color: '#4a5568'}}>
                      Transaction Hash: <span style={hashStyle}>{txHash}</span>
                    </div>
                )}
                {backendData && (
                    <pre style={debugStyle}>
                {JSON.stringify(backendData, null, 2)}
              </pre>
                )}
              </div>
          )}

          {/* 说明 */}
          <div style={noteStyle}>
            <p><strong>Note:</strong> This form will create a new Event Token and add liquidity. A wallet signature is required.</p>
            <p>Ensure the wallet has enough ETH for gas and supplied liquidity.</p>
          </div>
        </form>
      </div>
  );
};

// 样式常量
const labelStyle = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: '600',
  color: '#4a5568'
};

const inputStyle = {
  width: '100%',
  padding: '12px 16px',
  border: '2px solid #e2e8f0',
  borderRadius: '10px',
  fontSize: '16px',
  transition: 'all 0.3s ease',
  outline: 'none',
  boxSizing: 'border-box' as const
};

const sectionStyle = {
  marginTop: '24px',
  padding: '20px',
  background: 'linear-gradient(135deg, #f6f8fb 0%, #f0f4f8 100%)',
  borderRadius: '12px',
  border: '2px solid #e2e8f0'
};

const sectionTitleStyle = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#4a5568',
  marginBottom: '16px'
};

const selectStyle = {
  padding: '10px 12px',
  border: '2px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '14px',
  background: 'white',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  outline: 'none'
};

const buttonStyle = (disabled: boolean, walletConnected: boolean) => ({
  marginTop: '32px',
  width: '100%',
  padding: '14px 24px',
  background: disabled ? '#cbd5e0' :
      (walletConnected ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)'),
  color: 'white',
  border: 'none',
  borderRadius: '10px',
  fontSize: '16px',
  fontWeight: '600',
  cursor: disabled ? 'not-allowed' : 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: disabled ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
});

const statusStyle = (status: string) => {
  const lower = status.toLowerCase();
  const isErr = lower.includes('fail') || lower.includes('error');
  return {
    marginTop: '24px',
    padding: '20px',
    background: isErr ? '#fef2f2' : '#f0fdf4',
    borderRadius: '10px',
    border: `2px solid ${isErr ? '#fecaca' : '#bbf7d0'}`
  };
};

const statusTextStyle = (status: string) => {
  const lower = status.toLowerCase();
  const isErr = lower.includes('fail') || lower.includes('error');
  return {
    fontSize: '14px',
    color: isErr ? '#dc2626' : '#16a34a',
    fontWeight: '500'
  };
};

const hashStyle = {
  fontFamily: 'monospace',
  background: '#e2e8f0',
  padding: '2px 6px',
  borderRadius: '4px',
  wordBreak: 'break-all' as const
};

const debugStyle = {
  marginTop: '12px',
  background: 'white',
  padding: '12px',
  borderRadius: '8px',
  overflow: 'auto',
  maxHeight: '200px',
  fontSize: '12px',
  color: '#4a5568',
  border: '1px solid #e2e8f0'
};

const noteStyle = {
  marginTop: '24px',
  padding: '16px',
  background: '#f7fafc',
  borderRadius: '10px',
  borderLeft: '4px solid #667eea'
};

export default TokenMetadataForm;


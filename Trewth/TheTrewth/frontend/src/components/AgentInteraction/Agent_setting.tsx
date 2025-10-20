import React, { useCallback, useEffect, useRef, useState } from 'react';

interface AgentSettingProps { balance?: number; setBalance?: (v:number)=>void; onDemoFeedStart?: (messages:string[])=>void; onDemoFeedStop?: ()=>void }

// 与 TokenMetadata 中的 EVENT_TYPE_OPTIONS 保持一致
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
  'Sponsors'
];

// 样式常量（复用 TokenMetadata 风格）
const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '8px',
  fontSize: '14px',
  fontWeight: 600,
  color: '#4a5568'
};

const sectionStyle: React.CSSProperties = {
  marginTop: '24px',
  padding: '20px',
  background: 'linear-gradient(135deg, #f6f8fb 0%, #f0f4f8 100%)',
  borderRadius: '12px',
  border: '2px solid #e2e8f0'
};

const toggleWrapper: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginTop: '12px'
};

const chipStyle = (active: boolean): React.CSSProperties => ({
  padding: '6px 12px',
  borderRadius: '20px',
  fontSize: '13px',
  fontWeight: 500,
  cursor: 'pointer',
  background: active ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#edf2f7',
  color: active ? '#fff' : '#4a5568',
  border: active ? '1px solid #6366f1' : '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  userSelect: 'none'
});

const statusBadge = (on: boolean): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 12,
  background: on ? '#f0fdf4' : '#fef2f2',
  color: on ? '#15803d' : '#b91c1c',
  border: `1px solid ${on ? '#bbf7d0' : '#fecaca'}`
});

const switchContainer: React.CSSProperties = {
  position: 'relative',
  width: 48,
  height: 26,
  background: '#cbd5e1',
  borderRadius: 26,
  cursor: 'pointer',
  transition: 'all .25s',
  flexShrink: 0
};

const knobBase: React.CSSProperties = {
  position: 'absolute',
  top: 3,
  left: 3,
  width: 20,
  height: 20,
  borderRadius: '50%',
  background: '#fff',
  boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
  transition: 'all .25s'
};

const buttonPrimary = (disabled: boolean): React.CSSProperties => ({
  marginTop: '28px',
  width: '100%',
  padding: '14px 24px',
  background: disabled ? '#cbd5e0' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontSize: 16,
  fontWeight: 600,
  cursor: disabled ? 'not-allowed' : 'pointer',
  boxShadow: disabled ? 'none' : '0 4px 15px rgba(102,126,234,0.4)',
  transition: 'all .3s'
});

const tooltipStyle: React.CSSProperties = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center'
};

const tooltipBubble: React.CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 6,
  background: '#1a202c',
  color: '#fff',
  fontSize: 12,
  padding: '6px 10px',
  borderRadius: 6,
  boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
  whiteSpace: 'nowrap',
  zIndex: 20
};

// 新增缺失标题样式
const sectionTitleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: 600,
  color: '#4a5568',
  marginBottom: '16px'
};

// WebSocket 演示消息移到组件外，避免重复创建导致 useEffect 依赖警告
const DEMO_FEED_MESSAGES = [
  "这个代币的中文内容是：我们很高兴邀请到 @ezklxyz 的优秀开发者 @henlojseam 加入，成为 #ETHShanghai 2025 黑客松的导师之一！\n\n他精通 Rust、Solidity、OCaml、JavaScript、C++ 等多种技术。如果大家在这些领域遇到问题，相信他会非常乐意提供指导～\n\nETHShanghai 2025 黑客松\n2025 年 10 月 18 日 – 21 日\n中国·上海\n\n发布于英语\n事件的天气标签为：晴\n发布者的地理标签为：上海\n事件标签为：ETHShanghai\nHackathon\nEthereum Ecosystem\nSponsors。\n\n你需要我帮你进一步分析这个代币吗？",
  "这个代币的中文内容是：Lumiterra的主网上线进度与Monad完美同步——两者预计将同时启动。\n\n▰▰▰▰▰▰\n\nLumiterra成立于2023年，是一支实力雄厚的团队，曾赢得ETHShanghai 2023黑客松，展现了强大的技术深度。\n\n与典型的区块链游戏不同，Lumiterra以其创新性地融合AI技术而脱颖而出。它使用机器学习算法，将玩家行为——例如耕种路线、战斗策略和交易偏好——转化为自主的链上AI智能体。\n\n这些智能体在一个持续的“感知-思考-行动-学习”循环中运作。\n\n这种模式可能代表了区块链游戏的未来方向。\n有了AI的参与，游戏玩法变得更加引人入胜和不可预测，从而提高了玩家的沉浸感和留存率。\n\n对于创作者和玩家来说，加入@LumiterraGame或许也是一个赚取代币奖励，同时为这个新兴生态系统做出贡献的好机会。\n\n发布于英语\n事件的天气标签为：雨\n发布者的地理标签为：新加坡\n事件标签为：ETHShanghai\nLayer1\nPrediction\nCrypto Related。\n\n你需要我帮你进一步分析这个代币吗？",
  "这个代币的中文内容是：据说Vitalik Buterin即将作为ETHShanghai活动的嘉宾到访中国大陆。\n\n我很好奇这是不是真的😃\n\n\n\n发布于俄语\n事件的天气标签为：晴\n发布者的地理标签为：纽约市\n事件标签为：Crypto Related\nPrediction\nEthereum Ecosystem\nETHShanghai。\n\n你需要我帮你进一步分析这个代币吗？",
  "这个代币的中文内容是：金秋十月，ETHShanghai 2025即将于2025年10月18日至22日在上海隆重举行。整场活动以为期五天的黑客松和峰会为核心，集结亚太区最活跃的开发者和研究者，将创意从代码带到用户实践。\n\n发布于中文\n事件的天气标签为：晴\n发布者的地理标签为：上海\n事件标签为：ETHShanghai\nEthereum Ecosystem\nRWA\nHackathon。\n\n你需要我帮你进一步分析这个代币吗？"
];

const AgentSetting: React.FC<AgentSettingProps> = ({ balance: externalBalance, setBalance: externalSetBalance, onDemoFeedStart, onDemoFeedStop }) => {
  // swap 自动交易 demo
  const [swapEnabled, setSwapEnabled] = useState(false);
  const [showSwapTip, setShowSwapTip] = useState(false);

  // 托管钱包 demo
  const randomAddress = () => '0x' + Array.from({length:40}, () => Math.floor(Math.random()*16).toString(16)).join('');
  const [custodyAddress] = useState<string>(() => randomAddress());
  // 若外部提供 balance 使用外部，否则内部维持一份（保持兼容）
  const [internalBalance, setInternalBalance] = useState<number>(100);
  const effectiveBalance = externalBalance !== undefined ? externalBalance : internalBalance;
  const demoBalance = effectiveBalance.toFixed(4) + ' TRTH';
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  useEffect(()=>{ if (externalBalance !== undefined) { /* 同步时不做额外操作 */ } }, [externalBalance]);

  // websocket & tags
  const [wsEnabled, setWsEnabled] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [wsStatus, setWsStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const wsRef = useRef<WebSocket | null>(null);
  const [lastMessage, setLastMessage] = useState('');

  // Prompt 状态
  const DEFAULT_SESSION_PROMPT = '请将这些Event Coin的信息翻译成中文';
  const [userPrompt, setUserPrompt] = useState(DEFAULT_SESSION_PROMPT);
  const [promptLocked, setPromptLocked] = useState(true);
  // 新增: Auto Swap 限额 demo 状态
  const [maxTradeAmount, setMaxTradeAmount] = useState<string>('1'); // 单笔最大
  const [dailyMaxTradeAmount, setDailyMaxTradeAmount] = useState<string>('10'); // 单日最大

  // 限制选择最多 4 个标签
  const toggleTag = useCallback((tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        if (prev.length >= 4) return prev; // 忽略超过限制
        return [...prev, tag];
      }
    });
  }, []);

  // WebSocket 连接逻辑（demo）
  useEffect(() => {
    if (!wsEnabled) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setWsStatus('idle');
      return;
    }
    if (selectedTags.length === 0) {
      // 需要标签
      return;
    }
    // 构建连接 URL - 这里使用示例，需要替换为真实后端 WS 地址
    const query = encodeURIComponent(selectedTags.join(','));
    const WS_URL = `ws://127.0.0.1:5000/agent/ws?tags=${query}`; // TODO: 替换真实路径
    setWsStatus('connecting');
    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus('open');
      ws.onclose = () => setWsStatus('closed');
      ws.onerror = () => setWsStatus('error');
      ws.onmessage = (ev) => setLastMessage(ev.data);
    } catch (e) {
      setWsStatus('error');
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [wsEnabled, selectedTags]);

  // WebSocket 开关与 Tags Feed Demo Message Output
  useEffect(() => {
    if (wsEnabled) {
      if (selectedTags.length > 0) {
        onDemoFeedStart && onDemoFeedStart(DEMO_FEED_MESSAGES);
      }
    } else {
      onDemoFeedStop && onDemoFeedStop();
    }
    // 依赖加入回调，避免 ESLint 警告
  }, [wsEnabled, selectedTags, onDemoFeedStart, onDemoFeedStop]);

  const resetSettings = () => {
    setSwapEnabled(false);
    setWsEnabled(false);
    setSelectedTags([]);
    setLastMessage('');
    setWsStatus('idle');
    setPromptLocked(false);
    setUserPrompt('');
    setMaxTradeAmount('1');
    setDailyMaxTradeAmount('10');
  };

  return (
    <div style={{
      maxWidth: 900,
      width: '100%',
      height: '100%', // 让根容器占满外层高度
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      borderRadius: 20,
      padding: 24,
      boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
      fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'
    }}>
      {/* Prompt Section */}
      <div style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg,#f6f8fb,#f0f4f8)',
        border: '2px solid #e2e8f0',
        borderRadius: 16,
        padding: 16
      }}>
        <label style={{display:'block',fontSize:14,fontWeight:600,color:'#4a5568',marginBottom:8}}>Session Prompt</label>
        {!promptLocked ? (
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <input
              style={{flex:1,padding:'12px 14px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:14,outline:'none'}}
              placeholder="请将这些Event Coin的信息翻译成中文"
              value={userPrompt}
              onChange={e=>setUserPrompt(e.target.value)}
              maxLength={500}
            />
            <button
              type="button"
              disabled={!userPrompt.trim()}
              style={{
                padding:'10px 18px',borderRadius:10,border:'none',fontSize:14,fontWeight:600,
                background: !userPrompt.trim()? '#cbd5e1':'linear-gradient(135deg,#667eea,#764ba2)',
                color:'#fff',cursor:!userPrompt.trim()?'not-allowed':'pointer',
                boxShadow:!userPrompt.trim()?'none':'0 4px 12px rgba(102,126,234,0.35)',transition:'all .25s'
              }}
              onClick={()=>setPromptLocked(true)}
            >Save</button>
          </div>) : (
          <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
            <div style={{flex:1,padding:'12px 14px',background:'#fff',border:'2px solid #e2e8f0',borderRadius:10,fontSize:14,lineHeight:1.4,color:'#334155',whiteSpace:'pre-wrap',wordBreak:'break-word'}}>
              {userPrompt || '(empty)'}
            </div>
            <button
              type="button"
              style={{padding:'10px 18px',fontSize:14,fontWeight:600,borderRadius:10,border:'2px solid #6366f1',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',cursor:'pointer',boxShadow:'0 4px 12px rgba(99,102,241,0.35)',transition:'all .25s'}}
              onClick={()=>setPromptLocked(false)}
            >Edit</button>
          </div>
        )}
        <div style={{marginTop:8,fontSize:12,color:'#64748b'}}>Once saved the prompt is locked until you click Edit.</div>
      </div>
      {/* 原组件主体 */}
      <h2 style={{
        fontSize: 24,
        fontWeight: 700,
        background: 'linear-gradient(135deg,#667eea,#764ba2)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        margin: '0 0 8px'
      }}>Agent Settings</h2>
      <p style={{fontSize: 13, color: '#64748b', marginTop: 0, marginBottom: 16}}>Configure demo behaviors below. (Swap / WebSocket / Private Key)</p>

      {/* Swap 自动交易开关 */}
      <div style={sectionStyle}>
        <h3 style={{...sectionTitleStyle, marginBottom: 8}}>Auto Swap</h3>
        <p style={{fontSize: 13, color: '#64748b', marginTop: 0}}>Demo only: this toggle indicates whether the agent may execute automatic swaps.</p>
        <div style={toggleWrapper}>
          <div
            style={tooltipStyle}
            onMouseEnter={() => setShowSwapTip(true)}
            onMouseLeave={() => setShowSwapTip(false)}
          >
            <span style={{
              display: 'inline-flex',
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#6366f1',
              color: '#fff',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'default'
            }}>i</span>
            {showSwapTip && (
              <div style={tooltipBubble}>Allow agent to perform autonomous swap actions (demo)</div>
            )}
          </div>
          <div
            role="switch"
            aria-checked={swapEnabled}
            style={{
              ...switchContainer,
              background: swapEnabled ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#cbd5e1'
            }}
            onClick={() => setSwapEnabled(v => !v)}
          >
            <div style={{
              ...knobBase,
              transform: swapEnabled ? 'translateX(22px)' : 'translateX(0)'
            }}/>
          </div>
          <span style={statusBadge(swapEnabled)}>{swapEnabled ? 'ENABLED' : 'DISABLED'}</span>
        </div>
        {/* 新增限额输入 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:16,marginTop:20}}>
          <div>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Max Amount / Trade</label>
            <input
              type="number"
              min={0}
              step="0.0001"
              disabled={!swapEnabled}
              value={maxTradeAmount}
              onChange={e=>setMaxTradeAmount(e.target.value)}
              placeholder="e.g. 1"
              style={{
                width:'100%',padding:'10px 12px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:14,outline:'none',
                background: swapEnabled? '#fff':'#f1f5f9',color:'#334155'
              }}
            />
            <div style={{marginTop:4,fontSize:11,color:'#64748b'}}>Single trade upper bound</div>
          </div>
          <div>
            <label style={{display:'block',fontSize:12,fontWeight:600,color:'#475569',marginBottom:6}}>Daily Max Volume</label>
            <input
              type="number"
              min={0}
              step="0.0001"
              disabled={!swapEnabled}
              value={dailyMaxTradeAmount}
              onChange={e=>setDailyMaxTradeAmount(e.target.value)}
              placeholder="e.g. 10"
              style={{
                width:'100%',padding:'10px 12px',border:'2px solid #e2e8f0',borderRadius:10,fontSize:14,outline:'none',
                background: swapEnabled? '#fff':'#f1f5f9',color:'#334155'
              }}
            />
            <div style={{marginTop:4,fontSize:11,color:'#64748b'}}>Cumulative daily cap</div>
          </div>
        </div>
      </div>

      {/* 托管钱包 (Demo) */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Custody Wallet (Demo)</h3>
        <p style={{fontSize:13,color:'#64748b',marginTop:0}}>A randomly generated demo address represents a custody wallet. Deposit / Withdraw are mock actions.</p>
        <div style={{
          display:'flex',
          flexDirection:'column',
          gap:12,
          background:'linear-gradient(135deg,#f8fafc,#edf2f7)',
          padding:16,
          border:'2px solid #e2e8f0',
          borderRadius:12
        }}>
          <div style={{fontSize:13,fontWeight:600,color:'#475569'}}>Address</div>
          <div style={{
            display:'flex',alignItems:'center',gap:8,
            fontFamily:'monospace',
            fontSize:14,
            background:'#fff',
            border:'1px solid #e2e8f0',
            padding:'8px 12px',
            borderRadius:8,
            wordBreak:'break-all'
          }}>
            {custodyAddress}
            <button type='button' onClick={()=>{navigator.clipboard.writeText(custodyAddress)}} style={{
              marginLeft:'auto',
              padding:'4px 10px',
              background:'linear-gradient(135deg,#667eea,#764ba2)',
              border:'none',
              color:'#fff',
              borderRadius:6,
              fontSize:12,
              cursor:'pointer'
            }}>Copy</button>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <span style={{fontSize:13,color:'#64748b'}}>Balance:</span>
            <strong style={{fontSize:14,color:'#334155'}}>{demoBalance}</strong>
          </div>
          <div style={{display:'flex',gap:12}}>
            <button type='button' disabled={depositLoading} onClick={()=>{setDepositLoading(true); setTimeout(()=>setDepositLoading(false),800);}} style={{
              flex:1,
              padding:'10px 14px',
              background: depositLoading? '#cbd5e1':'linear-gradient(135deg,#16a34a,#22c55e)',
              border:'none',
              color:'#fff',
              fontSize:14,
              fontWeight:600,
              borderRadius:10,
              cursor: depositLoading? 'not-allowed':'pointer',
              boxShadow: depositLoading? 'none':'0 4px 12px rgba(34,197,94,0.35)',
              transition:'all .25s'
            }}>{depositLoading? 'Depositing...':'Deposit'}</button>
            <button type='button' disabled={withdrawLoading} onClick={()=>{setWithdrawLoading(true); setTimeout(()=>setWithdrawLoading(false),800);}} style={{
              flex:1,
              padding:'10px 14px',
              background: withdrawLoading? '#cbd5e1':'linear-gradient(135deg,#dc2626,#f87171)',
              border:'none',
              color:'#fff',
              fontSize:14,
              fontWeight:600,
              borderRadius:10,
              cursor: withdrawLoading? 'not-allowed':'pointer',
              boxShadow: withdrawLoading? 'none':'0 4px 12px rgba(239,68,68,0.35)',
              transition:'all .25s'
            }}>{withdrawLoading? 'Withdrawing...':'Withdraw'}</button>
          </div>
          <div style={{fontSize:11,color:'#64748b'}}>All actions are mock; no real blockchain calls executed.</div>
        </div>
      </div>

      {/* WebSocket 开关与 Tags */}
      <div style={sectionStyle}>
        <h3 style={sectionTitleStyle}>WebSocket Tags Feed</h3>
        <p style={{fontSize: 13, color: '#64748b', marginTop: 0}}>Enable to subscribe (demo). Pick up to 4 tags that the agent listens for.</p>
        <div style={toggleWrapper}>
          <div
            role="switch"
            aria-checked={wsEnabled}
            style={{
              ...switchContainer,
              background: wsEnabled ? 'linear-gradient(135deg,#667eea,#764ba2)' : '#cbd5e1'
            }}
            onClick={() => setWsEnabled(v => !v)}
          >
            <div style={{
              ...knobBase,
              transform: wsEnabled ? 'translateX(22px)' : 'translateX(0)'
            }}/>
          </div>
          <span style={statusBadge(wsEnabled)}>{wsEnabled ? 'ON' : 'OFF'}</span>
          <span style={{fontSize: 12, color: '#64748b'}}>Status: {wsStatus}</span>
          {lastMessage && (
            <span style={{
              fontSize: 12,
              maxWidth: 240,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: '#475569'
            }}>Last: {lastMessage}</span>
          )}
        </div>

          <div style={{marginTop: 18}}>
            <label style={labelStyle}>Select Tags (max 4)</label>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              {EVENT_TYPE_OPTIONS.map(tag => {
                const active = selectedTags.includes(tag);
                const disabled = !active && selectedTags.length >= 4;
                return (
                  <div
                    key={tag}
                    onClick={() => !disabled && toggleTag(tag)}
                    style={{
                      ...chipStyle(active),
                      opacity: disabled ? 0.4 : 1,
                      cursor: disabled ? 'not-allowed' : 'pointer'
                    }}
                    title={disabled ? 'Maximum 4 tags' : undefined}
                  >
                    {tag}
                    {active && <span style={{fontSize: 11, opacity: 0.9}}>×</span>}
                  </div>
                );
              })}
            </div>
            <div style={{marginTop: 8, fontSize: 12, color: selectedTags.length === 4 ? '#6366f1' : '#64748b'}}>
              {selectedTags.length}/4 selected
            </div>
            {wsEnabled && selectedTags.length === 0 && (
              <div style={{marginTop: 6, fontSize: 12, color: '#dc2626'}}>Select at least one tag to connect.</div>
            )}
          </div>
      </div>

      <button
        type="button"
        onClick={resetSettings}
        style={buttonPrimary(false)}
      >Reset All</button>
    </div>
  );
};

export default AgentSetting;

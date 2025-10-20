import React, { useState, useRef, useEffect, FormEvent, useCallback } from 'react';
import AgentSetting from './Agent_setting';

interface ChatMessage { id: string; role: 'user' | 'agent'; content: string; ts: number; variant?: 'normal' | 'function'; }
interface SessionProps { injectedAgentMessage?: string; onMessageConsumed?: () => void; }

const PURCHASE_TRIGGER = /请帮我购买\s*1\s*TRTH.*代币?/; // 简单匹配
const PURCHASE_STEP1_TEXT = '购买1TRTH的BE代币';
const PURCHASE_STEP2_TEXT = '交易完成，交易哈希：1e1441ae16ed099bc7b34e8efde1e7cc737f4a7b578c39a10296a01412152f5d';
const PURCHASE_DEDUCT = 1.0024;

const Session = ({ injectedAgentMessage, onMessageConsumed }: SessionProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [agentTyping, setAgentTyping] = useState(false);
  const [balance, setBalance] = useState<number>(100); // 共享 TRTH 余额
  const [purchaseInProgress, setPurchaseInProgress] = useState(false);
  const [purchaseCountdown, setPurchaseCountdown] = useState(0);
  const [spinnerChar, setSpinnerChar] = useState('|');
  const listRef = useRef<HTMLDivElement | null>(null);
  const activeStreamRef = useRef<{id:string; aborted:boolean}|null>(null);
  const currentInjectionRef = useRef<{ cancel: () => void } | null>(null);
  const purchaseTimerRef = useRef<number | null>(null);
  const countdownRef = useRef<number | null>(null);
  const spinnerRef = useRef<number | null>(null);
  const feedControllerRef = useRef<{ aborted: boolean } | null>(null);
  const feedTimersRef = useRef<number[]>([]);

  useEffect(() => { if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight; }, [messages]);

  // 外部消息逐字注入（保持原有）
  useEffect(() => {
    const text = injectedAgentMessage;
    if (!text || !text.trim()) return;
    if (currentInjectionRef.current) currentInjectionRef.current.cancel();
    let cancelled = false;
    const id = 'injected-' + Date.now() + '-' + Math.random().toString(16).slice(2);
    if (text.length === 1) {
      setMessages(prev => [...prev, { id, role: 'agent', content: text, ts: Date.now() }]);
      setAgentTyping(false);
      onMessageConsumed && onMessageConsumed();
      return;
    }
    setMessages(prev => [...prev, { id, role: 'agent', content: text.slice(0,1), ts: Date.now() }]);
    setAgentTyping(true);
    let i = 1;
    const interval = setInterval(() => {
      if (cancelled) { clearInterval(interval); return; }
      i++;
      setMessages(prev => prev.map(m => m.id === id ? { ...m, content: text.slice(0, i) } : m));
      if (i >= text.length) {
        clearInterval(interval);
        setAgentTyping(false);
        onMessageConsumed && onMessageConsumed();
      }
    }, 25);
    currentInjectionRef.current = { cancel: () => { cancelled = true; clearInterval(interval); } };
    return () => { cancelled = true; clearInterval(interval); };
  }, [injectedAgentMessage, onMessageConsumed]);

  // 通用流式回复（回显）
  const streamAgentReply = async (full: string, controller: {id:string; aborted:boolean}, variant: ChatMessage['variant']='normal') => {
    const id = 'a-stream-' + Date.now();
    if (controller.aborted) return;
    const startTs = Date.now();
    activeStreamRef.current = { id, aborted: false };
    setMessages(prev => [...prev, { id, role:'agent', content:'', ts: startTs, variant }]);
    for (let i=1; i<=full.length; i++) {
      if (!activeStreamRef.current || activeStreamRef.current.aborted) return;
      await new Promise(r => setTimeout(r, 25));
      const slice = full.slice(0,i);
      setMessages(prev => prev.map(m => m.id===id ? { ...m, content: slice } : m));
    }
  };

  // 特殊购买流程
  const runPurchaseFlow = () => {
    // 第一步：流式 “购买1TRTH的BE代币”
    const controller = { id:'purchase-'+Date.now(), aborted:false };
    if (activeStreamRef.current) activeStreamRef.current.aborted = true;
    activeStreamRef.current = controller;
    agentTyping || setAgentTyping(true);
    const id = 'purchase-step1-' + Date.now();
    setMessages(prev => [...prev, { id, role:'agent', content:'购', ts: Date.now(), variant:'function' }]);
    let i = 1;
    const text = PURCHASE_STEP1_TEXT;
    const interval = setInterval(() => {
      if (controller.aborted) { clearInterval(interval); return; }
      i++;
      setMessages(prev => prev.map(m => m.id===id ? { ...m, content: text.slice(0,i) } : m));
      if (i >= text.length) {
        clearInterval(interval);
        setAgentTyping(false);
        // 第二步：进入执行中阶段，显示加载 UI
        setPurchaseInProgress(true);
        setPurchaseCountdown(10);
        const spinnerFrames = ['|','/','-','\\'];
        let frameIndex = 0;
        if (spinnerRef.current) clearInterval(spinnerRef.current);
        spinnerRef.current = window.setInterval(() => {
          frameIndex = (frameIndex + 1) % spinnerFrames.length;
          setSpinnerChar(spinnerFrames[frameIndex]);
        }, 150);
        if (countdownRef.current) clearInterval(countdownRef.current);
        countdownRef.current = window.setInterval(() => {
          setPurchaseCountdown(prev => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        // 10 秒后发送完成消息并扣减余额
        purchaseTimerRef.current = window.setTimeout(() => {
          if (spinnerRef.current) clearInterval(spinnerRef.current);
          if (countdownRef.current) clearInterval(countdownRef.current);
          setPurchaseInProgress(false);
          setMessages(prev => [...prev, { id: 'purchase-step2-'+Date.now(), role:'agent', content: PURCHASE_STEP2_TEXT, ts: Date.now(), variant:'normal' }]);
          setBalance(b => parseFloat((b - PURCHASE_DEDUCT).toFixed(4)));
        }, 10000);
      }
    }, 25);
  };

  // 启动外部 demo feed
  const stopDemoFeed = useCallback(() => {
    if (feedControllerRef.current) feedControllerRef.current.aborted = true;
    feedControllerRef.current = null;
    feedTimersRef.current.forEach(t => clearTimeout(t));
    feedTimersRef.current = [];
  }, []);

  const startDemoFeed = useCallback((msgs: string[]) => {
    stopDemoFeed();
    if (!msgs || !msgs.length) return;
    feedControllerRef.current = { aborted: false };
    const controller = feedControllerRef.current;

    const runOne = (index: number) => {
      if (!feedControllerRef.current || controller.aborted) return;
      if (index >= msgs.length) return; // done
      const full = msgs[index];
      const id = 'feed-' + Date.now() + '-' + index;
      // 初始放入首字，保证无空气泡
      setMessages(prev => [...prev, { id, role: 'agent', content: full.slice(0,1), ts: Date.now(), variant: 'normal' }]);
      let i = 1;
      const interval = window.setInterval(() => {
        if (!feedControllerRef.current || controller.aborted) { clearInterval(interval); return; }
        i++;
        setMessages(prev => prev.map(m => m.id === id ? { ...m, content: full.slice(0,i) } : m));
        if (i >= full.length) {
          clearInterval(interval);
          // 5 秒后继续下一个
          const t = window.setTimeout(() => runOne(index+1), 5000);
          feedTimersRef.current.push(t);
        }
      }, 25);
      feedTimersRef.current.push(interval);
    };

    runOne(0);
  }, [stopDemoFeed]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    const userMsg: ChatMessage = { id: 'u-' + Date.now(), role: 'user', content, ts: Date.now() };
    setInput(''); setMessages(prev => [...prev, userMsg]); setSending(true);

    // 识别购买指令
    if (PURCHASE_TRIGGER.test(content)) {
      setSending(false);
      runPurchaseFlow();
      return;
    }

    if (activeStreamRef.current) activeStreamRef.current.aborted = true;
    const controller = { id:'pending-'+Date.now(), aborted:false };
    activeStreamRef.current = controller;
    try {
      const reply = 'Echo: ' + content;
      setAgentTyping(true);
      // 模拟处理延时
      for (let t=0; t<800; t+=100) {
        if (controller.aborted) { setAgentTyping(false); setSending(false); return; }
        await new Promise(r => setTimeout(r,100));
      }
      if (!controller.aborted) {
        await streamAgentReply(reply, controller);
        if (!controller.aborted) setAgentTyping(false);
      }
    } catch {
      setMessages(prev => [...prev, { id: 'a-err-' + Date.now(), role:'agent', content:'Error processing message.', ts: Date.now() }]);
      setAgentTyping(false);
    } finally { setSending(false); }
  };

  const handleSubmit = (e: FormEvent) => { e.preventDefault(); sendMessage(); };

  useEffect(() => { return () => { /* 清理 */ if (activeStreamRef.current) activeStreamRef.current.aborted = true; if (currentInjectionRef.current) currentInjectionRef.current.cancel(); if (purchaseTimerRef.current) clearTimeout(purchaseTimerRef.current); if (countdownRef.current) clearInterval(countdownRef.current); if (spinnerRef.current) clearInterval(spinnerRef.current); stopDemoFeed(); setAgentTyping(false); }; }, []);

  return (
    <div style={pageShell}>
      <div style={layoutWrapper}>
        <div style={chatColumn}>
          <div style={chatCardStyle}>
            {/* 移除初始空提示面板 */}
            <div ref={listRef} style={messageListStyle}>
              {messages.map(m => (
                <div key={m.id} style={bubbleWrapperStyle(m.role)}>
                  <div style={bubbleStyle(m.role, m.variant)}>
                    <div style={bubbleMetaStyle}>
                      <strong>{m.role === 'user' ? 'You' : 'Agent'}</strong>
                      <span style={{ fontSize: 11, opacity: .7, marginLeft: 8 }}>{new Date(m.ts).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ whiteSpace:'pre-wrap' }}>{m.content}</div>
                  </div>
                </div>
              ))}
              {purchaseInProgress && (
                <div style={bubbleWrapperStyle('agent')}>
                  <div style={bubbleStyle('agent','function')}>
                    <div style={bubbleMetaStyle}>
                      <strong>Agent</strong>
                      <span style={{ fontSize: 11, opacity: .7, marginLeft: 8 }}>{new Date().toLocaleTimeString()}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{fontWeight:600}}>执行中...</span>
                      <span style={{fontFamily:'monospace'}}>{spinnerChar}</span>
                      <span style={{fontSize:12,opacity:.8}}>剩余 {purchaseCountdown}s</span>
                    </div>
                  </div>
                </div>
              )}
              {agentTyping && !purchaseInProgress && (
                <div style={typingIndicatorStyle}><span>正在生成...</span></div>
              )}
            </div>
            <form onSubmit={handleSubmit} style={inputRowStyle}>
              <input
                style={inputStyle}
                placeholder={sending ? 'Sending...' : 'Type a message...'}
                value={input}
                onChange={e => setInput(e.target.value)}
                disabled={sending}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              />
              <button type="submit" disabled={!input.trim() || sending} style={sendButtonStyle(!input.trim() || sending)}>Send</button>
            </form>
          </div>
        </div>
        <div style={settingsColumn}>
          <div style={settingsScrollArea}>
            <div style={{ flex: 1, overflowY: 'auto', height: '100%' }}>
              <AgentSetting balance={balance} setBalance={setBalance} onDemoFeedStart={startDemoFeed} onDemoFeedStop={stopDemoFeed} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 样式
const chatCardStyle: React.CSSProperties = { background:'#fff', borderRadius:20, boxShadow:'0 20px 50px rgba(0,0,0,0.15)', display:'flex', flexDirection:'column', height:'100%', width:'100%', overflow:'hidden' };
const messageListStyle: React.CSSProperties = { flex:1, padding:'16px 20px', overflowY:'auto', background:'linear-gradient(180deg,#fafafa,#f3f4f6)' };
const bubbleWrapperStyle = (role:'user'|'agent'): React.CSSProperties => ({ display:'flex', justifyContent: role==='user' ? 'flex-end':'flex-start', marginBottom:14 });
const bubbleStyle = (role:'user'|'agent', variant?: ChatMessage['variant']): React.CSSProperties => ({ maxWidth:'74%', background: role==='user' ? 'linear-gradient(135deg,#667eea,#764ba2)' : variant==='function' ? '#1e293b' : '#edf2f7', color: role==='user' ? '#fff' : variant==='function' ? '#f8fafc' : '#1e293b', padding:'12px 16px', borderRadius:16, boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontSize:14, position:'relative', fontFamily: variant==='function' ? 'SFMono-Regular,Menlo,monospace' : 'inherit' });
const bubbleMetaStyle: React.CSSProperties = { fontSize:11, opacity:0.85, marginBottom:4, letterSpacing:.5, display:'flex', alignItems:'center' };
const inputRowStyle: React.CSSProperties = { padding:'14px 16px', borderTop:'1px solid #e2e8f0', background:'#f8fafc', display:'flex', gap:12 };
const inputStyle: React.CSSProperties = { flex:1, padding:'12px 16px', border:'2px solid #e2e8f0', borderRadius:12, fontSize:14, outline:'none', transition:'all .25s' };
const sendButtonStyle = (disabled:boolean): React.CSSProperties => ({ padding:'12px 22px', fontSize:14, fontWeight:600, borderRadius:12, border:'none', background: disabled ? '#cbd5e1':'linear-gradient(135deg,#6366f1,#8b5cf6)', color:'#fff', cursor: disabled ? 'not-allowed':'pointer', boxShadow: disabled ? 'none':'0 4px 12px rgba(99,102,241,0.35)', transition:'all .25s' });
const typingIndicatorStyle: React.CSSProperties = { padding:'6px 12px', fontSize:12, fontStyle:'italic', color:'#6366f1', opacity:0.85 };
const pageShell: React.CSSProperties = { width:'100%', height:'100vh', background:'linear-gradient(135deg,#667eea,#764ba2)', padding:'16px', boxSizing:'border-box', overflow:'hidden' };
const layoutWrapper: React.CSSProperties = { width:'100%', display:'flex', gap:12, alignItems:'stretch', height:'100%' };
const chatColumn: React.CSSProperties = { flex:'4 1 0', minWidth:0, display:'flex', height:'100%' };
const settingsColumn: React.CSSProperties = { flex:'3 1 0', minWidth:0, display:'flex', height:'100%' };
const settingsScrollArea: React.CSSProperties = { flex:1, height:'100%', display:'flex', background:'#fff', borderRadius:20, boxShadow:'0 20px 50px rgba(0,0,0,0.15)', overflow:'hidden' };

export default Session;

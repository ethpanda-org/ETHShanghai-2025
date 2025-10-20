import React, { useState, useEffect } from "react";
import EventCoinTrading from "./Trading/EventCoinTading";
import TokenInfo from "./Trading/TokenInfo";
import TokenPrice from "./Trading/TokenPrice"; // Added price line chart

interface TradingProps { initialPoolId?: string; onAskAI?: (msg:string)=>void }

const Trading: React.FC<TradingProps> = ({ initialPoolId, onAskAI }) => {
  const [activePoolId, setActivePoolId] = useState<string>(initialPoolId || "");
  useEffect(()=>{ if (initialPoolId) setActivePoolId(initialPoolId); }, [initialPoolId]);

  return (
    <div style={outerLayout}>
      <div style={leftPane}>
        <EventCoinTrading onPoolSelect={setActivePoolId} initialPoolId={activePoolId || undefined} onAskAI={onAskAI} />
      </div>
      <div style={rightPane}>
        <TokenPrice poolId={activePoolId} />
        <TokenInfo poolId={activePoolId} />
      </div>
    </div>
  );
};

const outerLayout: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 24,
  padding: '24px',
  boxSizing: 'border-box',
  width: '100%',
};
const leftPane: React.CSSProperties = { flex: '0 0 760px', maxWidth: 760 };
const rightPane: React.CSSProperties = { flex: 1, minWidth: 0, display:'flex', flexDirection:'column', gap:24 };

export default Trading;

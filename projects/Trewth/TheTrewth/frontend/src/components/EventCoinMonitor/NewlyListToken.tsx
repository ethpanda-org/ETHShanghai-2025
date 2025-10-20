import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';

interface PoolInit { fee:number; tick:number; tickSpacing:number; }
interface TokenMetadata { fullname:string; ticker:string; eventDescription:string; geoTag:string; weatherTag:string; }
interface PoolItem {
  poolid:string;
  tokenaddress:string;
  tokenpublisher:string;
  createdattime:number;
  createdatblock:number;
  tokenmetadata: TokenMetadata;
  poolinit: PoolInit;
}

interface NewlyListTokenProps { onSelectPool?: (poolId:string)=>void; limit?: number; apiBase?: string; }

const NewlyListToken: React.FC<NewlyListTokenProps> = ({ onSelectPool, limit = 10, apiBase = 'http://10.18.23.51:3000' }) => {
  const [pools, setPools] = useState<PoolItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(()=>{
    setLoading(true);
    axios.get(`${apiBase}/swap/get_pools`)
      .then(res => { setPools(res.data || []); setError(''); })
      .catch(()=>{ setPools([]); setError('Failed to fetch latest pool list'); })
      .finally(()=> setLoading(false));
  },[apiBase]);

  const latestPools = useMemo(()=>{
    return [...pools]
      .sort((a,b)=> b.createdattime - a.createdattime) // Sort by created time desc
      .slice(0, limit);
  },[pools, limit]);

  if (loading) return <div style={cardStyle}>Loading latest pools...</div>;
  if (error) return <div style={{...cardStyle, color:'#dc2626'}}>{error}</div>;
  if (!latestPools.length) return <div style={cardStyle}>No new pools</div>;

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>
        <h3 style={titleStyle}>Newest Event Tokens Ranking</h3>
        <span style={subtitleStyle}>Sorted by deployment time. Click to trade.</span>
      </div>
      <div style={listStyle}>
        {latestPools.map((p, idx) => {
          const feePct = (p.poolinit.fee / 10000).toFixed(2) + '%';
          const timeStr = p.createdattime ? p.createdattime.toString() : '-';
          return (
            <div
              key={p.poolid}
              style={itemStyle}
              onClick={()=> onSelectPool && onSelectPool(p.poolid)}
            >
              <div style={rankBadgeStyle}>{idx+1}</div>
              <div style={itemMainStyle}>
                <div style={itemTitleRowStyle}>
                  <span style={tickerStyle}>{p.tokenmetadata.ticker}</span>
                  <span style={fullnameStyle}>{p.tokenmetadata.fullname}</span>
                </div>
                <div style={metaRowStyle}>
                  <span style={metaLabelStyle}>Fee</span><span style={metaValueStyle}>{feePct}</span>
                  <span style={dotStyle}>•</span>
                  <span style={metaLabelStyle}>Block</span><span style={metaValueStyle}>{p.createdatblock}</span>
                  <span style={dotStyle}>•</span>
                  <span style={metaLabelStyle}>Timestamp</span><span style={metaValueStyle}>{timeStr}</span>
                </div>
                <div style={descStyle}>{p.tokenmetadata.eventDescription || '-'}</div>
              </div>
              <div style={actionColStyle}>➡️</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Styles
const wrapperStyle: React.CSSProperties = { marginTop:32, background:'white', borderRadius:16, padding:'20px 24px', boxShadow:'0 6px 20px rgba(0,0,0,0.08)', border:'1px solid #e5e7eb' };
const headerStyle: React.CSSProperties = { marginBottom:16 };
const titleStyle: React.CSSProperties = { margin:0, fontSize:20, fontWeight:600, background:'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' };
const subtitleStyle: React.CSSProperties = { fontSize:12, color:'#6b7280' };
const listStyle: React.CSSProperties = { display:'flex', flexDirection:'column', gap:12 };
const itemStyle: React.CSSProperties = { display:'flex', gap:16, alignItems:'flex-start', padding:'14px 18px', background:'linear-gradient(135deg,#f5f7fa,#eef2ff)', borderRadius:14, border:'1px solid #e0e7ff', cursor:'pointer', transition:'all .25s', position:'relative' };
const rankBadgeStyle: React.CSSProperties = { width:34, height:34, borderRadius:'50%', background:'linear-gradient(135deg,#667eea,#764ba2)', color:'#fff', fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0, boxShadow:'0 4px 10px rgba(0,0,0,0.15)' };
const itemMainStyle: React.CSSProperties = { flex:1, display:'flex', flexDirection:'column', gap:6 };
const itemTitleRowStyle: React.CSSProperties = { display:'flex', alignItems:'baseline', gap:10, flexWrap:'wrap' };
const tickerStyle: React.CSSProperties = { fontSize:18, fontWeight:700, color:'#4f46e5' };
const fullnameStyle: React.CSSProperties = { fontSize:14, fontWeight:500, color:'#374151' };
const metaRowStyle: React.CSSProperties = { display:'flex', gap:6, flexWrap:'wrap', fontSize:12, alignItems:'center' };
const metaLabelStyle: React.CSSProperties = { color:'#6b7280' };
const metaValueStyle: React.CSSProperties = { color:'#374151', fontWeight:600 };
const dotStyle: React.CSSProperties = { color:'#9ca3af' };
const descStyle: React.CSSProperties = { fontSize:12, color:'#4b5563', lineHeight:1.4, maxWidth:'100%' };
const actionColStyle: React.CSSProperties = { alignSelf:'center', fontSize:18, color:'#6366f1', fontWeight:600 };
const cardStyle: React.CSSProperties = { background:'white', borderRadius:16, padding:'20px', boxShadow:'0 4px 12px rgba(0,0,0,0.07)', border:'1px solid #e5e7eb', marginTop:32, textAlign:'center', fontSize:14, color:'#374151' };

export default NewlyListToken;

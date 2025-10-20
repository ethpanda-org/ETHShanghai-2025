import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';

interface TokenPriceProps { poolId: string; apiBase?: string; }
interface PricePoint { price: number; ts: number; }

const TokenPrice: React.FC<TokenPriceProps> = ({ poolId, apiBase = 'http://10.18.23.51:3000' }) => {
  const [data, setData] = useState<PricePoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dims, setDims] = useState({ width: 0, height: 260 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => setDims(prev => ({ ...prev, width: el.clientWidth }));
    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!poolId) { setData([]); return; }
    setLoading(true); setError('');
    axios.post(`${apiBase}/pool_info/pool_line`, { pool_id: poolId })
      .then(res => {
        const arr = res.data as [string, number][];
        const mapped = (arr || []).map(item => ({ price: parseFloat(item[0]), ts: item[1] })).filter(p => !isNaN(p.price));
        mapped.sort((a,b)=> a.ts - b.ts);
        setData(mapped);
      })
      .catch(()=> { setData([]); setError('Failed to fetch price data'); })
      .finally(()=> setLoading(false));
  }, [poolId, apiBase]);

  const stats = useMemo(()=>{
    if (!data.length) return null;
    const prices = data.map(d=>d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const last = data[data.length-1].price;
    const first = data[0].price;
    const changePct = first ? ((last - first)/first)*100 : 0;
    return { min, max, last, changePct };
  }, [data]);

  const padding = 36;
  const pathD = useMemo(()=>{
    if (!data.length || dims.width === 0) return '';
    const minT = Math.min(...data.map(d=>d.ts));
    const maxT = Math.max(...data.map(d=>d.ts));
    const minP = Math.min(...data.map(d=>d.price));
    const maxP = Math.max(...data.map(d=>d.price));
    const rangeT = maxT - minT || 1;
    const rangeP = maxP - minP || 1e-9;
    const w = dims.width; const h = dims.height;
    return data.map((d,i)=>{
      const x = padding + ( (d.ts - minT)/rangeT ) * (w - padding*2);
      const y = padding + (1 - (d.price - minP)/rangeP) * (h - padding*2);
      return (i===0? 'M':'L') + x + ' ' + y;
    }).join(' ');
  }, [data, dims.width, dims.height]);

  const circles = useMemo(()=>{
    if (!data.length || dims.width === 0) return [] as {x:number;y:number;d:PricePoint}[];
    const minT = Math.min(...data.map(d=>d.ts));
    const maxT = Math.max(...data.map(d=>d.ts));
    const minP = Math.min(...data.map(d=>d.price));
    const maxP = Math.max(...data.map(d=>d.price));
    const rangeT = maxT - minT || 1;
    const rangeP = maxP - minP || 1e-9;
    const w = dims.width; const h = dims.height;
    return data.map(d=>{
      const x = padding + ( (d.ts - minT)/rangeT ) * (w - padding*2);
      const y = padding + (1 - (d.price - minP)/rangeP) * (h - padding*2);
      return { x, y, d };
    });
  }, [data, dims.width, dims.height]);

  const hoverPoint = hoverIdx != null ? circles[hoverIdx] : null;

  return (
    <div ref={containerRef} style={outerWrapperStyle}>
      <div style={innerCardStyle}>
        <div style={headerRowStyle}>
          <h3 style={titleStyle}>Price Trend</h3>
          <div style={metaInlineStyle}>
            {stats && (
              <>
                <span style={metaItemStyle}>Latest: <strong>{stats.last.toPrecision(6)}</strong> TRTH</span>
                <span style={dotStyle}>•</span>
                <span style={metaItemStyle}>Min: {stats.min.toPrecision(6)}</span>
                <span style={dotStyle}>•</span>
                <span style={metaItemStyle}>Max: {stats.max.toPrecision(6)}</span>
                <span style={dotStyle}>•</span>
                <span style={{...metaItemStyle, color: stats.changePct>=0? '#10b981':'#ef4444'}}>Change: {stats.changePct.toFixed(2)}%</span>
              </>
            )}
          </div>
        </div>
        {loading && <div style={loadingStyle}>Loading price data...</div>}
        {!loading && error && <div style={errorStyle}>{error}</div>}
        {!loading && !error && !data.length && <div style={emptyStyle}>No price data</div>}
        {!loading && !error && data.length > 0 && (
          <div style={{ position:'relative' }}>
            <svg width={dims.width} height={dims.height} style={{ display:'block' }} onMouseLeave={()=> setHoverIdx(null)}
              onMouseMove={e=>{
                const bounds = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const mx = e.clientX - bounds.left;
                // find nearest point
                let nearestIdx = 0; let minDist = Infinity;
                circles.forEach((c,i)=>{ const dx = c.x - mx; const dist = Math.abs(dx); if (dist < minDist){ minDist = dist; nearestIdx = i; } });
                setHoverIdx(nearestIdx);
              }}>
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#667eea" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#764ba2" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <rect x={0} y={0} width={dims.width} height={dims.height} fill="url(#bgGradient)" fillOpacity={0} />
              <path d={pathD} stroke="url(#lineGradient)" strokeWidth={3} fill="none" strokeLinecap="round" />
              {/* area fill */}
              <path d={pathD + ` L ${padding + (dims.width - padding*2)} ${dims.height - padding} L ${padding} ${dims.height - padding} Z`} fill="url(#lineGradient)" fillOpacity={0.15} />
              {circles.map((c,i)=>(
                <circle key={i} cx={c.x} cy={c.y} r={hoverIdx===i?6:4} fill={hoverIdx===i? '#764ba2':'#667eea'} opacity={hoverIdx===i?1:0.7} />
              ))}
              {/* X & Y axes */}
              <line x1={padding} y1={dims.height - padding} x2={dims.width - padding} y2={dims.height - padding} stroke="#cbd5e1" strokeWidth={1} />
              <line x1={padding} y1={padding} x2={padding} y2={dims.height - padding} stroke="#cbd5e1" strokeWidth={1} />
              {/* ticks */}
              {(() => {
                const ticks = 5;
                const minT = Math.min(...data.map(d=>d.ts));
                const maxT = Math.max(...data.map(d=>d.ts));
                const minP = Math.min(...data.map(d=>d.price));
                const maxP = Math.max(...data.map(d=>d.price));
                const tRange = maxT - minT || 1;
                const pRange = maxP - minP || 1e-9;
                const els: React.ReactElement[] = [];
                for (let i=0;i<=ticks;i++) {
                  const tx = minT + (tRange * i / ticks);
                  const px = padding + ( (tx - minT)/tRange )*(dims.width - padding*2);
                  els.push(<text key={'tx'+i} x={px} y={dims.height - padding + 18} fontSize={10} textAnchor="middle" fill="#6b7280">{formatTs(tx)}</text>);
                  const pyVal = minP + (pRange * i / ticks);
                  const py = padding + (1 - (pyVal - minP)/pRange) * (dims.height - padding*2);
                  els.push(<text key={'py'+i} x={padding - 6} y={py+3} fontSize={10} textAnchor="end" fill="#6b7280">{pyVal.toPrecision(3)}</text>);
                  els.push(<line key={'grid'+i} x1={padding} x2={dims.width - padding} y1={py} y2={py} stroke="#e2e8f0" strokeDasharray="4 4" />);
                }
                return els;
              })()}
            </svg>
            {hoverPoint && (
              <div style={{ ...tooltipStyle, left: hoverPoint.x + 10, top: hoverPoint.y + 10 }}>
                <div style={tooltipRowStyle}>Price: <strong>{hoverPoint.d.price}</strong> TRTH</div>
                <div style={tooltipRowStyle}>Time: {formatTsFull(hoverPoint.d.ts)}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

function formatTs(ts:number) {
  // assume timestamp is in seconds
  const d = new Date(ts * 1000);
  const h = String(d.getHours()).padStart(2,'0');
  const m = String(d.getMinutes()).padStart(2,'0');
  return `${h}:${m}`;
}
function formatTsFull(ts:number) {
  // full datetime formatting (assumes seconds)
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}

// styles (reference CoinLiquity visuals)
const outerWrapperStyle: React.CSSProperties = { marginTop:24, background:'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding:20, borderRadius:20, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', width:'100%', overflow:'hidden' };
const innerCardStyle: React.CSSProperties = { background:'rgba(255,255,255,0.95)', borderRadius:16, padding:20, backdropFilter:'blur(10px)' };
const headerRowStyle: React.CSSProperties = { display:'flex', flexDirection:'column', gap:10, marginBottom:12 };
const titleStyle: React.CSSProperties = { margin:0, fontSize:20, fontWeight:600, background:'linear-gradient(135deg,#667eea,#764ba2)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' };
const metaInlineStyle: React.CSSProperties = { display:'flex', gap:10, flexWrap:'wrap', fontSize:12, color:'#6b7280' };
const metaItemStyle: React.CSSProperties = { fontSize:12 };
const dotStyle: React.CSSProperties = { color:'#9ca3af' };
const loadingStyle: React.CSSProperties = { padding:40, textAlign:'center', fontSize:14, color:'#6b7280' };
const errorStyle: React.CSSProperties = { padding:24, background:'linear-gradient(135deg,#ff6b6b,#feca57)', color:'#fff', borderRadius:12, textAlign:'center', fontWeight:600 };
const emptyStyle: React.CSSProperties = { padding:24, textAlign:'center', fontSize:14, color:'#6b7280' };
const tooltipStyle: React.CSSProperties = { position:'absolute', background:'rgba(255,255,255,0.95)', padding:'8px 12px', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.15)', fontSize:12, color:'#374151', pointerEvents:'none', minWidth:160 };
const tooltipRowStyle: React.CSSProperties = { marginBottom:4 };

export default TokenPrice;

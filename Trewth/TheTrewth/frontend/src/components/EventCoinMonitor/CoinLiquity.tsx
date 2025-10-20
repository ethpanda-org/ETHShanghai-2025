import React, { useEffect, useState, useRef } from "react";
import { hierarchy, treemap } from "d3-hierarchy";
import axios from "axios";

interface HeatmapItem {
    latest_reserve0: string;
    poolid: string;
    reserve0_ratio: number;
    tokenmetadata: {
        fullname: string;
        ticker: string;
        geoTag: string;
        weatherTag: string;
        eventDescription: string;
        eventTypes: string[];
    };
}

interface CoinLiquityProps { onSelectPool?: (poolId:string)=>void }

const CoinLiquity: React.FC<CoinLiquityProps> = ({ onSelectPool }) => {
    const [heatmap, setHeatmap] = useState<HeatmapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hoveredNode, setHoveredNode] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [dims, setDims] = useState({ width: 0, height: 500 });

    useEffect(() => {
        axios.get("http://10.18.23.51:3000/swap/heatmap")
            .then(res => setHeatmap(res.data))
            .catch(() => setError("Failed to fetch heatmap data"))
            .finally(() => setLoading(false));
    }, []);

    // Use ResizeObserver to get dynamic container width so treemap fills parent
    useEffect(() => {
        if (!containerRef.current) return;
        const el = containerRef.current;
        const update = () => {
            const w = el.clientWidth; // actual content width
            // Keep fixed height 500 or adjust if needed
            setDims(prev => ({ width: w, height: prev.height }));
        };
        update();
        const ro = new ResizeObserver(() => update());
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Treemap data preparation
    const treemapData = {
        name: "root",
        children: heatmap.map(item => ({
            name: item.tokenmetadata.fullname,
            value: item.reserve0_ratio,
            poolid: item.poolid,
            ticker: item.tokenmetadata.ticker,
            geoTag: item.tokenmetadata.geoTag,
            eventTypes: item.tokenmetadata.eventTypes,
            eventDescription: item.tokenmetadata.eventDescription // description field
        }))
    };

    // Treemap layout
    let nodes: any[] = [];
    if (heatmap.length > 0 && dims.width > 0) {
        const root = hierarchy(treemapData)
            .sum((d: any) => d.value)
            .sort((a: any, b: any) => (b.value as number) - (a.value as number));
        treemap<any>()
            .size([dims.width, dims.height])
            .padding(4)
            .paddingInner(3)
            .paddingOuter(6)(root);
        nodes = root.leaves();
    }

    const getSolidColorForValue = (value: number) => {
        if (value >= 0.4) return "#667eea";
        else if (value >= 0.3) return "#f093fb";
        else if (value >= 0.2) return "#4facfe";
        else if (value >= 0.1) return "#43e97b";
        else if (value >= 0.05) return "#fa709a";
        else return "#30cfd0";
    };

    return (
        <div ref={containerRef} style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '20px',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            width: '100%', // full width
            overflow: 'hidden' // remove horizontal scroll
        }}>
            <div style={{
                background: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '16px',
                padding: '20px',
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px',
                    marginBottom: '20px'
                }}>
                    <h2 style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: 0
                    }}>
                        Liquidity Pool Heatmap
                    </h2>
                    <div style={{
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>Share Distribution:</span>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {[
                                { label: '>40%', color: '#667eea' },
                                { label: '30-40%', color: '#f093fb' },
                                { label: '20-30%', color: '#4facfe' },
                                { label: '10-20%', color: '#43e97b' },
                                { label: '5-10%', color: '#fa709a' },
                                { label: '<5%', color: '#30cfd0' }
                            ].map(item => (
                                <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '2px',
                                        background: item.color
                                    }} />
                                    <span style={{ fontSize: '10px', color: '#6b7280' }}>{item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {loading && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        height: '400px'
                    }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            border: '4px solid #e5e7eb',
                            borderTop: '4px solid #667eea',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                        }} />
                    </div>
                )}
                
                {error && (
                    <div style={{
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #feca57 100%)',
                        color: 'white',
                        padding: '20px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        fontWeight: 'bold'
                    }}>
                        {error}
                    </div>
                )}
                
                {!loading && !error && (
                    <div style={{ position: 'relative', borderRadius: '12px', width: '100%' }}>
                        <svg
                            width="100%"
                            height={dims.height}
                            viewBox={`0 0 ${dims.width} ${dims.height}`}
                            preserveAspectRatio="none" // stretch to fill
                            style={{
                                display: 'block',
                                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                                width: '100%',
                                height: dims.height
                            }}
                        >
                            <defs>
                                {nodes.map((node) => (
                                    <linearGradient
                                        key={`gradient-${node.data.poolid}`}
                                        id={`gradient-${node.data.poolid}`}
                                        x1="0%" y1="0%" x2="100%" y2="100%"
                                    >
                                        <stop offset="0%" stopColor={getSolidColorForValue(node.data.value)} stopOpacity="0.8" />
                                        <stop offset="100%" stopColor={getSolidColorForValue(node.data.value)} stopOpacity="1" />
                                    </linearGradient>
                                ))}
                            </defs>
                            
                            {nodes.map((node) => {
                                const rectWidth = node.x1 - node.x0;
                                const rectHeight = node.y1 - node.y0;
                                const fontSize = Math.min(rectWidth / 8, rectHeight / 4, 18);
                                const percentFontSize = Math.min(rectWidth / 10, rectHeight / 6, 14);
                                const isHovered = hoveredNode === node.data.poolid;
                                
                                return (
                                    <g 
                                        key={node.data.poolid}
                                        onMouseEnter={() => setHoveredNode(node.data.poolid)}
                                        onMouseLeave={() => setHoveredNode(null)}
                                        onClick={() => { console.log('[Heatmap] select pool', node.data.poolid); onSelectPool && onSelectPool(node.data.poolid); }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <rect
                                            x={node.x0}
                                            y={node.y0}
                                            width={rectWidth}
                                            height={rectHeight}
                                            fill={`url(#gradient-${node.data.poolid})`}
                                            stroke="rgba(255,255,255,0.5)"
                                            strokeWidth="2"
                                            rx="8"
                                            ry="8"
                                            style={{
                                                filter: isHovered ? 'brightness(1.1)' : 'none',
                                                transition: 'all 0.3s ease'
                                            }}
                                        />
                                        
                                        {rectWidth > 60 && rectHeight > 40 && (
                                            <>
                                                <text
                                                    x={(node.x0 + node.x1) / 2}
                                                    y={(node.y0 + node.y1) / 2 - percentFontSize / 2}
                                                    textAnchor="middle"
                                                    alignmentBaseline="middle"
                                                    fontSize={fontSize}
                                                    fontWeight="bold"
                                                    fill="white"
                                                    style={{
                                                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                                        fontFamily: 'system-ui, -apple-system, sans-serif'
                                                    }}
                                                >
                                                    {node.data.ticker}
                                                </text>
                                                
                                                <text
                                                    x={(node.x0 + node.x1) / 2}
                                                    y={(node.y0 + node.y1) / 2 + percentFontSize}
                                                    textAnchor="middle"
                                                    alignmentBaseline="middle"
                                                    fontSize={percentFontSize}
                                                    fill="rgba(255,255,255,0.9)"
                                                    style={{
                                                        fontFamily: 'system-ui, -apple-system, sans-serif'
                                                    }}
                                                >
                                                    {(node.data.value * 100).toFixed(1)}%
                                                </text>
                                                
                                                {rectHeight > 80 && (
                                                    <text
                                                        x={(node.x0 + node.x1) / 2}
                                                        y={(node.y0 + node.y1) / 2 + percentFontSize * 2.2}
                                                        textAnchor="middle"
                                                        alignmentBaseline="middle"
                                                        fontSize={percentFontSize * 0.8}
                                                        fill="rgba(255,255,255,0.7)"
                                                        style={{
                                                            fontFamily: 'system-ui, -apple-system, sans-serif'
                                                        }}
                                                    >
                                                        {node.data.geoTag}
                                                    </text>
                                                )}
                                            </>
                                        )}
                                        
                                        {isHovered && (
                                            <rect
                                                x={node.x0}
                                                y={node.y0}
                                                width={rectWidth}
                                                height={rectHeight}
                                                fill="rgba(255,255,255,0.2)"
                                                stroke="white"
                                                strokeWidth="3"
                                                rx="8"
                                                ry="8"
                                                style={{
                                                    pointerEvents: 'none',
                                                    animation: 'pulse 2s infinite'
                                                }}
                                            />
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                        
                        {hoveredNode && (
                            <div style={{
                                position: 'absolute',
                                bottom: '20px',
                                left: '20px',
                                background: 'rgba(255,255,255,0.95)',
                                padding: '15px',
                                borderRadius: '8px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                backdropFilter: 'blur(10px)',
                                maxWidth: '300px'
                            }}>
                                {(() => {
                                    const node = nodes.find(n => n.data.poolid === hoveredNode);
                                    if (!node) return null;
                                    const desc = node.data.eventDescription as string | undefined;
                                    const truncatedDesc = desc && desc.length > 140 ? desc.slice(0, 140) + '...' : (desc || '-');
                                    return (
                                        <>
                                            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                                                {node.data.name} ({node.data.ticker})
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                Liquidity Share: {(node.data.value * 100).toFixed(2)}%
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                                                Region: {node.data.geoTag}
                                            </div>
                                            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                                                Event Types: {node.data.eventTypes.join(', ')}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#374151', marginTop: '8px', lineHeight: 1.4 }}>
                                                Description: {truncatedDesc}
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                @keyframes pulse {
                    0% { opacity: 0.6; }
                    50% { opacity: 0.3; }
                    100% { opacity: 0.6; }
                }
            `}</style>
        </div>
    );
};

export default CoinLiquity;

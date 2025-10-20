import { useState, useEffect, useMemo } from 'react';
import { Copy, TrendingUp, Wallet, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { STATIC_SERIES, type TimeframeKey } from '../mock/candles';

interface MemeToken {
  id: string;
  symbol: string;
  name: string;
  contract_address: string;
  chain: string;
  logo_url: string;
  description: string;
  market_cap: number;
  price: number;
  liquidity: number;
  volume_24h: number;
  volume_1h: number;
  created_at: string;
}

// interface Signal {
//   signal_type: string;
//   initiator_name: string;
//   initiator_avatar: string;
//   price: number;
//   amount: number;
//   signal_time: string;
//   relative_time_minutes: number;
// }

export default function MemeTokenDetail({ goCampaign }: { goCampaign?: () => void }) {
  const [token, setToken] = useState<MemeToken | null>(null);
  const [loading, setLoading] = useState(true);
  // const [signals] = useState<Signal[]>([]); // 移除未使用的signals变量
  const [selectedTab, setSelectedTab] = useState<'signals' | 'holdings'>('signals');
  const [tradeTab, setTradeTab] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [aiExpanded, setAiExpanded] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeKey>('1d');
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  const timeframes: TimeframeKey[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w', '1M'];
  const MAX_CANDLES = 100;
  // Add display constants for icon and symbol
  const DISPLAY_SYMBOL = 'PEPE';
  const DISPLAY_LOGO_URL = '/token_icons/21deed59dc9d05f4995f0ee947a9c753b14ca87f3950a4e3fe1ec1c09c8d462c.png';

  const getSeriesData = (key: TimeframeKey) => {
    const series = STATIC_SERIES[key] ?? STATIC_SERIES['1d'];
    return series.slice(-MAX_CANDLES);
  };

  const chartSummary = useMemo(() => {
    const data = getSeriesData(timeframe);
    if (!data.length) {
      return {
        data,
        linePoints: '',
        areaPoints: '',
        min: 0,
        max: 0,
        lastClose: 0,
        hasData: false,
      };
    }

    const highs = data.map((c) => c.high);
    const lows = data.map((c) => c.low);
    const min = Math.min(...lows);
    const max = Math.max(...highs);
    const range = max - min || Math.max(max * 0.01, 1e-6);

    const toPoint = (value: number, index: number) => {
      const x =
        data.length === 1 ? 0 : Number(((index / (data.length - 1)) * 100).toFixed(2));
      const y = Number((100 - ((value - min) / range) * 100).toFixed(2));
      return `${x},${y}`;
    };

    const linePoints = data.map((candle, index) => toPoint(candle.close, index));

    let areaPoints = '';
    if (linePoints.length >= 2) {
      areaPoints = `0,100 ${linePoints.join(' ')} 100,100`;
    } else if (linePoints.length === 1) {
      areaPoints = `0,100 ${linePoints[0]} 100,100`;
    }

    const lastClose = data[data.length - 1]?.close ?? 0;

    return {
      data,
      linePoints: linePoints.join(' '),
      areaPoints,
      min,
      max,
      lastClose,
      hasData: true,
    };
  }, [timeframe]);

  const gradientId = useMemo(() => `chartGradient-${timeframe}`, [timeframe]);

  useEffect(() => {
    fetchTokenData();
  }, []);

  const fetchTokenData = async () => {
    setLoading(true);

    const fallbackToken: MemeToken = {
      id: 'demo-pepe-1',
      symbol: 'PEPE',
      name: 'Pepe The Frog',
      contract_address: '0x52b492a33e447cdb854c7fc19f1e57e8bfa1777d',
      chain: 'base',
      logo_url: 'https://cryptologos.cc/logos/pepe-pepe-logo.png',
      description: 'Demo token for development preview when Supabase is not configured.',
      market_cap: 12000000,
      price: 0.000358,
      liquidity: 2500000,
      volume_24h: 530000,
      volume_1h: 110000,
      created_at: new Date().toISOString(),
    };

    try {
      const { data: tokenData, error } = await supabase
        .from('meme_tokens')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching token data:', error);
        setToken(fallbackToken);
      } else if (tokenData) {
        setToken(tokenData);
      } else {
        setToken(fallbackToken);
      }
    } catch (error) {
      console.error('An unexpected error occurred:', error);
      setToken(fallbackToken);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (token) {
      navigator.clipboard.writeText(token.contract_address);
    }
  };

  const connectWallet = () => {
    setIsWalletConnected(true);
  };

  const mockAiSummary = "This Meme token shows strong community engagement with increasing trading volume over the past 24 hours. The price action indicates accumulation by larger holders, with multiple buy signals from top-performing Group. Technical indicators suggest potential upward momentum in the short term. Community sentiment is predominantly bullish, with active discussions centered around upcoming catalysts and partnership announcements.";

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white">Loading...</div>
    </div>;
  }

  if (!token) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-white">Failed to load token data. Please try again later.</div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="relative">
                  <img src={DISPLAY_LOGO_URL} alt={DISPLAY_SYMBOL} className="w-16 h-16 rounded-xl" />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-white via-blue-300 to-blue-600 border border-white/60 shadow-sm" />
                </div>
                 <div className="flex-1">
                   <div className="flex items-center gap-3 mb-2">
                     <h1 className="text-2xl font-bold text-white">{DISPLAY_SYMBOL}</h1>
                     <button
                      aria-label="Open campaign"
                      onClick={() => goCampaign?.()}
                      className="px-3 py-1 text-xs font-semibold rounded-full border border-red-500/50 text-red-400 bg-red-500/20 hover:bg-red-500/30 hover:text-red-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      live Campaign
                      <ArrowRight size={14} />
                    </button>
                   </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span className="font-mono">{token.contract_address.slice(0, 6)}...{token.contract_address.slice(-4)}</span>
                    <button onClick={copyAddress} className="hover:text-white transition-colors">
                      <Copy size={14} />
                    </button>
                    <span className="ml-4">Created: {new Date(token.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-6 text-right">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Market Cap</div>
                    <div className="text-white font-semibold">${(token.market_cap / 1000000).toFixed(2)}M</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Price</div>
                    <div className="text-white font-semibold">${token.price.toFixed(6)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Liquidity</div>
                    <div className="text-white font-semibold">${(token.liquidity / 1000000).toFixed(2)}M</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">24h Volume</div>
                    <div className="text-white font-semibold">${(token.volume_24h / 1000000).toFixed(2)}M</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                {timeframes.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      timeframe === tf
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <div className="h-[400px] relative rounded-lg overflow-hidden bg-slate-950/40">
                {chartSummary.hasData ? (
                  <>
                    <svg
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                      className="absolute inset-0 w-full h-full"
                    >
                      <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {chartSummary.areaPoints && (
                        <polygon
                          points={chartSummary.areaPoints}
                          fill={`url(#${gradientId})`}
                          stroke="none"
                        />
                      )}
                      {chartSummary.linePoints && (
                        <polyline
                          points={chartSummary.linePoints}
                          fill="none"
                          stroke="#22c55e"
                          strokeWidth={1.5}
                        />
                      )}
                    </svg>
                    <div className="absolute top-4 left-4 text-xs text-slate-400 space-y-1">
                      <div>High: <span className="text-emerald-300">${chartSummary.max.toFixed(6)}</span></div>
                      <div>Low: <span className="text-rose-300">${chartSummary.min.toFixed(6)}</span></div>
                    </div>
                    <div className="absolute top-4 right-4 text-right text-xs text-slate-400">
                      <div className="text-2xl font-semibold text-white">${chartSummary.lastClose.toFixed(6)}</div>
                      <div>Last Price</div>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <TrendingUp size={36} className="opacity-20" />
                    <span className="text-sm">No chart data available.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl">
              <div className="flex border-b border-slate-800">
                <button
                  onClick={() => setSelectedTab('signals')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    selectedTab === 'signals'
                      ? 'text-white border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Group Signals
                </button>
                <button
                  onClick={() => setSelectedTab('holdings')}
                  className={`flex-1 px-6 py-4 font-medium transition-colors ${
                    selectedTab === 'holdings'
                      ? 'text-white border-b-2 border-emerald-500'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  My Holdings
                </button>
              </div>

              {selectedTab === 'signals' ? (
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src="/group_icons/2025-10-19 16.33.25.jpg"
                      alt="Group Avatar"
                      className="w-10 h-10 rounded-lg"
                    />
                    <span className="font-medium text-white">0xSun_VIP群</span>
                  </div>
                  <div className="space-y-2">
                    <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-semibold text-slate-400 border-b border-slate-800">
                      <span>Time</span>
                      <span>Type</span>
                      <span>Initiator</span>
                      <span className="text-right">Price</span>
                      <span className="text-right">Amount</span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-6 gap-4 px-4 py-3 rounded-lg hover:bg-slate-800/30">
                      <span className="text-sm text-slate-300">10:24:15</span>
                      <span className="text-sm">
                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                          Leader Call
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <img
                          src="/group_icons/ej9BX01I_400x400.png"
                          alt="Leader"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                        <span className="text-sm text-slate-300">@0xSun</span>
                      </div>
                      <span className="text-sm text-slate-300 text-right">$0.000356</span>
                      <span className="text-sm text-slate-300 text-right">-</span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-6 gap-4 px-4 py-3 rounded-lg hover:bg-slate-800/30">
                      <span className="text-sm text-slate-400">+2m</span>
                      <span className="text-sm">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                          Follow
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500" />
                        <span className="text-sm text-slate-400 font-mono">0x1a2b...3c4d</span>
                      </div>
                      <span className="text-sm text-slate-300 text-right">$0.000358</span>
                      <span className="text-sm text-slate-300 text-right">0.5 ETH</span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-6 gap-4 px-4 py-3 rounded-lg hover:bg-slate-800/30">
                      <span className="text-sm text-slate-400">+3m</span>
                      <span className="text-sm">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                          Follow
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-teal-500" />
                        <span className="text-sm text-slate-400 font-mono">0x5e6f...7a8b</span>
                      </div>
                      <span className="text-sm text-slate-300 text-right">$0.000360</span>
                      <span className="text-sm text-slate-300 text-right">0.2 ETH</span>
                      <span></span>
                    </div>
                    <div className="grid grid-cols-6 gap-4 px-4 py-3 rounded-lg hover:bg-slate-800/30">
                      <span className="text-sm text-slate-400">+5m</span>
                      <span className="text-sm">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-medium">
                          Follow
                        </span>
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-green-500 to-yellow-500" />
                        <span className="text-sm text-slate-400 font-mono">0xb1c2...d3e4</span>
                      </div>
                      <span className="text-sm text-slate-300 text-right">$0.000355</span>
                      <span className="text-sm text-slate-300 text-right">1 ETH</span>
                      <span></span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  {!isWalletConnected ? (
                    <div className="text-center py-12">
                      <Wallet size={48} className="mx-auto mb-4 text-slate-600" />
                      <p className="text-slate-400 mb-4">Please connect your wallet to view holdings</p>
                      <button
                        onClick={connectWallet}
                        className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                      >
                        Connect Wallet
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-sm text-slate-400 mb-2">Wallet: 0x1234...5678</div>
                      <div className="bg-slate-800/50 rounded-lg p-4">
                        <div className="grid grid-cols-5 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400 mb-1">Balance</div>
                            <div className="text-white font-medium">1,500,000 {DISPLAY_SYMBOL}</div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Avg Price</div>
                            <div className="text-white font-medium">$0.000320</div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Total Invested</div>
                            <div className="text-white font-medium">$480</div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">Current Value</div>
                            <div className="text-white font-medium">$534</div>
                          </div>
                          <div>
                            <div className="text-slate-400 mb-1">P&L</div>
                            <div className="text-emerald-400 font-medium">+$54 (+11.25%)</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">AI Summary</h3>
              <div className={`text-sm text-slate-300 leading-relaxed ${!aiExpanded ? 'line-clamp-5' : ''}`}>
                {mockAiSummary}
              </div>
              {mockAiSummary.length > 200 && (
                <button
                  onClick={() => setAiExpanded(!aiExpanded)}
                  className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  {aiExpanded ? 'Show less' : 'Read more'}
                </button>
              )}
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setTradeTab('buy')}
                  className={`flex-1 py-2 font-medium rounded-lg transition-colors ${
                    tradeTab === 'buy'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Buy
                </button>
                <button
                  onClick={() => setTradeTab('sell')}
                  className={`flex-1 py-2 font-medium rounded-lg transition-colors ${
                    tradeTab === 'sell'
                      ? 'bg-red-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Sell
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm text-slate-400 mb-2">
                    <span>{tradeTab === 'buy' ? 'ETH' : DISPLAY_SYMBOL} Balance</span>
                    <span>{tradeTab === 'buy' ? '2.5 ETH' : '1,500,000'}</span>
                  </div>

                  {tradeTab === 'buy' ? (
                    <div className="flex gap-2 mb-3">
                      {['0.01', '0.02', '0.5', '1'].map((val) => (
                        <button
                          key={val}
                          onClick={() => setAmount(val)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded transition-colors"
                        >
                          {val} ETH
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="flex gap-2 mb-3">
                      {['10%', '25%', '50%', '75%', '100%'].map((val) => (
                        <button
                          key={val}
                          onClick={() => setAmount(val)}
                          className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded transition-colors"
                        >
                          {val}
                        </button>
                      ))}
                    </div>
                  )}

                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={tradeTab === 'buy' ? 'Enter ETH amount' : 'Enter token amount'}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Slippage</span>
                  <span className="text-white">5%</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Gas Fee</span>
                  <span className="text-white">Standard</span>
                </div>

                <button
                  onClick={connectWallet}
                  className={`w-full py-4 font-semibold rounded-lg transition-colors ${
                    tradeTab === 'buy'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {!isWalletConnected
                    ? 'Connect Wallet'
                    : amount
                    ? `${tradeTab === 'buy' ? 'Buy' : 'Sell'} ${amount} ${tradeTab === 'buy' ? 'ETH' : DISPLAY_SYMBOL}`
                    : `Quick ${tradeTab === 'buy' ? 'Buy' : 'Sell'}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

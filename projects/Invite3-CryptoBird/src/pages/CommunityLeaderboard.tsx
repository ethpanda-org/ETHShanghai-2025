import { useState, useEffect, Fragment } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Treemap, ResponsiveContainer } from 'recharts';

interface Community {
  id: string;
  name: string;
  avatar_url: string;
  member_count: number;
  win_rate_10m: number;
  win_rate_1h: number;
  win_rate_24h: number;
  signal_count_24h: number;
  trading_volume: number;
  top_tokens: Array<{
    symbol: string;
    logo: string;
    created_at?: string;
    contract_address?: string;
    signal_time?: string;
    signal_price?: number;
    current_price?: number;
    multiplier?: number;
  }>;
  mindshare?: number;
}

// Helpers: formatters and token enrichment
const formatDateTime = (iso?: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day} ${hh}:${mm}`;
};

const formatPrice = (n?: number) => (n === undefined ? '-' : `$${n.toFixed(6)}`);
const shortAddress = (addr?: string) => (addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-');

const seeded = (seed: number) => {
  let x = seed % 2147483647;
  return () => {
    x = (x * 48271) % 2147483647;
    return x / 2147483647;
  };
};

const makeHex = (rng: () => number, len: number) => {
  const hex = '0123456789abcdef';
  let s = '';
  for (let i = 0; i < len; i++) s += hex[Math.floor(rng() * 16)];
  return s;
};

const enrichTokenMeta = (token: { symbol: string; logo: string }, seed: number) => {
  const rng = seeded(seed + token.symbol.length);
  const now = Date.now();
  const created = new Date(now - Math.floor(rng() * 1000 * 60 * 60 * 24 * 7));
  const signal = new Date(now - Math.floor(rng() * 1000 * 60 * 60));
  const signalPrice = Number((rng() * 0.01 + 0.0001).toFixed(6));
  const multiplier = Number((rng() * 10 + 0.5).toFixed(2));
  const currentPrice = Number((signalPrice * multiplier).toFixed(6));
  const address = `0x${makeHex(rng, 40)}`;
  return {
    ...token,
    created_at: created.toISOString(),
    contract_address: address,
    signal_time: signal.toISOString(),
    signal_price: signalPrice,
    current_price: currentPrice,
    multiplier,
  };
};

export default function CommunityLeaderboard() {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'win_rate' | 'win_rate_10m' | 'win_rate_1h' | 'volume' | 'signals' | 'members'>('win_rate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchCommunities();
  }, []);

  const fetchCommunities = async () => {
    const { data, error } = await supabase
      .from('communities')
      .select('*')
      .order('win_rate_24h', { ascending: false });

    if (data && !error) {
      setCommunities(data);
    }
  };

  const sortedCommunities = [...communities].sort((a, b) => {
    switch (sortBy) {
      case 'win_rate':
        return b.win_rate_24h - a.win_rate_24h;
      case 'volume':
        return b.trading_volume - a.trading_volume;
      case 'signals':
        return b.signal_count_24h - a.signal_count_24h;
      case 'members':
        return b.member_count - a.member_count;
      default:
        return 0;
    }
  });

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const calculateAvatarSize = (signals: number, winRate: number) => {
    const score = signals * (winRate / 100);
    const minSize = 60;
    const maxSize = 140;
    const normalizedScore = Math.min(score / 5000, 1);
    return minSize + (maxSize - minSize) * normalizedScore;
  };

  const mockTopGroups: Community[] = [
    {
      id: 'mock-1',
      name: 'TopDog-官方社区',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=TopDog',
      member_count: 4200,
      win_rate_10m: 66.5,
      win_rate_1h: 82.0,
      win_rate_24h: 0.82,
      signal_count_24h: 320,
      trading_volume: 120000000,
      top_tokens: [
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE' },
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE' },
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE' },
      ],
    },
    {
      id: 'mock-2',
      name: '💎GMGN 100X 官方中文群',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=GMGN100X',
      member_count: 4005,
      win_rate_10m: 65.2,
      win_rate_1h: 81.2,
      win_rate_24h: 0.79,
      signal_count_24h: 305,
      trading_volume: 112000000,
      top_tokens: [
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE2' },
        { symbol: 'WAGMI', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=WAGMI' },
        { symbol: 'CAT', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=CAT' },
      ],
    },
    {
      id: 'mock-3',
      name: '财富自由之路——Crypto哈哈哥',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=CryptoHaha',
      member_count: 3850,
      win_rate_10m: 64.0,
      win_rate_1h: 80.1,
      win_rate_24h: 0.76,
      signal_count_24h: 298,
      trading_volume: 108000000,
      top_tokens: [
        { symbol: 'MEME', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=MEME' },
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE3' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH' },
      ],
    },
    {
      id: 'mock-4',
      name: '阿布说币',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=AbuCoin',
      member_count: 3600,
      win_rate_10m: 63.2,
      win_rate_1h: 79.6,
      win_rate_24h: 0.74,
      signal_count_24h: 284,
      trading_volume: 98000000,
      top_tokens: [
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE2' },
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE4' },
        { symbol: 'FROG', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=FROG' },
      ],
    },
    {
      id: 'mock-5',
      name: '简约DAO Call',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=SimpleDAOCall',
      member_count: 3350,
      win_rate_10m: 62.1,
      win_rate_1h: 78.5,
      win_rate_24h: 0.71,
      signal_count_24h: 260,
      trading_volume: 93000000,
      top_tokens: [
        { symbol: 'DAO', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DAO' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH2' },
        { symbol: 'WAGMI', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=WAGMI2' },
      ],
    },
    {
      id: 'mock-6',
      name: '聪明钱监控群',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=SmartMoneyMonitor',
      member_count: 3420,
      win_rate_10m: 61.5,
      win_rate_1h: 78.1,
      win_rate_24h: 0.69,
      signal_count_24h: 245,
      trading_volume: 90000000,
      top_tokens: [
        { symbol: 'ALPHA', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ALPHA' },
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE3' },
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE2' },
      ],
    },
    {
      id: 'mock-7',
      name: 'Crypto Bull Alert',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=CryptoBullAlert',
      member_count: 3280,
      win_rate_10m: 60.4,
      win_rate_1h: 77.2,
      win_rate_24h: 0.66,
      signal_count_24h: 232,
      trading_volume: 88000000,
      top_tokens: [
        { symbol: 'BULL', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BULL' },
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE5' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH3' },
      ],
    },
    {
      id: 'mock-8',
      name: '土狗消消乐',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=DogXiaoXiaoLe',
      member_count: 3100,
      win_rate_10m: 58.9,
      win_rate_1h: 75.3,
      win_rate_24h: 0.63,
      signal_count_24h: 220,
      trading_volume: 76000000,
      top_tokens: [
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE5' },
        { symbol: 'MEME', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=MEME2' },
        { symbol: 'CAT', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=CAT2' },
      ],
    },
    {
      id: 'mock-9',
      name: 'MEME Signal',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=MEMESignal',
      member_count: 3005,
      win_rate_10m: 58.1,
      win_rate_1h: 75.0,
      win_rate_24h: 0.60,
      signal_count_24h: 208,
      trading_volume: 72000000,
      top_tokens: [
        { symbol: 'MEME', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=MEME3' },
        { symbol: 'WAGMI', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=WAGMI3' },
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE6' },
      ],
    },
    {
      id: 'mock-10',
      name: 'Base 100X',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=Base100X',
      member_count: 2950,
      win_rate_10m: 57.3,
      win_rate_1h: 74.1,
      win_rate_24h: 0.58,
      signal_count_24h: 201,
      trading_volume: 68000000,
      top_tokens: [
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE4' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH4' },
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE6' },
      ],
    },
    {
      id: 'mock-11',
      name: 'Snow_Wolf_Guild',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=SnowWolfGuild',
      member_count: 2900,
      win_rate_10m: 56.7,
      win_rate_1h: 73.5,
      win_rate_24h: 0.55,
      signal_count_24h: 195,
      trading_volume: 64000000,
      top_tokens: [
        { symbol: 'SNOW', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=SNOW' },
        { symbol: 'WOLF', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=WOLF' },
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE5' },
      ],
    },
    {
      id: 'mock-12',
      name: '币安人生',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BinanceLife',
      member_count: 3155,
      win_rate_10m: 60.9,
      win_rate_1h: 77.8,
      win_rate_24h: 0.52,
      signal_count_24h: 210,
      trading_volume: 85000000,
      top_tokens: [
        { symbol: 'BNB', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BNB' },
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE7' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH5' },
      ],
    },
    {
      id: 'mock-13',
      name: 'A8俱乐部',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=A8Club',
      member_count: 2888,
      win_rate_10m: 56.1,
      win_rate_1h: 73.1,
      win_rate_24h: 0.49,
      signal_count_24h: 188,
      trading_volume: 62000000,
      top_tokens: [
        { symbol: 'A8', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=A8' },
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE6' },
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE7' },
      ],
    },
    {
      id: 'mock-14',
      name: '0x_Sun VIP群',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=0xSunVIP',
      member_count: 2760,
      win_rate_10m: 55.0,
      win_rate_1h: 72.0,
      win_rate_24h: 0.46,
      signal_count_24h: 176,
      trading_volume: 59000000,
      top_tokens: [
        { symbol: 'SUN', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=SUN' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH6' },
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE8' },
      ],
    },
    {
      id: 'mock-15',
      name: '0x江屿土狗暴富营',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=0xJiangyuRich',
      member_count: 2680,
      win_rate_10m: 54.2,
      win_rate_1h: 71.5,
      win_rate_24h: 0.43,
      signal_count_24h: 168,
      trading_volume: 56000000,
      top_tokens: [
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE9' },
        { symbol: 'MEME', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=MEME4' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH7' },
      ],
    },
    {
      id: 'mock-16',
      name: 'Virtuals toda Moon',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=VirtualsToDaMoon',
      member_count: 2605,
      win_rate_10m: 53.7,
      win_rate_1h: 71.0,
      win_rate_24h: 0.40,
      signal_count_24h: 160,
      trading_volume: 54000000,
      top_tokens: [
        { symbol: 'MOON', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=MOON' },
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE7' },
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE8' },
      ],
    },
    {
      id: 'mock-17',
      name: 'maji family',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=MajiFamily',
      member_count: 2520,
      win_rate_10m: 52.9,
      win_rate_1h: 70.3,
      win_rate_24h: 0.37,
      signal_count_24h: 152,
      trading_volume: 51000000,
      top_tokens: [
        { symbol: 'MAJI', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=MAJI' },
        { symbol: 'CAT', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=CAT3' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH8' },
      ],
    },
    {
      id: 'mock-18',
      name: "bruce's friends",
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BrucesFriends',
      member_count: 2450,
      win_rate_10m: 52.1,
      win_rate_1h: 69.9,
      win_rate_24h: 0.34,
      signal_count_24h: 148,
      trading_volume: 48000000,
      top_tokens: [
        { symbol: 'BRU', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BRU' },
        { symbol: 'WAGMI', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=WAGMI4' },
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE10' },
      ],
    },
    {
      id: 'mock-19',
      name: 'BEN Crypto Signal',
      avatar_url: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=BenSignal',
      member_count: 2380,
      win_rate_10m: 51.6,
      win_rate_1h: 69.1,
      win_rate_24h: 0.32,
      signal_count_24h: 142,
      trading_volume: 45000000,
      top_tokens: [
        { symbol: 'BEN', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BEN' },
        { symbol: 'ETH', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=ETH9' },
        { symbol: 'BASE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=BASE8' },
      ],
    },
    {
      id: 'mock-20',
      name: 'Pepe Lab',
      avatar_url: '/SZnLyzkG_400x400.jpg',
      member_count: 2300,
      win_rate_10m: 50.9,
      win_rate_1h: 68.5,
      win_rate_24h: 0.30,
      signal_count_24h: 136,
      trading_volume: 42000000,
      top_tokens: [
        { symbol: 'PEPE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=PEPE9' },
        { symbol: 'MEME', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=MEME5' },
        { symbol: 'DOGE', logo: 'https://api.dicebear.com/7.x/identicon/svg?seed=DOGE11' },
      ],
    },
  ];

  const calculateTileSizeByMindshare = (ms: number, minMs: number, maxMs: number) => {
    const minSize = 150; // px
    const maxSize = 240; // px
    const minArea = minSize * minSize;
    const maxArea = maxSize * maxSize;
    const range = Math.max(maxMs - minMs, 0.0001);
    const t = Math.max(0, Math.min(1, (ms - minMs) / range));
    const area = minArea + (maxArea - minArea) * t; // area ∝ mindshare
    return Math.sqrt(area);
  };

  // 自定义 Treemap 节点内容，使用 foreignObject 实现与示例一致的 HTML 布局
  const TreemapTile = (props: any) => {
    const { x, y, width, height, name, depth, payload } = props;
    const img = payload?.avatar_url;
    const value: number = typeof payload?.sizeDisplayed === 'number' ? payload.sizeDisplayed : 0;
    const positive = (payload?.win_rate_24h ?? 0) >= 0;

    if (depth === 0) {
      return (
        <g className="recharts-layer recharts-treemap-depth-0">
          <g className="recharts-layer">
            <g>
              <rect x={x} y={y} width={width} height={height} stroke="var(--primary)" strokeWidth={0}></rect>
              <foreignObject x={x + 1} y={y + 1} width={Math.max(width - 2, 0)} height={Math.max(height - 2, 0)} className="relative text-base-white">
                <div className="relative flex h-full w-full items-center gap-2 overflow-hidden">
                  <div className="absolute inset-0 h-full w-full bg-gradient-to-br from-black/60 to-50%"></div>
                  <div className="absolute inset-0 flex flex-col px-1 py-1 pr-0 font-medium">
                    <div style={{ transform: 'scale(1)', transformOrigin: '0% 0%' }}>
                      <p className="truncate rounded text-sm font-semibold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)]"></p>
                      <div className="mt-px inline-flex items-center gap-1 text-xs font-medium text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)]">-</div>
                    </div>
                  </div>
                </div>
              </foreignObject>
            </g>
          </g>
        </g>
      );
    }

    return (
      <g className="recharts-layer recharts-treemap-depth-1">
        <g className="recharts-layer">
          <g>
            <rect x={x} y={y} width={width} height={height} stroke="var(--primary)" strokeWidth={0}></rect>
            <foreignObject x={x + 1} y={y + 1} width={Math.max(width - 2, 0)} height={Math.max(height - 2, 0)} className="relative text-base-white">
              <a href="#" rel="prefetch" className="relative block h-full w-full overflow-hidden hover:scale-[0.99] transition-transform hover:opacity-95">
                <img className="absolute inset-0 w-full h-full object-cover bg-secondary select-none" alt={name} draggable="false" src={img} />
                <div className="absolute inset-0 h-full w-full bg-gradient-to-br to-50% from-green-400/60 to-green-400/30"></div>
                <div className="absolute inset-0 flex flex-col px-1 py-1 pr-0 font-medium">
                  <div style={{ transform: 'scale(1)', transformOrigin: '0% 0%' }}>
                    <p className="truncate rounded text-sm font-semibold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)]">{name}</p>
                    <div className="mt-px inline-flex items-center gap-1 text-xs font-medium text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)]">{Number.isFinite(value) ? value.toFixed(2) : '-'}</div>
                    <span className="shrink-0 items-center gap-1 mt-0.5 text-xs font-medium text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)]">
                      <span className={`inline-block font-mono shrink-0 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{positive ? '▲' : '▼'}</span>
                      {typeof payload?.win_rate_24h === 'number' && (
                        <span className="ml-1 inline-block shrink-0 tracking-tighter">{payload.win_rate_24h.toFixed(2)}%</span>
                      )}
                    </span>
                  </div>
                </div>
              </a>
            </foreignObject>
          </g>
        </g>
      </g>
    );
  };
  const localAvatars = [
    '/group_icons/SZnLyzkG_400x400.jpg',
    '/group_icons/ej9BX01I_400x400.png',
    '/group_icons/nzlqBIZQ_400x400.jpg',
    '/group_icons/2025-10-19%2016.30.46.jpg',
    '/group_icons/2025-10-19%2016.31.00.jpg',
    '/group_icons/2025-10-19%2016.31.10.jpg',
    '/group_icons/2025-10-19%2016.31.18.jpg',
    '/group_icons/2025-10-19%2016.31.38.jpg',
    '/group_icons/2025-10-19%2016.31.47.jpg',
    '/group_icons/2025-10-19%2016.31.58.jpg',
    '/group_icons/2025-10-19%2016.32.06.jpg',
    '/group_icons/2025-10-19%2016.32.16.jpg',
    '/group_icons/2025-10-19%2016.32.25.jpg',
    '/group_icons/2025-10-19%2016.32.36.jpg',
    '/group_icons/2025-10-19%2016.32.45.jpg',
    '/group_icons/2025-10-19%2016.33.13.jpg',
    '/group_icons/2025-10-19%2016.33.25.jpg',
    '/group_icons/2025-10-19%2016.33.58.jpg',
    '/group_icons/2025-10-19%2016.34.23.jpg',
    '/group_icons/2025-10-19%2016.34.36.jpg',
  ];

  // 从 public/group_icons 使用根路径静态资源
  const groupIconUrls = localAvatars;
  // 引入本地 token icons（webp/png/jpg/jpeg），作为URL字符串使用
  const tokenIconUrls = [
    '/token_icons/3c6759fe14393bfc189c14058f158534.webp',
    '/token_icons/4f87908c85be4d8ccdcec7fbf0acf7f4.webp',
    '/token_icons/6d34d3d8ae908d910be991d7031f7a3f_v2l.webp',
    '/token_icons/98377fde34fe769bdb3b0a114d6cc6c0.webp',
    '/token_icons/cd68c7bfa7d4b5b8363467c93a052cde.webp',
    '/token_icons/ce05864f229d1fc421607dd709605508.webp',
    '/token_icons/e34a41abbd659242fb9a20b5c8f97aaf_v2l.webp',
    '/token_icons/f850788494ba8ad70982fec3c55d0b1f.webp',
  ];

  const topCommunities = mockTopGroups.map((g, i) => ({
    ...g,
    avatar_url: groupIconUrls.length ? groupIconUrls[i % groupIconUrls.length] : localAvatars[i % localAvatars.length],
  }));

  const msValues = topCommunities.map((c) =>
    typeof c.mindshare === 'number'
      ? c.mindshare
      : (c.win_rate_24h && c.win_rate_24h <= 1) ? c.win_rate_24h : (c.win_rate_1h ? c.win_rate_1h / 100 : 0.3)
  );
  const minMindshare = Math.min(...msValues);
  const maxMindshare = Math.max(...msValues);

  // Treemap 数据，size 用于面积，sizeDisplayed 用于文本显示
  const treemapData = topCommunities.map((c, i) => {
    const ms = typeof c.mindshare === 'number'
      ? c.mindshare
      : (c.win_rate_24h && c.win_rate_24h <= 1) ? c.win_rate_24h : (c.win_rate_1h ? c.win_rate_1h / 100 : 0.3);
    return {
      name: c.name,
      size: Math.max(ms, 0.001),
      sizeDisplayed: ms,
      avatar_url: c.avatar_url,
      win_rate_24h: c.win_rate_24h,
      id: c.id,
      index: i,
    };
  });

  // Group Rankings mock (20 items) using local avatars; normalize 24h win rate to percentage
  const mockRankingGroups = mockTopGroups.map((g, i) => ({
    ...g,
    avatar_url: groupIconUrls.length ? groupIconUrls[i % groupIconUrls.length] : localAvatars[i % localAvatars.length],
    win_rate_24h: g.win_rate_24h <= 1 ? g.win_rate_24h * 100 : g.win_rate_24h,
    top_tokens: g.top_tokens.map((t, ti) => {
      const icon = tokenIconUrls.length > 0 ? tokenIconUrls[(i * 3 + ti) % tokenIconUrls.length] : t.logo;
      return enrichTokenMeta({ ...t, logo: icon }, i * 100 + ti);
    }),
  }));

  const sortedRanking = [...mockRankingGroups].sort((a, b) => {
    let va = 0;
    let vb = 0;
    switch (sortBy) {
      case 'win_rate':
        va = a.win_rate_24h; vb = b.win_rate_24h; break;
      case 'win_rate_10m':
        va = a.win_rate_10m; vb = b.win_rate_10m; break;
      case 'win_rate_1h':
        va = a.win_rate_1h; vb = b.win_rate_1h; break;
      case 'volume':
        va = a.trading_volume; vb = b.trading_volume; break;
      case 'signals':
        va = a.signal_count_24h; vb = b.signal_count_24h; break;
      case 'members':
        va = a.member_count; vb = b.member_count; break;
      default:
        va = 0; vb = 0;
    }
    const cmp = va - vb;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <header className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2">Meme Group Leaderboard</h1>
          <p className="text-slate-400">Discover high-performing meme Group and trading signals</p>
        </header>

        <section className="mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">🔥</span>
              Top Group
            </h2>
          </div>

          <div className="relative">
              <div className="w-full">
                <div className="relative h-[540px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={treemapData}
                      dataKey="size"
                      isAnimationActive={false}
                      stroke="var(--primary)"
                      content={<TreemapTile />}
                    />
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Group Rankings
            </h2>
            <div className="flex gap-2">
              // removed sorting buttons
            </div>
          </div>

          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Group</th>
                    <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">10m Win Rate
                      <span className="inline-flex flex-col align-middle ml-1">
                        <button aria-label="Sort 10m Win Rate Asc" onClick={() => { setSortBy('win_rate_10m'); setSortDir('asc'); }} className={`${sortBy==='win_rate_10m' && sortDir==='asc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronUp size={14} />
                        </button>
                        <button aria-label="Sort 10m Win Rate Desc" onClick={() => { setSortBy('win_rate_10m'); setSortDir('desc'); }} className={`${sortBy==='win_rate_10m' && sortDir==='desc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    </th>
                    <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">1h Win Rate
                      <span className="inline-flex flex-col align-middle ml-1">
                        <button aria-label="Sort 1h Win Rate Asc" onClick={() => { setSortBy('win_rate_1h'); setSortDir('asc'); }} className={`${sortBy==='win_rate_1h' && sortDir==='asc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronUp size={14} />
                        </button>
                        <button aria-label="Sort 1h Win Rate Desc" onClick={() => { setSortBy('win_rate_1h'); setSortDir('desc'); }} className={`${sortBy==='win_rate_1h' && sortDir==='desc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    </th>
                    <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">24h Win Rate
                      <span className="inline-flex flex-col align-middle ml-1">
                        <button aria-label="Sort 24h Win Rate Asc" onClick={() => { setSortBy('win_rate'); setSortDir('asc'); }} className={`${sortBy==='win_rate' && sortDir==='asc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronUp size={14} />
                        </button>
                        <button aria-label="Sort 24h Win Rate Desc" onClick={() => { setSortBy('win_rate'); setSortDir('desc'); }} className={`${sortBy==='win_rate' && sortDir==='desc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    </th>
                    <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">Signals
                      <span className="inline-flex flex-col align-middle ml-1">
                        <button aria-label="Sort Signals Asc" onClick={() => { setSortBy('signals'); setSortDir('asc'); }} className={`${sortBy==='signals' && sortDir==='asc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronUp size={14} />
                        </button>
                        <button aria-label="Sort Signals Desc" onClick={() => { setSortBy('signals'); setSortDir('desc'); }} className={`${sortBy==='signals' && sortDir==='desc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    </th>
                    <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">In-Group Volume
                      <span className="inline-flex flex-col align-middle ml-1">
                        <button aria-label="Sort In-Group Volume Asc" onClick={() => { setSortBy('volume'); setSortDir('asc'); }} className={`${sortBy==='volume' && sortDir==='asc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronUp size={14} />
                        </button>
                        <button aria-label="Sort In-Group Volume Desc" onClick={() => { setSortBy('volume'); setSortDir('desc'); }} className={`${sortBy==='volume' && sortDir==='desc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    </th>
                    <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">Members
                      <span className="inline-flex flex-col align-middle ml-1">
                        <button aria-label="Sort Members Asc" onClick={() => { setSortBy('members'); setSortDir('asc'); }} className={`${sortBy==='members' && sortDir==='asc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronUp size={14} />
                        </button>
                        <button aria-label="Sort Members Desc" onClick={() => { setSortBy('members'); setSortDir('desc'); }} className={`${sortBy==='members' && sortDir==='desc' ? 'text-emerald-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          <ChevronDown size={14} />
                        </button>
                      </span>
                    </th>
                    <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300">Top Tokens</th>
                    <th className="text-center px-4 py-4 text-sm font-semibold text-slate-300"></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedRanking.map((community) => (
                    <Fragment key={community.id}>
                      <tr
                      key={community.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={community.avatar_url}
                            alt={community.name}
                            className="w-10 h-10 rounded-lg border border-slate-700"
                          />
                          <span className="font-medium text-white">{community.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-emerald-400 font-medium">{community.win_rate_10m.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-emerald-400 font-medium">{community.win_rate_1h.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-emerald-400 font-medium">{community.win_rate_24h.toFixed(1)}%</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-blue-400 font-medium">{community.signal_count_24h.toLocaleString()}</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-purple-400 font-medium">${(community.trading_volume / 1000000).toFixed(1)}M</span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className="text-slate-300">{community.member_count}</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center gap-1">
                          {community.top_tokens.slice(0, 3).map((token, i) => (
                            <img
                              key={i}
                              src={token.logo}
                              alt={token.symbol}
                              className="w-6 h-6 rounded-full border border-slate-600"
                            />
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleRow(community.id)}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {expandedRows.has(community.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </td>
                    </tr>
                    {expandedRows.has(community.id) && (
                      <tr className="border-b border-slate-800/50">
                        <td colSpan={9} className="px-6 py-4 bg-slate-900/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {community.top_tokens.slice(0, 6).map((token, i) => (
                              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-800 bg-slate-900/50">
                                <img src={token.logo} alt={token.symbol} className="w-8 h-8 rounded-md border border-slate-700" />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-white font-semibold">{token.symbol}</span>
                                    <span className="text-slate-400 text-xs">{formatDateTime(token.created_at)}</span>
                                  </div>
                                  <div className="mt-1 text-xs text-slate-400">
                                    <div>Address: <span className="font-mono">{shortAddress(token.contract_address)}</span></div>
                                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                                      <span>Signal: {formatDateTime(token.signal_time)}</span>
                                      <span>Signal Price: <span className="text-blue-400">{formatPrice(token.signal_price)}</span></span>
                                      <span>Current: <span className="text-purple-400">{formatPrice(token.current_price)}</span></span>
                                      <span className="text-emerald-400 font-semibold">×{typeof token.multiplier === 'number' ? token.multiplier.toFixed(2) : '-'}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

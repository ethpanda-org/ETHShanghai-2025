import { useState, useEffect } from 'react';
import { TrendingUp, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Treemap, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

interface Community {
  id: string;
  name: string;
  avatar_url: string;
  owner_telegram_username: string;
  owner_avatar_url: string; 
  win_rate_1h: number;
  mindshare: number;
  mindshare_change: number;
}

interface Discussion {
  id: string;
  community_name: string;
  community_avatar: string;
  ai_summary: string;
  engagement_score: number;
  discussion_time: string;
}

export default function CampaignDetail({ onTradeNow }: { onTradeNow?: () => void }) {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  // 新增：加载与错误状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: communityData, error: communityError } = await supabase
        .from('communities')
        .select('*')
        .order('win_rate_24h', { ascending: false })
        .limit(25);

      if (communityError) {
        setError(communityError.message || 'Failed to load communities');
      }

      let list: Community[] = [];

      if (communityData && communityData.length > 0) {
        list = communityData.map((c: any, i: number) => ({
          id: c.id,
          name: c.name,
          avatar_url: groupIconUrls.length
            ? groupIconUrls[stringHash((c.id || c.name || String(i)) as string) % groupIconUrls.length]
            : c.avatar_url,
          owner_telegram_username: mockOwnerNames[i % mockOwnerNames.length],
          owner_avatar_url: groupIconUrls.length
            ? groupIconUrls[(stringHash((c.id || c.name || String(i)) as string) + 7) % groupIconUrls.length]
            : c.owner_avatar_url,
          // 兼容：优先使用 1h 胜率，否则回退到 24h 或默认值
          win_rate_1h:
            typeof c.win_rate_1h === 'number'
              ? c.win_rate_1h
              : typeof c.win_rate_24h === 'number'
              ? c.win_rate_24h
              : 50,
          mindshare: (typeof c.mindshare === 'number' && c.mindshare > 0)
            ? c.mindshare
            : +(0.001 + Math.random() * 0.019).toFixed(5),
          mindshare_change: (Math.random() - 0.5) * 0.1,
        }));
      } else {
        // 开发环境下的回退示例数据（扩展到 10 条）
        list = Array.from({ length: 10 }).map((_, i) => ({
          id: `c${i + 1}`,
          name: (
            [
              '币圈猎狗群',
              'DeFi先锋DAO',
              'APE冲浪队',
              'CJAY.somi',
              'Bellick Kruz🌿',
              'Meme 星球',
              'Base Apes',
              'Shiba Traders',
              'Solana Hunters',
              'ETH Degens',
            ][i] || `社群 ${i + 1}`
          ),
          avatar_url: groupIconUrls.length
            ? groupIconUrls[stringHash(`group${i + 1}`) % groupIconUrls.length]
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=group${i + 1}`,
          owner_telegram_username: mockOwnerNames[i % mockOwnerNames.length],
          owner_avatar_url: groupIconUrls.length
            ? groupIconUrls[(stringHash(`group${i + 1}`) + 7) % groupIconUrls.length]
            : `https://api.dicebear.com/7.x/avataaars/svg?seed=owner${i + 1}`,
          win_rate_1h: 55 + (i % 5) * 5 + (i % 3),
          mindshare: +(0.001 + Math.random() * 0.019).toFixed(5),
          mindshare_change: ((i % 2 === 0) ? 1 : -1) * (0.01 + (i % 3) * 0.01),
        }));
      }

      // 使用你提供的群名称覆盖列表
      const providedNames = [
        'TopDog-官方社区',
        '💎GMGN 100X 官方中文群',
        '财富自由之路——Crypto哈哈哥',
        '阿布说币',
        '简约DAO Call',
        '聪明钱监控群',
        'Crypto Bull Alert',
        '土狗消消乐',
        'MEME Signal',
        'Base 100X',
        'Snow_Wolf_Guild',
        '币安人生',
        'A8俱乐部',
        '0x_Sun VIP群',
        '0x江屿土狗暴富营',
        'Virtuals toda Moon',
        'maji family',
        "bruce's friends",
      ];

      if (providedNames.length) {
        list = list.map((item, i) => {
          const name = providedNames[i] || item.name;
          const baseHash = stringHash(name || item.id || String(i));
          const avatar = groupIconUrls.length
            ? groupIconUrls[baseHash % groupIconUrls.length]
            : item.avatar_url;
          const ownerAvatar = groupIconUrls.length
            ? groupIconUrls[(baseHash + 7) % groupIconUrls.length]
            : item.owner_avatar_url;
          return {
            ...item,
            name,
            avatar_url: avatar,
            owner_avatar_url: ownerAvatar,
          };
        });
      }

      setCommunities(list);

      const discussionTexts = [
        'Base 链上的 MEME 新星 PEPE 来啦！自带超高话题度与社区热度，凭借轻松有趣的 meme 基因迅速圈粉无数。作为 Base 生态里备受关注的潜力选手，PEPE 正以独特的社区共识积蓄能量，无论是老玩家还是新入局的朋友，都能感受到这场狂欢的魅力 —— 别错过这波轻松参与的机会，一起见证 PEPE 在 Base 链上的更多可能！',
        '还在找 Base 链上的趣味投资标的？PEPE 绝对值得你关注！作为当下爆火的 MEME 币，它不仅承载着社区的玩梗热情，更依托 Base 链的高效生态快速渗透市场。低门槛参与，高互动氛围，PEPE 用最简单直接的方式连接每一个加密爱好者。现在加入，和全球玩家一起为这份轻松的共识添砖加瓦，说不定下一个惊喜就在眼前！',
        'PEPE 登陆 Base 链， MEME 狂欢再升级！没有复杂概念，全靠社区真爱粉自发推动，这正是 PEPE 的独特之处。在 Base 链的加持下，交易更流畅，参与更便捷，让每一个喜欢 MEME 文化的人都能轻松上车。无论是想感受加密世界的趣味一面，还是寻找社区驱动的潜力标的，PEPE 都是你不容错过的选择 —— 快来加入这场属于 Base 链的 PEPE 派对吧！',
      ];
      setDiscussions(
        (list.length ? list.slice(0, 3) : []).map((c, idx) => ({
          id: String(idx + 1),
          community_name: c.name,
          community_avatar: c.avatar_url,
          ai_summary: discussionTexts[idx],
          engagement_score: idx === 0 ? 245 : idx === 1 ? 198 : 176,
          discussion_time: idx === 0 ? '2 小时前' : idx === 1 ? '4 小时前' : '6 小时前',
        }))
      );
    } catch (e: any) {
      setError(e?.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  const getMindshareColor = (mindshare: number) => {
    if (mindshare > 0.8) return 'bg-emerald-500';
    if (mindshare > 0.6) return 'bg-blue-500';
    if (mindshare > 0.4) return 'bg-purple-500';
    if (mindshare > 0.2) return 'bg-orange-500';
    return 'bg-slate-500';
  };

  // 从 public/group_icons 使用根路径静态资源
  const groupIconUrls: string[] = [
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
    '/group_icons/2025-10-19%2016.32.56.jpg',
    '/group_icons/2025-10-19%2016.33.13.jpg',
    '/group_icons/2025-10-19%2016.33.25.jpg',
    '/group_icons/2025-10-19%2016.33.58.jpg',
    '/group_icons/2025-10-19%2016.34.23.jpg',
    '/group_icons/2025-10-19%2016.34.36.jpg',
  ];
  
  // Mock realistic owner names
  const mockOwnerNames = [
  'Alice Chen', 'Eric Zhang', 'Victoria Guo', 'Jason Li', 'Michael Wu',
  'Sarah Wang', 'Kevin Zhou', 'Jenny Lin', 'Daniel Sun', 'Lucy Tang',
  'Leo Liu', 'Grace Xu', 'Henry Gao', 'Sophia Ma', 'Tony He',
  'Amy Qian', 'Jacky Huang', 'Iris Shen', 'Frank Luo', 'Cindy Ye'
  ];
  
  function stringHash(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
  hash = (hash << 5) - hash + str.charCodeAt(i);
  hash |= 0;
  }
  return Math.abs(hash);
  }

  // Treemap tile rendering referencing test-2 structure
  const TreemapTile = (props: any) => {
    const { x, y, width, height, name, depth, payload } = props;
    const img = payload?.avatar_url;
    const value: number = typeof payload?.sizeDisplayed === 'number' ? payload.sizeDisplayed : 0;
    const positive = (payload?.win_rate_1h ?? 0) >= 0;

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
                    <div className="mt-px inline-flex items-center gap-1 text-xs font-medium text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)]">{Number.isFinite(value) ? (value * 100).toFixed(1) + '%' : '-'}</div>
                    <span className="shrink-0 items-center gap-1 mt-0.5 text-xs font-medium text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,1)]">
                      <span className={`inline-block font-mono shrink-0 ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{positive ? '▲' : '▼'}</span>
                      {typeof payload?.win_rate_1h === 'number' && (
                        <span className="ml-1 inline-block shrink-0 tracking-tighter">{payload.win_rate_1h.toFixed(1)}%</span>
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

  const treemapData = communities.slice(0, 10).map((c, i) => ({
    name: c.name,
    size: Math.max(c.mindshare || 0.001, 0.001),
    sizeDisplayed: c.mindshare || 0,
    avatar_url: groupIconUrls.length ? groupIconUrls[stringHash(c.id || c.name || String(i)) % groupIconUrls.length] : c.avatar_url,
    win_rate_1h: c.win_rate_1h,
    id: c.id,
    index: i,
  }));

  // Group Activity Trend: 7 points slowly increasing from 0 to 63
  const trendData = (() => {
    const now = new Date();
    const values = [0, 9, 18, 28, 38, 50, 63];
    return values.map((v, idx) => {
      const d = new Date(now.getTime() - (values.length - 1 - idx) * 60 * 60 * 1000);
      const hh = String(d.getHours()).padStart(2, '0');
      return { label: `${hh}:00`, value: v };
    });
  })();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {/* 新增：错误提示 */}
        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-300 text-sm p-3 rounded-lg">
            {error}
          </div>
        )}
        {/* 新增：轻量加载提示（不阻塞原有布局）*/}
        {loading && (
          <div className="mb-4 text-slate-400 text-sm">Loading Group...</div>
        )}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_2fr_1fr] gap-6">
          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <img
                  src="/token_icons/21deed59dc9d05f4995f0ee947a9c753b14ca87f3950a4e3fe1ec1c09c8d462c.png"
                  alt="PEPE"
                  className="w-16 h-16 rounded-xl"
                />
                <div>
                  <h1 className="text-2xl font-bold text-white">PEPE</h1>
                  <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full border border-red-500/50">
                    LIVE CAMPAIGN
                  </span>
                </div>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">
                The most famous frog meme token on Base chain. Join the community campaign and earn rewards by driving engagement and mindshare.
              </p>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Spread Trend in Groups</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{ top: 10, right: 10, left: -40, bottom: 0 }}>
                    <CartesianGrid stroke="rgba(148,163,184,0.15)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'rgba(148,163,184,0.3)' }} padding={{ left: 30 }} />
                    <YAxis tick={false} tickLine={false} axisLine={{ stroke: 'rgba(148,163,184,0.3)' }} padding={{ bottom: 10 }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }}
                      labelStyle={{ color: '#94a3b8' }}
                    />
                    <Line type="linear" dataKey="value" name="Spread Index" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3, stroke: 'var(--primary)' }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2" onClick={() => onTradeNow?.()}>
              Trade Now
              <ArrowRight size={20} />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 w-full xl:max-w-[45vw]">
              <h2 className="text-2xl font-bold text-white mb-6">Top 25 Group by Mindshare</h2>
              <div className="w-full h-[520px]">
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

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-2xl font-bold text-white">Group Rankings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/80">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-slate-300">Rank</th>
                      <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300">Group</th>
                      <th className="text-left px-4 py-4 text-sm font-semibold text-slate-300">Leader</th>
                      <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">Mindshare</th>
                      <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">1h Change</th>
                      <th className="text-right px-4 py-4 text-sm font-semibold text-slate-300">1h Win Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {communities.map((community, index) => (
                      <tr
                        key={community.id}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-white font-bold text-sm">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={community.avatar_url}
                              alt={community.name}
                              className="w-10 h-10 rounded-lg"
                            />
                            <span className="font-medium text-white">{community.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <img
                              src={community.owner_avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=owner' + index}
                              alt="Owner"
                              className="w-5 h-5 rounded-full"
                            />
                            <span className="text-sm text-slate-300">@{community.owner_telegram_username || 'owner' + index}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-purple-400 font-medium">{(community.mindshare * 100).toFixed(2)}%</span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={`font-medium ${community.mindshare_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {community.mindshare_change >= 0 ? '+' : ''}{(((community.mindshare_change >= 0 ? Math.min(community.mindshare_change, community.mindshare) : community.mindshare_change)) * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-emerald-400 font-medium">{community.win_rate_1h.toFixed(1)}%</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="hidden xl:block space-y-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Group Discussion Feed</h2>
              <div className="space-y-4">
                {discussions.map((discussion) => (
                  <div
                    key={discussion.id}
                    className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-emerald-500 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <img
                        src={discussion.community_avatar}
                        alt={discussion.community_name}
                        className="w-12 h-12 rounded-lg flex-shrink-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-bold text-white">{discussion.community_name}</h3>
                          <span className="text-sm text-slate-400">{discussion.discussion_time}</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">
                      {discussion.ai_summary}
                    </p>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-sm text-slate-400">
                        <TrendingUp size={16} className="text-emerald-400" />
                        <span>Engagement: {discussion.engagement_score}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        <div className="mt-6 xl:hidden">
          <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Group Discussion Feed</h2>
            <div className="space-y-4">
              {discussions.map((discussion) => (
                <div
                  key={discussion.id}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-emerald-500 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <img
                      src={discussion.community_avatar}
                      alt={discussion.community_name}
                      className="w-12 h-12 rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-white">{discussion.community_name}</h3>
                        <span className="text-sm text-slate-400">{discussion.discussion_time}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    {discussion.ai_summary}
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <TrendingUp size={16} className="text-emerald-400" />
                      <span>Engagement: {discussion.engagement_score}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

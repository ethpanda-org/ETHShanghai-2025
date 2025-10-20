import { useState, useEffect, useRef } from 'react';
import { TrendingUp, DollarSign, Users, Award, ChevronDown } from 'lucide-react';
// 移除未使用的 supabase 导入
// import { supabase } from '../lib/supabase';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { useAccount, useSignTypedData } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { base } from 'wagmi/chains';
import { CORE_VAULT_ADDRESS, CORE_VAULT_NAME } from '../lib/coreVault';

interface Campaign {
  id: string;
  meme_token_id: string;
  prize_pool: number;
  start_date: string;
  end_date: string;
  status: string;
  description: string;
  token_symbol: string;
  token_logo: string;
  my_reward?: number;
}

export default function GroupOwnerDashboard({ goCampaign }: { goCampaign?: () => void }) {
  const [activeTab, setActiveTab] = useState<'commission' | 'campaigns' | 'bot' | 'chat'>('campaigns');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [selectedCommunity] = useState('币圈猎狗群'); // 移除未使用的setter
  const [isWalletBound] = useState(false);
  const [liveCampaigns, setLiveCampaigns] = useState<Campaign[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<Campaign[]>([]);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showWithdrawHistory, setShowWithdrawHistory] = useState(false);
  const [, setIsBotAdded] = useState(false); // 只保留setter用于handleBotAdded函数
  const [trendData, setTrendData] = useState<{ day: string; commission: number; signals: number }[]>([]);
  // 新增：可提现余额（USD）、输入金额、错误与签名状态
  const [availableRewardsUSD, setAvailableRewardsUSD] = useState<number>(1864.5);
  const [availableCommissionUSD, setAvailableCommissionUSD] = useState<number>(1864.5);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [withdrawSource, setWithdrawSource] = useState<'commission' | 'rewards' | null>(null);
  const [withdrawHistory, setWithdrawHistory] = useState<{ time: string; amountUsd: number; address: string; source: 'commission' | 'rewards' }[]>([]);
  // 插入 wagmi/RainbowKit hooks：用于检查连接状态和打开连接流程
  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { signTypedDataAsync } = useSignTypedData();
  // 初始化会话内的历史记录示例（刷新后不会持久化）
  useEffect(() => {
    setWithdrawHistory([
      { time: '2023-10-26 15:30', amountUsd: 500, address: '0x1234...abcd', source: 'commission' },
      { time: '2023-10-20 10:15', amountUsd: 350, address: '0x1234...abcd', source: 'commission' },
    ]);
  }, []);

  const LEFT_DOMAIN: [number, number] = [10, 100];
  const RIGHT_DOMAIN: [number, number] = [1, 100];
  const LEFT_MID = (LEFT_DOMAIN[0] + LEFT_DOMAIN[1]) / 2;
  const TOKEN_ICONS = [
    '1d308d6f81c1061b7f58b68745815277.webp',
    '2fbc4940b6b4966b56511d00f182d56a_v2l.webp',
    '3c6759fe14393bfc189c14058f158534.webp',
    '4f87908c85be4d8ccdcec7fbf0acf7f4.webp',
    'cfc5278dd5286596d30d896d629c87df.webp',
    '98377fde34fe769bdb3b0a114d6cc6c0.webp',
    'bf036f40565334545befbef9281d74a7_v2l.webp',
    'cd68c7bfa7d4b5b8363467c93a052cde.webp',
    'cda79647be832509d760edd8d80be962.webp',
    'ce05864f229d1fc421607dd709605508.webp',
    'dfc123975b99527567e618670fec54a8_v2l.webp',
    'e34a41abbd659242fb9a20b5c8f97aaf_v2l.webp',
    'f850788494ba8ad70982fec3c55d0b1f.webp',
  ] as const;
  const getIcon = (i: number) => `/token_icons/${TOKEN_ICONS[i % TOKEN_ICONS.length]}`;

  const shorten = (val?: string | null, front = 6, back = 4) => {
    if (!val) return '-';
    const s = String(val);
    if (s.length <= front + back + 3) return s;
    return `${s.slice(0, front)}...${s.slice(-back)}`;
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  useEffect(() => {
    const days = 30;
    const data = Array.from({ length: days }).map((_, idx) => {
      const d = new Date();
      d.setDate(d.getDate() - (days - idx - 1));
      const commission = parseFloat((10 + Math.random() * 90).toFixed(1));
      const signals = Math.floor(1 + Math.random() * 99);
      return {
        day: `${d.getMonth() + 1}/${d.getDate()}`,
        commission,
        signals,
      };
    });
    setTrendData(data);
  }, []);

  const fetchCampaigns = async () => {
    const dateISO = (offsetDays: number) => {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString();
    };
    const genReward = (nonZero: boolean) => (nonZero ? parseFloat((100.1 + Math.random() * (999.9 - 100.1)).toFixed(1)) : 0);

    const mockLive: Campaign[] = [
      { id: 'live-1', meme_token_id: 'mt-1', prize_pool: 10000, start_date: dateISO(-5), end_date: dateISO(10), status: 'live', description: 'Trade & earn commission this week.', token_symbol: 'PEPE', token_logo: getIcon(0) },
      { id: 'live-2', meme_token_id: 'mt-2', prize_pool: 7500, start_date: dateISO(-3), end_date: dateISO(7), status: 'live', description: 'High-volume trading rewards.', token_symbol: 'DOGE', token_logo: getIcon(1) },
      { id: 'live-3', meme_token_id: 'mt-3', prize_pool: 5200, start_date: dateISO(-10), end_date: dateISO(5), status: 'live', description: 'Signal-based commission campaign.', token_symbol: 'SHIB', token_logo: getIcon(2) },
    ];

    const mockPast: Campaign[] = [
      { id: 'past-1', meme_token_id: 'mt-4', prize_pool: 4800, start_date: dateISO(-30), end_date: dateISO(-25), status: 'past', description: 'Weekly past campaign.', token_symbol: 'BONK', token_logo: getIcon(3), my_reward: genReward(false) },
      { id: 'past-2', meme_token_id: 'mt-5', prize_pool: 3900, start_date: dateISO(-40), end_date: dateISO(-34), status: 'past', description: 'Closed trading campaign.', token_symbol: 'WIF', token_logo: getIcon(4), my_reward: genReward(false) },
      { id: 'past-3', meme_token_id: 'mt-6', prize_pool: 6200, start_date: dateISO(-50), end_date: dateISO(-43), status: 'past', description: 'Active traders campaign.', token_symbol: 'COQ', token_logo: getIcon(5), my_reward: genReward(false) },
      { id: 'past-4', meme_token_id: 'mt-7', prize_pool: 3100, start_date: dateISO(-28), end_date: dateISO(-21), status: 'past', description: 'Small prize pool event.', token_symbol: 'BRETT', token_logo: getIcon(6), my_reward: genReward(true) },
      { id: 'past-5', meme_token_id: 'mt-8', prize_pool: 2500, start_date: dateISO(-22), end_date: dateISO(-16), status: 'past', description: 'Community fun trading.', token_symbol: 'FLOKI', token_logo: getIcon(7), my_reward: genReward(true) },
      { id: 'past-6', meme_token_id: 'mt-9', prize_pool: 5400, start_date: dateISO(-35), end_date: dateISO(-29), status: 'past', description: 'Momentum strategy event.', token_symbol: 'TURBO', token_logo: getIcon(8), my_reward: genReward(true) },
      { id: 'past-7', meme_token_id: 'mt-10', prize_pool: 4300, start_date: dateISO(-60), end_date: dateISO(-53), status: 'past', description: 'Volume-based rewards.', token_symbol: 'MEW', token_logo: getIcon(9), my_reward: genReward(true) },
    ];

    setLiveCampaigns(mockLive);
    setPastCampaigns(mockPast);
  };

  const handleTelegramLogin = () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    setTimeout(() => {
      setIsAuthenticated(true);
      setIsLoggingIn(false);
      setUserName('@shao rockey');
    }, 3000);
  };


  const handleBotAdded = () => {
    setIsBotAdded(true);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-6">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl p-12 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Users size={32} className="text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">登录到群主控制台</h1>
          <p className="text-slate-400 mb-8">请使用 Telegram 登录以访问和管理你的社区数据。</p>
          <button
            onClick={handleTelegramLogin}
            disabled={isLoggingIn}
            className="w-full py-4 bg-blue-500 hover:bg-blue-600 disabled:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            {isLoggingIn ? (
              <>
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
                正在登录，请在手机端确认…
              </>
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18.717-1.048 4.49-1.48 5.954-.184.621-.543.829-.891.85-.756.069-1.33-.5-2.063-.981-1.146-.754-1.793-1.222-2.905-1.957-1.286-.85-.453-1.318.28-2.081.192-.2 3.527-3.234 3.593-3.51.008-.034.016-.162-.061-.23-.077-.067-.19-.044-.272-.026-.116.026-1.968 1.25-5.554 3.67-.526.361-1.003.537-1.43.528-.471-.01-1.377-.266-2.051-.485-.825-.269-1.481-.411-1.424-.866.03-.237.354-.479.974-.726 3.818-1.664 6.364-2.764 7.636-3.302 3.638-1.516 4.395-1.78 4.891-1.788.108-.002.35.025.507.152.133.108.17.253.187.355.018.102.04.335.022.517z"/>
                </svg>
                使用 Telegram 登录
              </>
            )}
          </button>
          <p className="text-slate-400 mt-4">{isLoggingIn ? '正在等待 Telegram 确认（约3秒）…' : '点击上方按钮开始登录'}</p>
        </div>
      </div>
    );
  }

  // AI Chat Tab: Embedded full-screen chat interface
  function AIChatTab() {
    const [messages, setMessages] = useState<Array<{id: string; type: 'user' | 'bot'; content: string; timestamp: Date}>>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
      scrollToBottom();
    }, [messages]);

    useEffect(() => {
      // Load chat history from localStorage
      const savedMessages = localStorage.getItem('ai-chat-history');
      if (savedMessages) {
        try {
          const parsed = JSON.parse(savedMessages);
          setMessages(parsed.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          })));
        } catch (e) {
          console.error('Failed to load chat history:', e);
        }
      }
    }, []);

    useEffect(() => {
      // Save chat history to localStorage
      if (messages.length > 0) {
        localStorage.setItem('ai-chat-history', JSON.stringify(messages));
      }
    }, [messages]);

    const sendMessage = async () => {
      if (!inputValue.trim() || isLoading) return;

      const userMessage = {
        id: Date.now().toString(),
        type: 'user' as const,
        content: inputValue.trim(),
        timestamp: new Date()
      };

      setMessages(prev => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);

      try {
        // Call Dify API
        const response = await fetch(`${import.meta.env.VITE_DIFY_BASE_URL}/v1/chat-messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_DIFY_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: {},
            query: userMessage.content,
            response_mode: 'blocking',
            user: import.meta.env.VITE_DIFY_USER || 'default-user',
            conversation_id: localStorage.getItem('dify-conversation-id') || undefined
          })
        });

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();

        // Save conversation ID for context
        if (data.conversation_id) {
          localStorage.setItem('dify-conversation-id', data.conversation_id);
        }

        const botMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot' as const,
          content: data.answer || '抱歉，我现在无法回答。',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, botMessage]);
      } catch (error) {
        console.error('Failed to send message:', error);
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot' as const,
          content: '抱歉，发送消息失败。请检查网络连接或稍后再试。',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    };

    const clearHistory = () => {
      if (confirm('确定要清除所有对话历史吗？')) {
        setMessages([]);
        localStorage.removeItem('ai-chat-history');
        localStorage.removeItem('dify-conversation-id');
      }
    };

    return (
      <div className="h-[calc(100vh-12rem)] flex flex-col bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">AI 群助手</h2>
              <p className="text-xs text-slate-400">智能问答 · 随时为您服务</p>
            </div>
          </div>
          <button
            onClick={clearHistory}
            className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            清除历史
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">💬</span>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">开始对话</h3>
                <p className="text-slate-400 text-sm">
                  你好！我是 AI 群助手，有什么可以帮你？
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex gap-3 max-w-[80%] ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    msg.type === 'user' ? 'bg-emerald-500/20' : 'bg-slate-700'
                  }`}>
                    <span className="text-sm">{msg.type === 'user' ? '👤' : '🤖'}</span>
                  </div>
                  <div>
                    <div className={`rounded-2xl px-4 py-3 ${
                      msg.type === 'user'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-100'
                    }`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 px-2">
                      {msg.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className="flex justify-start">
              <div className="flex gap-3 max-w-[80%]">
                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-sm">🤖</span>
                </div>
                <div className="bg-slate-800 rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-slate-800">
          <div className="flex gap-2">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息... (Enter 发送，Shift+Enter 换行)"
              className="flex-1 bg-slate-800 text-white rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="px-6 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
            >
              {isLoading ? (
                <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              ) : (
                <span>发送</span>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl mb-6">
          <div className="flex border-b border-slate-800">
            <button
              onClick={() => setActiveTab('commission')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'commission'
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Commission
            </button>
            <button
              onClick={() => setActiveTab('campaigns')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'campaigns'
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Campaigns
            </button>
            <button
              onClick={() => setActiveTab('bot')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'bot'
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Add Bot Guide
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'chat'
                  ? 'text-white border-b-2 border-emerald-500'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              AI Chat
            </button>
          </div>
        </div>

        {activeTab === 'commission' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white hover:bg-slate-800 transition-colors">
                  {selectedCommunity}
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=user1"
                  alt="User"
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-white font-medium">{userName ?? '@shao rockey'}</span>
                {isWalletBound ? (
                  <span className="text-slate-400 text-sm">0x1234...5678</span>
                ) : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6">
              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 text-sm font-medium">Unclaimed Commission (USD)</h3>
                  <DollarSign className="text-emerald-400" size={24} />
                </div>
                <div className="text-3xl font-bold text-white mb-4">${availableCommissionUSD.toLocaleString()}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (isConnected) {
                        setWithdrawSource('commission');
                        setShowWithdrawModal(true);
                      } else {
                        openConnectModal?.();
                      }
                    }}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Withdraw
                  </button>
                  <button
                    onClick={() => setShowWithdrawHistory(true)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                  >
                    History
                  </button>
                </div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-400 text-sm font-medium">Total Trading Volume</h3>
                  <TrendingUp className="text-blue-400" size={24} />
                </div>
                <div className="text-3xl font-bold text-white mb-2">$75,920.00</div>
                <div className="text-sm text-slate-400">Traders: 15 / 1,000</div>
              </div>

              <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-slate-400 text-sm font-medium">Signal Win Rate</h3>
                    <select className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded px-2 py-1">
                      <option>1h</option>
                      <option>6h</option>
                      <option>24h</option>
                      <option>7d</option>
                      <option>30d</option>
                    </select>
                  </div>
                  <Award className="text-purple-400" size={24} />
                </div>
                <div className="text-3xl font-bold text-white mb-2">69.3%</div>
                <div className="text-sm text-slate-400">Based on 85 signals</div>
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <h3 className="text-lg font-bold text-white mb-6">Commission & Signal Trends</h3>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={trendData.map(d => ({ ...d, commissionCapped: Math.min(d.commission, LEFT_MID) }))} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="day" tick={{ fill: '#94a3b8' }} />
                    <YAxis yAxisId="left" domain={LEFT_DOMAIN} tick={{ fill: '#94a3b8' }} />
                    <YAxis yAxisId="right" orientation="right" domain={RIGHT_DOMAIN} tick={{ fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend />
                    <Bar yAxisId="left" dataKey="commissionCapped" name="Commission ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="signals" name="Signals" stroke="#A472DA" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'campaigns' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="relative">
                <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-white hover:bg-slate-800 transition-colors">
                  {selectedCommunity}
                  <ChevronDown size={16} />
                </button>
              </div>
              <div className="flex items-center gap-4">
                <img
                  src="https://api.dicebear.com/7.x/avataaars/svg?seed=user1"
                  alt="User"
                  className="w-10 h-10 rounded-full"
                />
                <span className="text-white font-medium">{userName ?? '@shao rockey'}</span>
                {isWalletBound ? (
                  <span className="text-slate-400 text-sm">0x1234...5678</span>
                ) : null}
              </div>
            </div>

            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-400 text-sm font-medium">Unclaimed Rewards (USD)</h3>
                <Award className="text-purple-400" size={24} />
              </div>
              <div className="text-3xl font-bold text-white mb-4">${availableRewardsUSD.toLocaleString()}</div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (isConnected) {
                      setWithdrawSource('rewards');
                      setShowWithdrawModal(true);
                    } else {
                      openConnectModal?.();
                    }
                  }}
                  className="py-2 px-6 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Withdraw
                </button>
                <button
                  onClick={() => setShowWithdrawHistory(true)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
                >
                  History
                </button>
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Live Campaigns</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveCampaigns.length > 0 ? liveCampaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 hover:border-emerald-500 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={campaign.token_logo} alt={campaign.token_symbol} className="w-12 h-12 rounded-xl" />
                      <div>
                        <h3 className="text-lg font-bold text-white">{campaign.token_symbol}</h3>
                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full border border-red-500/50">LIVE</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">{campaign.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Prize Pool:</span>
                        <span className="text-emerald-400 font-medium">${campaign.prize_pool.toLocaleString()} USDT</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">Start:</span>
                        <span className="text-white">{new Date(campaign.start_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">End:</span>
                        <span className="text-white">{new Date(campaign.end_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => goCampaign?.()} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors">
                        View
                      </button>
                      <button className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors">
                        Register
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-3 text-center py-12 text-slate-400">
                    No live campaigns available
                  </div>
                )}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white mb-4">Past Campaigns</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pastCampaigns.length > 0 ? pastCampaigns.map((campaign) => (
                  <div key={campaign.id} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-6 opacity-75">
                    <div className="flex items-center gap-3 mb-4">
                      <img src={campaign.token_logo} alt={campaign.token_symbol} className="w-12 h-12 rounded-xl" />
                      <div>
                        <h3 className="text-lg font-bold text-white">{campaign.token_symbol}</h3>
                        <span className="text-xs px-2 py-1 bg-slate-700 text-slate-400 rounded-full">ENDED</span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 mb-4">{campaign.description}</p>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-400">我的奖励:</span>
                        <span className={campaign.my_reward ? 'text-emerald-400 font-medium' : 'text-slate-400'}>{campaign.my_reward ? `$${campaign.my_reward.toLocaleString()}` : '$0.0'}</span>
                      </div>
                    </div>
                    <button onClick={() => goCampaign?.()} className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors">
                      View
                    </button>
                  </div>
                )) : (
                  <div className="col-span-3 text-center py-12 text-slate-400">
                    No past campaigns
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bot' && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-12 text-center">
              <div className="w-24 h-24 bg-emerald-500/20 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Users size={48} className="text-emerald-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Unlock Your Community Dashboard</h2>
              <p className="text-slate-400 mb-8 leading-relaxed">
                In just two steps, unlock powerful community analytics, commission statistics, and member trading insights to make your community management easier and smarter.
              </p>

              <div className="space-y-8 text-left">
                <div className="bg-slate-800/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">1</div>
                    <h3 className="text-lg font-bold text-white">Add Bot to Your Group</h3>
                  </div>
                  <p className="text-slate-400 mb-4">
                    Please copy the Bot username below and add it as a member to your Telegram group.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700 rounded-lg font-mono text-emerald-400">
                      @GroupDataAnalyticsBot
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText('@GroupDataAnalyticsBot')}
                      className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold">2</div>
                    <h3 className="text-lg font-bold text-white">Grant Admin Permissions</h3>
                  </div>
                  <p className="text-slate-400">
                    To allow the Bot to read and analyze data, please set it as an administrator with at least "read messages" permission.
                  </p>
                </div>
              </div>

              <button
                onClick={handleBotAdded}
                className="w-full mt-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors"
              >
                I've completed the setup, refresh status
              </button>
            </div>
          </div>
        )}

        {activeTab === 'chat' && <AIChatTab />}
      </div>

      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-md w-full">
            <h3 className="text-2xl font-bold text-white mb-6">Withdraw Commission</h3>
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Available Amount</label>
                <div className="text-3xl font-bold text-white">${(withdrawSource === 'rewards' ? availableRewardsUSD : availableCommissionUSD).toLocaleString()}</div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Withdrawal Address</label>
                <div className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono">
                  {shorten(address ?? 'No wallet connected')}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-2 block">Withdraw Amount (USD)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  placeholder="例如：100.00"
                />
              </div>
              {(() => {
                const amt = parseFloat(withdrawAmount || '0');
                const fee = +(amt * 0.003).toFixed(2);
                const net = +(amt - fee).toFixed(2);
                return (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-slate-400">Payer</div>
                    <div className="text-white font-mono text-right">{shorten(address ?? '-')}</div>
                    <div className="text-slate-400">Receiver</div>
                    <div className="text-white font-mono text-right">{shorten(CORE_VAULT_ADDRESS)}</div>
                    <div className="text-slate-400">Amount (USD)</div>
                    <div className="text-white text-right">${isNaN(amt) ? '0.00' : amt.toFixed(2)}</div>
                    <div className="text-slate-400">Fee (USD)</div>
                    <div className="text-white text-right">${isNaN(fee) ? '0.00' : fee.toFixed(2)}</div>
                    <div className="text-slate-400">Net (USD)</div>
                    <div className="text-white text-right">${isNaN(net) ? '0.00' : net.toFixed(2)}</div>
                  </div>
                );
              })()}
              {withdrawError && (
                <div className="text-red-400 text-sm">{withdrawError}</div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawAmount('');
                  setWithdrawError(null);
                }}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setWithdrawError(null);
                  if (!isConnected) {
                    openConnectModal?.();
                    return;
                  }
                  const amt = parseFloat(withdrawAmount || '0');
                  if (!Number.isFinite(amt) || amt <= 0) {
                    setWithdrawError('请输入有效的提现金额');
                    return;
                  }
                  const availableUSD = withdrawSource === 'rewards' ? availableRewardsUSD : availableCommissionUSD;
                  if (amt > availableUSD) {
                    setWithdrawError('提现金额不能超过可用余额');
                    return;
                  }
                  setIsSigning(true);
                  try {
                    const fee = +(amt * 0.003).toFixed(2);
                    const net = +(amt - fee).toFixed(2);
                    const amountCents = BigInt(Math.round(amt * 100));
                    const feeCents = BigInt(Math.round(fee * 100));
                    const netCents = BigInt(Math.round(net * 100));
                    const nonce = BigInt(Date.now());
                    await signTypedDataAsync({
                      domain: {
                        name: CORE_VAULT_NAME,
                        version: '1',
                        chainId: base.id,
                        verifyingContract: CORE_VAULT_ADDRESS,
                      },
                      types: {
                        Withdraw: [
                          { name: 'payer', type: 'address' },
                          { name: 'receiver', type: 'address' },
                          { name: 'amountCents', type: 'uint256' },
                          { name: 'feeCents', type: 'uint256' },
                          { name: 'netCents', type: 'uint256' },
                          { name: 'nonce', type: 'uint256' },
                        ],
                      },
                      primaryType: 'Withdraw',
                      message: {
                        payer: address!,
                        receiver: CORE_VAULT_ADDRESS,
                        amountCents,
                        feeCents,
                        netCents,
                        nonce,
                      },
                    });
                    // 模拟交易成功：扣减余额并关闭弹窗 + 记录历史
                    if (withdrawSource === 'rewards') {
                      setAvailableRewardsUSD((prev) => +(prev - amt).toFixed(2));
                    } else if (withdrawSource === 'commission') {
                      setAvailableCommissionUSD((prev) => +(prev - amt).toFixed(2));
                    }
                    setWithdrawHistory((prev) => [
                      { time: new Date().toLocaleString(), amountUsd: amt, address: address!, source: withdrawSource ?? 'rewards' },
                      ...prev,
                    ]);
                    setShowWithdrawModal(false);
                    setWithdrawAmount('');
                  } catch {
                    setWithdrawError('签名已取消或发生错误');
                  } finally {
                    setIsSigning(false);
                  }
                }}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                disabled={isSigning}
              >
                {isSigning ? 'Signing…' : 'Sign & Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showWithdrawHistory && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 max-w-2xl w-full">
            <h3 className="text-2xl font-bold text-white mb-6">Withdrawal History</h3>
            <div className="space-y-2 mb-6">
              <div className="grid grid-cols-3 gap-4 px-4 py-2 text-sm font-semibold text-slate-400 border-b border-slate-800">
                <span>Time</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Address</span>
              </div>
              {withdrawHistory.length > 0 ? (
                withdrawHistory.map((h, idx) => (
                  <div key={idx} className="grid grid-cols-3 gap-4 px-4 py-3 rounded-lg hover:bg-slate-800/30">
                    <span className="text-sm text-slate-300">{h.time}</span>
                    <span className="text-sm text-slate-300 text-right">- ${h.amountUsd.toFixed(2)}</span>
                    <span className="text-sm text-slate-400 text-right font-mono">{shorten(h.address)}</span>
                  </div>
                ))
              ) : (
                <div className="text-slate-400 text-sm px-4 py-3">No history yet</div>
              )}
            </div>
            <button
              onClick={() => setShowWithdrawHistory(false)}
              className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

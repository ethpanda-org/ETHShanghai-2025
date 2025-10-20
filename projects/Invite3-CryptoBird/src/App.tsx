import { useState, useEffect } from 'react';
import { Trophy, Coins, UserCog } from 'lucide-react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import CommunityLeaderboard from './pages/CommunityLeaderboard';
import MemeTokenDetail from './pages/MemeTokenDetail';
import CampaignDetail from './pages/CampaignDetail';
import GroupOwnerDashboard from './pages/GroupOwnerDashboard';

type Page = 'home' | 'leaderboard' | 'token' | 'campaign' | 'dashboard';

const pageToPath = (p: Page) => {
  switch (p) {
    case 'leaderboard': return '/leaderboard';
    case 'token': return '/token';
    case 'campaign': return '/campaign';
    case 'dashboard': return '/dashboard';
    case 'home':
    default: return '/';
  }
};

const pathToPage = (pathname: string): Page => {
  switch (pathname) {
    case '/leaderboard': return 'leaderboard';
    case '/token': return 'token';
    case '/campaign': return 'campaign';
    case '/dashboard': return 'dashboard';
    case '/':
    default: return 'home';
  }
};

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');

  const navigateTo = (p: Page) => {
    setCurrentPage(p);
    const path = pageToPath(p);
    window.history.pushState({ page: p }, '', path);
  };

  useEffect(() => {
    // 初始加载根据路径设置页面
    setCurrentPage(pathToPage(window.location.pathname));
    // 监听浏览器前进/后退
    const onPopState = () => setCurrentPage(pathToPage(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      <nav className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <button
                onClick={() => navigateTo('home')}
                className="flex items-center gap-2 focus:outline-none hover:opacity-90 transition-opacity cursor-pointer"
                aria-label="Go Home"
              >
                <img src="/logo/Logo.png" alt="CryptoBird logo" className="w-8 h-8 rounded-lg" />
                <span className="text-xl font-bold text-white">CryptoBird</span>
              </button>
              <div className="flex gap-1">
                <button
                  onClick={() => navigateTo('leaderboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    currentPage === 'leaderboard'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Trophy size={18} />
                  Leaderboard
                </button>
                <button
                  onClick={() => navigateTo('token')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    currentPage === 'token'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <Coins size={18} />
                  Token Detail
                </button>
                {/* 移除 Campaign 入口按钮 */}
                <button
                  onClick={() => navigateTo('dashboard')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                    currentPage === 'dashboard'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <UserCog size={18} />
                  Group Leader
                </button>
              </div>
            </div>
            <ConnectButton />
          </div>
        </div>
      </nav>

      <main>
        {currentPage === 'leaderboard' && <CommunityLeaderboard />}
        {currentPage === 'token' && <MemeTokenDetail goCampaign={() => navigateTo('campaign')} />}
        {currentPage === 'campaign' && <CampaignDetail onTradeNow={() => navigateTo('token')} />}
        {currentPage === 'dashboard' && <GroupOwnerDashboard goCampaign={() => navigateTo('campaign')} />}
        {currentPage === 'home' && (
          <div className="max-w-7xl mx-auto px-6 py-6">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl p-8 text-center text-white">
              <h1 className="text-3xl font-bold mb-4">CryptoBird Demo</h1>
              <p className="text-slate-300">Use the top navigation to explore pages.</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

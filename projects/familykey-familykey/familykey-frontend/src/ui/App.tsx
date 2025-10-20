import { useEffect, useState, useRef } from 'react';
import Beneficiary from './Beneficiary';
import Owner from './Owner';
import Claim from './Claim';
import Home from './Home';
import Logo from './Logo';
import { useI18n } from './i18n';
import Notify from './Notify';
import { usePrivy } from '@privy-io/react-auth';
import { NotificationToast } from './NotificationToast';

export default function App() {
  const [view, setView] = useState<'home' | 'Owner' | 'beneficiary' | 'claim' | 'notifications'>('home');
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, lang, setLang } = useI18n();
  const { ready, authenticated } = usePrivy();

  // Global toast (top-right)
  const [toastMsg, setToastMsg] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [toastDuration, setToastDuration] = useState(2600);
  const [toastProgress, setToastProgress] = useState(0);
  const toastTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const detail: any = e.detail || {};
      const msg = detail.msg || detail.message || '';
      const timeoutMs = typeof detail.timeoutMs === 'number' ? detail.timeoutMs : 2600;
      if (!msg) return;
      // clear previous timers
      if (toastTimerRef.current) { window.clearTimeout(toastTimerRef.current); toastTimerRef.current = null; }
      if (progressTimerRef.current) { window.clearInterval(progressTimerRef.current); progressTimerRef.current = null; }

      setToastMsg(msg);
      setToastDuration(timeoutMs);
      setToastOpen(true);
      const start = Date.now();
      const end = start + timeoutMs;
      setToastProgress(100);
      progressTimerRef.current = window.setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, end - now);
        const pct = (remaining / timeoutMs) * 100;
        setToastProgress(pct);
        if (remaining <= 0 && progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      }, 50);

      toastTimerRef.current = window.setTimeout(() => {
        setToastOpen(false);
        if (progressTimerRef.current) {
          window.clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;
        }
      }, timeoutMs);
    };
    const bound = (ev: Event) => handler(ev as CustomEvent);
    window.addEventListener('fk:toast', bound);
    return () => {
      window.removeEventListener('fk:toast', bound);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current);
    };
  }, []);

  // 基于路径的简单路由：/、/Settlor、/beneficiary、/notifications
  useEffect(() => {
    const syncFromPath = () => {
      const path = typeof window !== 'undefined' ? window.location.pathname.toLowerCase() : '/';
      if (path.startsWith('/settlor')) setView('Owner');
      else if (path.startsWith('/beneficiary')) setView('beneficiary');
      else if (path.startsWith('/notifications')) setView('notifications');
      else setView('home');
    };
    syncFromPath();
    window.addEventListener('popstate', syncFromPath);
    return () => window.removeEventListener('popstate', syncFromPath);
  }, []);

  const navigate = (v: 'home' | 'Owner' | 'beneficiary' | 'notifications') => {
    const path = v === 'home' ? '/' : v === 'Owner' ? '/Settlor' : `/${v}`;
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
    }
    setView(v);
    setMenuOpen(false);
  };

  return (
    <div className="page-tech">
      <header className="app-header">
        <button className="brand-btn" onClick={() => navigate('home')} aria-label={lang === 'zh' ? '返回首页' : 'Go home'}>
          <Logo variant="header" />
        </button>
        <nav className="nav">
          <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>{t('nav_home')}</button>
          <button className={view === 'Owner' ? 'active' : ''} onClick={() => navigate('Owner')}>{t('nav_Owner')}</button>
          <button className={view === 'beneficiary' ? 'active' : ''} onClick={() => navigate('beneficiary')}>{t('nav_beneficiary')}</button>
          {/* Removed claim nav per request */}
          <button className={view === 'notifications' ? 'active' : ''} onClick={() => navigate('notifications')}>{t('nav_notifications')}</button>
          <span className="divider" style={{ width: 1 }} />
          <button onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}>{lang === 'en' ? t('lang_zh') : t('lang_en')}</button>
        </nav>
        <button className="menu-toggle" onClick={() => setMenuOpen((open) => !open)} aria-label={lang === 'zh' ? '菜单' : 'Menu'}>
          ☰
        </button>
      </header>
      {menuOpen && (
        <div className="mobile-nav">
          <button className={view === 'home' ? 'active' : ''} onClick={() => navigate('home')}>{t('nav_home')}</button>
          <button className={view === 'Owner' ? 'active' : ''} onClick={() => navigate('Owner')}>{t('nav_Owner')}</button>
          <button className={view === 'beneficiary' ? 'active' : ''} onClick={() => navigate('beneficiary')}>{t('nav_beneficiary')}</button>
          <button className={view === 'notifications' ? 'active' : ''} onClick={() => navigate('notifications')}>{t('nav_notifications')}</button>
          <span className="divider" />
          <button className="lang-toggle" onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}>{lang === 'en' ? t('lang_zh') : t('lang_en')}</button>
        </div>
      )}
      {view === 'home' && <Home go={(v) => navigate(v)} />}
      {view === 'beneficiary' && (
        <div className="container">
          <div className="section-title">{t('beneficiary_title')}</div>
          {!authenticated && <p className="muted" style={{ marginBottom: 12 }}>{t('beneficiary_desc')}</p>}
          <Beneficiary />
        </div>
      )}
      {view === 'Owner' && (
        <div className="container">
          <div className="card"><Owner /></div>
        </div>
      )}
      {view === 'claim' && (
        <div className="container">
          <div className="section-title">{t('claim_title')}</div>
          <div className="card"><Claim /></div>
        </div>
      )}
      {view === 'notifications' && <Notify />}

      {/* Notification Toast - 全局通知弹窗 */}
      <NotificationToast />

      {toastOpen && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 9999, background: 'rgba(218, 185, 116, 0.96)', color: '#1f2937', padding: '12px 14px', borderRadius: 12, boxShadow: '0 0 0 3px rgba(197, 163, 90, 0.25), 0 12px 28px rgba(218, 185, 116, 0.45)', border: '1px solid var(--fk-gold-2)', minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 16 }}>⚡️</span>
            <span style={{ flex: '1 1 auto' }}>{toastMsg}</span>
            <button onClick={() => { setToastOpen(false); if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current); if (progressTimerRef.current) window.clearInterval(progressTimerRef.current); }} style={{ background: 'transparent', border: 'none', color: '#1f2937', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
          <div style={{ marginTop: 8, height: 3, background: 'rgba(197, 163, 90, 0.30)', borderRadius: 999 }}>
            <div style={{ width: `${toastProgress}%`, height: '100%', background: 'linear-gradient(90deg, var(--fk-gold-1), var(--fk-gold-2))', borderRadius: 999, transition: 'width 50ms linear' }} />
          </div>
        </div>
      )}
    </div>
  );
}

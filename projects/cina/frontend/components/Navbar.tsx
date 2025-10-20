'use client';

import Link from 'next/link';
import ConnectWallet from './ConnectWallet';

export default function Navbar() {
  return (
    <nav className="p-4 flex flex-row justify-between top-0 left-0 right-0 z-50 transition-colors duration-200 bg-transparent fixed">
      {/* 左侧导航区域 */}
      <div className="flex flex-row gap-3 items-center">
        {/* Logo 和品牌名称 */}
        <Link href="/" className="flex flex-row items-center gap-2 z-10 mr-3">
          <img 
            src="/support/cina-logo-white.svg" 
            alt="CINA Logo" 
            className="h-8 w-8 mr-2 object-contain"
          />
          <div className="text-xl text-slate-50">CINA</div>
        </Link>

        {/* 导航链接 */}
        <Link 
          href="/main" 
          className="text-muted-foreground hover:text-foreground hover:cursor-pointer p-2 z-50 text-slate-400 hover:text-slate-50 transition-colors"
        >
          应用
        </Link>
        <Link 
          href="/trading" 
          className="text-muted-foreground hover:text-foreground hover:cursor-pointer p-2 z-50 text-slate-400 hover:text-slate-50 transition-colors"
        >
          交易
        </Link>
        <a 
          href="https://cina-beta.dev.isecsp.cn/#/" 
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground hover:cursor-pointer p-2 z-50 text-slate-400 hover:text-slate-50 transition-colors"
        >
          CINA DOLLAR
        </a>
        <a 
          href="https://cina-fund.dev.isecsp.cn/login" 
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground hover:cursor-pointer p-2 z-50 text-slate-400 hover:text-slate-50 transition-colors"
        >
          CINA FUND
        </a>
      </div>

      {/* 右侧连接钱包区域 */}
      <div className="flex flex-row items-center">
        <ConnectWallet />
      </div>
    </nav>
  );
}


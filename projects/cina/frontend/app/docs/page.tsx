'use client';

import Link from 'next/link';
import ConnectWallet from '@/components/ConnectWallet';

// 禁用静态优化
export const dynamic = 'force-dynamic';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-black relative">
      {/* 背景渐变效果 */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-black to-slate-900"></div>
      
      <div className="relative z-10 mx-auto max-w-5xl px-4 py-8">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
            <img 
              src="/support/cina-logo-white.svg" 
              alt="CINA Logo" 
              className="w-10 h-10 object-contain"
            />
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              CINA
            </div>
          </Link>
          <ConnectWallet />
        </div>

        {/* 文档标题 */}
        <div className="text-center mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-cyan-400 to-purple-400 bg-clip-text text-transparent leading-tight">
            CINA Protocol
          </h1>
          <div className="text-2xl md:text-3xl font-semibold text-slate-300 mb-4">
            技术白皮书
          </div>
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 text-slate-400">
            <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-xl">
              版本 3.0
            </span>
            <span className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
              2025年4月3日
            </span>
            <span className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
              CINA Labs
            </span>
          </div>
        </div>

        {/* 免责声明 */}
        <div className="mb-12 p-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl backdrop-blur-sm">
          <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            免责声明
          </h3>
          <p className="text-sm text-slate-300 leading-relaxed">
            本文档基于与用户互动讨论及所提供材料（包括图表）的信息编写而成，旨在基于这些信息达到技术准确性，但不能替代 CINA Labs 发布的官方最终白皮书、技术文档或经审计的代码。信息可能不完整或有后续变更。本文档不构成任何财务建议。
          </p>
        </div>

        {/* 目录 */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">目录</h2>
          <div className="flex flex-col space-y-2 text-white">
            {[
              { id: 'abstract', title: '1. 摘要' },
              { id: 'intro', title: '2. 引言' },
              { id: 'architecture', title: '3. 架构概览' },
              { id: 'wrmb', title: '4. WRMB 稳定币' },
              { id: 'swrmb', title: '5. sWRMB 收益代币' },
              { id: 'cina', title: '6. CINA 治理代币' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="text-blue-400 hover:text-blue-300 cursor-pointer underline"
              >
                {item.title}
              </a>
            ))}
          </div>
        </div>

        {/* 1. 摘要 */}
        <section id="abstract" className="mb-12 scroll-mt-28">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-6">1. 摘要</h3>
            <div className="text-white space-y-4 leading-relaxed">
              <p>
                <strong className="text-blue-400">CINA Protocol</strong> 引入了 <a href="#wrmb" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">WRMB</a>，一种旨在追踪在岸人民币 (CNY) 价值的去中心化稳定币，其价值支撑来源于在大中华区内受监管的货币市场基金 (MMF) 所产生的收益。
              </p>
              <p>
                协议采用基于 <a href="#architecture" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">RWA（真实世界资产）</a> 的混合算法模型，通过链上代币化 MMF 份额 (sWRMB) 提供支持，规避了传统法币储备的强监管。
              </p>
              <p>
                协议为 sWRMB 持有者设计了创新的动态总 APY 机制 (含基础与加成 APY)，并整合原生 <a href="#cina" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">CINA 代币</a>用于治理、流动性激励以及独特的不可逆"债券认购"消耗机制。
              </p>
            </div>
          </div>
        </section>

        {/* 2. 引言 */}
        <section id="intro" className="mb-12 scroll-mt-28">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-6">2. 引言</h3>
            <div className="text-white space-y-6 leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold mb-3">2.1 挑战</h4>
                <p className="mb-2">DeFi 中缺乏追踪 CNY 价值、提供合规可持续 RWA 收益的稳定资产；现有稳定币模型的局限性（监管、稳定性、资本效率）。</p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-3">2.2 CINA Dollar Protocol 解决方案</h4>
                <p>以 <a href="#wrmb" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">WRMB</a> 为核心，基于 MMF 的 RWA 支持，结合 <a href="#swrmb" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">sWRMB</a> 动态收益、<a href="#cina" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">CINA</a> 深度效用及主动市场操作 (AMO) 的混合模型。</p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-3">2.3 愿景与目标</h4>
                <p>提供追踪 CNY 的稳定单元；桥接 TradFi MMF 收益；提升资本效率；实现去中心化治理；探索合规创新路径。</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. 架构概览 */}
        <section id="architecture" className="mb-12 scroll-mt-28">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-6">3. 架构概览</h3>
            <div className="text-white space-y-6 leading-relaxed">
              <div>
                <h4 className="text-lg font-semibold mb-3">3.2 关键组件</h4>
                <p className="mb-3"><strong>核心合约：</strong>Vault (金库/蓄水池)、WRMB (ERC20)、sWRMB (ERC20, yield-bearing)、CINA (ERC20)、WRMBMinter、SavingsModule、CinaBondModule、AmoController、OracleInterfaces (NAV, CNY/USD, CINA Price)、GovernanceContracts (DAO, Timelock)、WrappingManager、UnwrapModule。</p>
                <p className="mb-3"><strong>内部记账：</strong>sRMB (代表 MMF 投资本金金额的非币化记账凭证)。</p>
                <p className="mb-3"><strong>运营商：</strong>CINA Labs (负责技术实现、链下协调、部分 AMO 执行，受 DAO/基金会监督)。</p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-3">3.3 推荐部署环境</h4>
                <p>主流 Layer 2 网络 (如 <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">Arbitrum</a>, <a href="https://optimism.io" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">Optimism</a>)，以降低 Gas 费用并提高可扩展性。</p>
              </div>
            </div>
          </div>
        </section>

        {/* 代币说明 */}
        <section id="wrmb" className="mb-12 scroll-mt-28">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-6">4. WRMB 稳定币</h3>
            <div className="text-white space-y-4 leading-relaxed">
              <p>
                <strong>WRMB</strong> 是一种去中心化稳定币，旨在追踪在岸人民币 (CNY) 的价值。其价值支撑来源于在大中华区内受监管的货币市场基金 (MMF) 所产生的收益。
              </p>
              <p>
                WRMB 通过链上代币化 <a href="#swrmb" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">MMF 份额 (sWRMB)</a> 提供支持，规避了传统法币储备的强监管。
              </p>
            </div>
          </div>
        </section>

        <section id="swrmb" className="mb-12 scroll-mt-28">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-6">5. sWRMB 收益代币</h3>
            <div className="text-white space-y-4 leading-relaxed">
              <p>
                <strong>sWRMB</strong> 是收益型代币，代表在货币市场基金中的份额，为持有者提供动态 APY。
              </p>
              <p>
                协议为 sWRMB 持有者设计了创新的动态总 APY 机制，包含基础 APY（来自 MMF 收益）和加成 APY（来自 <a href="#cina" className="text-blue-400 hover:text-blue-300 cursor-pointer underline">CINA</a> 激励），并通过算法动态调整以优化收益。
              </p>
            </div>
          </div>
        </section>

        <section id="cina" className="mb-12 scroll-mt-28">
          <div className="flex flex-col">
            <h3 className="text-2xl font-bold text-white mb-6">6. CINA 治理代币</h3>
            <div className="text-white space-y-4 leading-relaxed">
              <p>
                <strong>CINA</strong> 是原生治理代币，整合用于协议治理、流动性激励以及独特的不可逆"债券认购"消耗机制。
              </p>
              <p>
                在 CINA DAO 和基金会的治理下，协议通过算法市场操作 (AMO) 主动管理 DEX 流动性，并动态调整 CINA 奖励以激励外部资本参与稳定机制。
              </p>
            </div>
          </div>
        </section>

        {/* 返回按钮 */}
        <div className="flex justify-center mt-16 mb-8">
          <Link 
            href="/"
            className="text-blue-400 hover:text-blue-300 cursor-pointer underline flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}


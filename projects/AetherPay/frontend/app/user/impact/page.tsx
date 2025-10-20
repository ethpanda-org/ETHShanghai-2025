'use client';

import { useAccount, useReadContract } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { CONTRACTS, PUBLIC_GOODS_FUND_ABI } from '@/lib/contracts';
import Link from 'next/link';
import { useState } from 'react';

export default function ImpactPage() {
  const { address, isConnected } = useAccount();

  // 读取用户贡献信息
  const { data: contributorData } = useReadContract({
    address: CONTRACTS.PUBLIC_GOODS_FUND as `0x${string}`,
    abi: PUBLIC_GOODS_FUND_ABI,
    functionName: 'getContributorInfo',
    args: [address as `0x${string}`],
  });

  const totalDonation = contributorData ? Number((contributorData as any)[0]) / 1e6 : 0;

  // 模拟数据：用户支持的项目及其影响
  const projects = [
    {
      name: 'Ethereum Foundation',
      logo: '⟠',
      category: '核心开发',
      donation: 5.23,
      impact: {
        developers: 12,
        commits: 1234,
        releases: 3,
      },
      description: '支持以太坊核心协议开发和研究',
      color: 'from-purple-500 to-indigo-600',
    },
    {
      name: 'Optimism Collective',
      logo: '🔴',
      category: 'Layer 2',
      donation: 3.45,
      impact: {
        transactions: 50000,
        gasReduced: '85%',
        users: 2500,
      },
      description: '推动以太坊扩容和降低交易成本',
      color: 'from-red-500 to-pink-600',
    },
    {
      name: 'Gitcoin Grants',
      logo: '🌱',
      category: '公共物品',
      donation: 2.11,
      impact: {
        projects: 45,
        developers: 120,
        grants: 15,
      },
      description: '资助开源项目和公共物品建设',
      color: 'from-green-500 to-emerald-600',
    },
    {
      name: 'EthPanda',
      logo: '🐼',
      category: '教育',
      donation: 1.55,
      impact: {
        students: 300,
        courses: 8,
        tutorials: 25,
      },
      description: '提供免费的以太坊开发教育资源',
      color: 'from-blue-500 to-cyan-600',
    },
  ];

  // 计算总体影响
  const totalImpact = {
    developers: projects.reduce((sum, p) => sum + (p.impact.developers || 0), 0),
    projects: projects.reduce((sum, p) => sum + (p.impact.projects || 0), 0),
    users: projects.reduce((sum, p) => sum + (p.impact.users || 0), 0),
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-xl font-bold text-slate-900">AetherPay</span>
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="text-4xl font-bold text-slate-900 mb-4">我的影响力</h1>
            <p className="text-xl text-slate-600 mb-8">
              连接钱包查看您对以太坊生态的贡献影响
            </p>
            <ConnectButton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-slate-900">AetherPay</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/user" className="text-slate-600 hover:text-slate-900 font-medium">
                我的贡献
              </Link>
              <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 font-medium">
                商家后台
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-slate-600 mb-6">
          <Link href="/user" className="hover:text-slate-900">我的贡献</Link>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium">我的影响力</span>
        </div>

        {/* Hero Section */}
        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-3xl shadow-2xl p-8 md:p-12 text-white mb-8">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-bold mb-4">您的贡献正在改变世界 🌍</h1>
            <p className="text-xl text-purple-100 mb-8">
              通过 AetherPay，您已经为 {projects.length} 个开源项目捐赠了 ${totalDonation.toFixed(2)}，
              帮助 {totalImpact.developers} 位开发者构建更好的以太坊生态。
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
                <div className="text-3xl font-bold">{totalImpact.developers}</div>
                <div className="text-sm text-purple-100">开发者</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
                <div className="text-3xl font-bold">{totalImpact.projects}</div>
                <div className="text-sm text-purple-100">项目</div>
              </div>
              <div className="bg-white/20 backdrop-blur-sm rounded-xl px-6 py-4">
                <div className="text-3xl font-bold">{totalImpact.users.toLocaleString()}</div>
                <div className="text-sm text-purple-100">受益用户</div>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">支持的项目详情</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((project, index) => (
              <div key={index} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                {/* Project Header */}
                <div className={`bg-gradient-to-r ${project.color} p-6 text-white`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center text-2xl">
                        {project.logo}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{project.name}</h3>
                        <span className="text-xs px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                          {project.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${project.donation.toFixed(2)}</div>
                      <div className="text-xs text-white/80">您的捐赠</div>
                    </div>
                  </div>
                  <p className="text-sm text-white/90">{project.description}</p>
                </div>

                {/* Impact Metrics */}
                <div className="p-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-4">项目影响力</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {Object.entries(project.impact).map(([key, value], i) => (
                      <div key={i} className="text-center p-3 bg-slate-50 rounded-lg">
                        <div className="text-xl font-bold text-slate-900">
                          {typeof value === 'number' ? value.toLocaleString() : value}
                        </div>
                        <div className="text-xs text-slate-600 capitalize">
                          {key === 'developers' && '开发者'}
                          {key === 'commits' && '代码提交'}
                          {key === 'releases' && '版本发布'}
                          {key === 'transactions' && '交易数'}
                          {key === 'gasReduced' && 'Gas 降低'}
                          {key === 'users' && '用户数'}
                          {key === 'projects' && '项目数'}
                          {key === 'grants' && '资助轮次'}
                          {key === 'students' && '学生数'}
                          {key === 'courses' && '课程数'}
                          {key === 'tutorials' && '教程数'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">贡献时间线</h2>
          <div className="space-y-6">
            <TimelineItem
              date="2025-01-15"
              title="支持 Ethereum Foundation"
              description="您的捐赠帮助资助了以太坊核心开发"
              amount={5.23}
              icon="⟠"
            />
            <TimelineItem
              date="2025-01-10"
              title="支持 Optimism Collective"
              description="推动 Layer 2 扩容解决方案"
              amount={3.45}
              icon="🔴"
            />
            <TimelineItem
              date="2025-01-05"
              title="支持 Gitcoin Grants"
              description="资助开源项目和公共物品"
              amount={2.11}
              icon="🌱"
            />
            <TimelineItem
              date="2024-12-28"
              title="支持 EthPanda"
              description="提供免费的以太坊教育资源"
              amount={1.55}
              icon="🐼"
            />
          </div>
        </div>

        {/* Call to Action */}
        <div className="mt-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">继续您的贡献之旅</h2>
          <p className="text-lg text-emerald-100 mb-6">
            每一笔支付都在为以太坊生态做出贡献
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link
              href="/user"
              className="bg-white text-emerald-600 font-semibold px-8 py-3 rounded-lg hover:bg-emerald-50 transition-colors"
            >
              查看我的贡献
            </Link>
            <Link
              href="/public-goods"
              className="bg-white/20 backdrop-blur-sm text-white font-semibold px-8 py-3 rounded-lg hover:bg-white/30 transition-colors"
            >
              探索更多项目
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function TimelineItem({ date, title, description, amount, icon }: any) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-xl shadow-lg">
          {icon}
        </div>
        <div className="w-0.5 h-full bg-slate-200 mt-2"></div>
      </div>
      <div className="flex-1 pb-6">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600">{description}</p>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-purple-600">${amount.toFixed(2)}</div>
            <div className="text-xs text-slate-500">{date}</div>
          </div>
        </div>
      </div>
    </div>
  );
}


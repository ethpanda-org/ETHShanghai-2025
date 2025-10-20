"use client";

import BusinessCard from "@/components/BusinessCard";
// ✅ 新增：导入岛屿通行证和名片组件
import IslandPass from "@/components/IslandPass";
import Nav from "@/components/Nav";
import ProofForm from "@/components/ProofForm";
import ScoreCard from "@/components/ScoreCard";
import { useDemo } from "@/lib/demoStore";

export default function Dashboard() {
  const demo = useDemo();

  return (
    <>
      <Nav />
      <main className="container py-10 space-y-8">
        {/* 页面标题 + Demo Mode 开关 */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display tracking-[0.12em]">DASHBOARD</h2>
          <label className="text-sm flex items-center gap-2">
            <input type="checkbox" checked={demo.demoMode} onChange={e => demo.setDemoMode(e.target.checked)} />
            <span className="badge">Demo Mode</span>
          </label>
        </div>

        {/* ✅ 三张主卡：分数 / 岛屿通行证 / 数字名片 */}
        <div className="grid md:grid-cols-3 gap-6">
          <ScoreCard />
          <IslandPass />
          <BusinessCard />
        </div>

        {/* ✅ Proof 提交表单 */}
        <ProofForm />

        {/* 底部提示卡片 */}
        <div className="card">
          <div className="text-sm opacity-70">
            Switch Demo Mode off to connect real contracts (Score / SBT / Vault).
          </div>
        </div>
      </main>
    </>
  );
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";

export default function Page() {
  return (
    <>
      {/* ===== 顶部导航 ===== */}
      <nav className="border-b border-white/10 sticky top-0 z-40 backdrop-blur bg-black/60">
        <div className="h-1 w-full bg-gradient-to-r from-[#00FF6A] via-[#00E5FF] to-[#FF3EB5]" />
        <div className="container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-4 w-4 bg-[#00FF6A]" />
            <span className="font-display tracking-[0.22em] text-sm">NOMOS</span>
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm">
            <Link href="/#about" className="opacity-80 hover:opacity-100">
              ABOUT
            </Link>
            <Link href="/#mechanism" className="opacity-80 hover:opacity-100">
              MECHANISM
            </Link>
            <Link href="/dashboard" className="opacity-80 hover:opacity-100">
              DASHBOARD
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== Hero 部分 ===== */}
      <main className="relative overflow-hidden">
        <section className="container py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          {/* 左侧标题文案 */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-wide">
              <span className="text-[#00FF6A]">NOMOS</span>
              <br />
              Reputation → Income
            </h1>
            <p className="mt-6 text-lg text-white/80 max-w-xl">
              A crypto-native coordination layer where <b>existence becomes yield</b>. Connect your wallet, verify
              contribution, and earn sustainable UBI.
            </p>
            <div className="mt-8 flex gap-4 flex-wrap">
              <Link href="/dashboard" className="pixel-btn">
                Launch Dashboard
              </Link>
              <a href="https://github.com/KamisAyaka/crowdsourcing_graphql" target="_blank" className="btn-ghost">
                GitHub
              </a>
            </div>
          </motion.div>

          {/* 右侧像素卡展示 */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.9 }}
            className="pixel accent-cyan p-6 relative"
          >
            <div className="badge-pixel">Proof System</div>
            <h2 className="text-2xl mt-3 font-display">Proof → Score → UBI</h2>
            <p className="mt-3 text-sm opacity-85">NOMOS quantifies contribution across three proofs:</p>
            <ul className="mt-3 space-y-1 text-sm opacity-90">
              <li>›› PoP — Presence (签到 / 共居记录)</li>
              <li>›› PoC — Contribution (任务 / 投票 / 内容产出)</li>
              <li>›› PoE — Engagement (持续交互与留存)</li>
            </ul>
            <div className="mt-6 text-3xl font-extrabold text-[#00FF6A] drop-shadow-[0_0_12px_rgba(0,255,106,.6)]">
              Existence = Yield
            </div>
            {/* 青 / 粉色像素圆形装饰 */}
            <div className="absolute -right-6 -bottom-8 h-28 w-28 rounded-full border-2 border-[#00FF6A] bg-black/70 shadow-[0_0_20px_rgba(0,255,106,.3)]" />
            <div className="absolute -right-20 bottom-8 h-24 w-24 rounded-full border-2 border-[#FF3EB5] bg-black/70 shadow-[0_0_20px_rgba(255,62,181,.3)]" />
          </motion.div>
        </section>

        {/* ===== 三个功能模块卡片 ===== */}
        <section id="about" className="container pb-20 grid md:grid-cols-3 gap-6">
          {[
            {
              t: "PoP — Presence",
              d: "Join IRL NOMOS Islands, scan or verify your attendance.",
              c: "accent-cyan",
            },
            {
              t: "PoC — Contribution",
              d: "Complete tasks, publish content, or vote in DAO proposals.",
              c: "accent-pink",
            },
            {
              t: "PoE — Engagement",
              d: "Sustain interaction over time; reputation decays without action.",
              c: "",
            },
          ].map(x => (
            <motion.div
              key={x.t}
              className={`pixel ${x.c} hover:scale-[1.02] transition-transform duration-200`}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-xl font-display">{x.t}</div>
              <p className="opacity-80 mt-2 text-sm">{x.d}</p>
            </motion.div>
          ))}
        </section>
      </main>
    </>
  );
}

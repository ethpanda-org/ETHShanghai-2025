"use client";

/**
 * 升级后的 ProofForm：
 * - 支持 3 种模式（通过环境变量选择）：
 *   1) onchain：调用 Proof 合约 submitProof()
 *   2) http   ：POST 到你后端 / GraphQL（通过 /api/proof 转发，避免 CORS）
 *   3) demo   ：本地记录（兜底，永不冷场）
 *
 * 环境变量：
 *   NEXT_PUBLIC_PROOF_MODE=onchain | http | demo
 *   NEXT_PUBLIC_PROOF_ADDRESS=0x...         // onchain 模式需要
 *   NEXT_PUBLIC_PROOF_API=https://.../proof // http 模式需要（/api/proof 会转发）
 *   PROOF_BEARER_TOKEN=...                  // 可选，给后端授权用（放到 server env）
 */
import { useState } from "react";
import { ProofType, useDemo } from "@/lib/demoStore";
import { Address, getAddress } from "viem";
import { useAccount, useWriteContract } from "wagmi";

const MODE = (process.env.NEXT_PUBLIC_PROOF_MODE || "demo").toLowerCase();
const PROOF_ADDR = (process.env.NEXT_PUBLIC_PROOF_ADDRESS || "") as Address;
const HAS_HTTP = !!process.env.NEXT_PUBLIC_PROOF_API;

// 这里放一个常见的 Proof 合约接口（按你的实际合约改名/参数即可）
const PROOF_ABI = [
  // submitProof(address user, uint8 ptype, string title, string uri, uint256 weight)
  {
    name: "submitProof",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "user", type: "address" },
      { name: "ptype", type: "uint8" },
      { name: "title", type: "string" },
      { name: "uri", type: "string" },
      { name: "weight", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export default function ProofForm() {
  const demo = useDemo();
  const { address } = useAccount();
  const { writeContract, isPending } = useWriteContract();

  const [type, setType] = useState<ProofType>("PoP");
  const [title, setTitle] = useState(""); // 以前的 note 拆成更规范的字段
  const [uri, setUri] = useState("");
  const [weight, setWeight] = useState<string>("10");
  const [msg, setMsg] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!address) return alert("请先连接钱包");

    // ------- 1) ONCHAIN -------
    if (MODE === "onchain") {
      if (!PROOF_ADDR) {
        alert("未配置 NEXT_PUBLIC_PROOF_ADDRESS，自动切到 HTTP/DEMO 兜底");
      } else {
        try {
          await writeContract({
            address: getAddress(PROOF_ADDR),
            abi: PROOF_ABI,
            functionName: "submitProof",
            args: [
              getAddress(address as `0x${string}`),
              type === "PoP" ? 0 : type === "PoC" ? 1 : 2,
              title || type,
              uri || "",
              BigInt(weight || "0"),
            ],
          });
          setMsg("✅ 链上 Proof 已提交");
          // 链上成功就直接本地也记一条，方便 UI 看到
          demo.addProof({ type, note: title || type });
          return;
        } catch (err: any) {
          alert("链上提交失败，将使用 HTTP/DEMO 兜底。\n" + (err?.message || err));
        }
      }
    }

    // ------- 2) HTTP -------
    if (MODE === "http" || HAS_HTTP) {
      try {
        const r = await fetch("/api/proof", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            user: address,
            type,
            title: title || type,
            uri,
            weight: Number(weight || "0"),
          }),
        });
        const j = await r.json();
        if (!j.ok) throw new Error(j.error || "Upstream error");
        setMsg("✅ Proof 已提交到后端 API");
        demo.addProof({ type, note: title || type }); // 本地也记一下
        return;
      } catch (err: any) {
        alert("HTTP 提交失败，进入 DEMO 兜底。\n" + (err?.message || err));
      }
    }

    // ------- 3) DEMO 兜底 -------
    demo.addProof({ type, note: title || type });
    // 顺便给分，提升“可见效果”
    demo.setProfile({
      address,
      level: (demo.profile?.level as any) || "Good",
      score: (demo.profile?.score || 0) + Number(weight || "0"),
      lastActive: new Date().toISOString(),
      weeklyUbi: Math.round((((demo.profile?.score || 0) + Number(weight || "0")) / 100) * 10),
    });
    setMsg("✅ （Demo）本地已记录并加分");
  }

  return (
    <div className="pixel-card cyan space-y-4">
      <div className="badge-pixel">RECORD PROOF</div>

      <form className="space-y-3" onSubmit={submit}>
        <label className="block">
          <div className="text-xs opacity-70 mb-1">Type</div>
          <select className="input w-full" value={type} onChange={e => setType(e.target.value as ProofType)}>
            <option value="PoP">PoP — Presence</option>
            <option value="PoC">PoC — Contribution</option>
            <option value="PoE">PoE — Engagement</option>
          </select>
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Title / Note</div>
          <input
            className="input w-full"
            placeholder="Hosted meetup / Merged PR / Voted…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Link / Evidence (可选)</div>
          <input
            className="input w-full"
            placeholder="GitHub / POAP / Attestation link"
            value={uri}
            onChange={e => setUri(e.target.value)}
          />
        </label>

        <label className="block">
          <div className="text-xs opacity-70 mb-1">Weight</div>
          <input
            className="input w-32"
            type="number"
            min={0}
            value={weight}
            onChange={e => setWeight(e.target.value)}
          />
        </label>

        <div className="flex gap-2">
          <button type="submit" className="pixel-btn" disabled={isPending}>
            {isPending ? "Submitting…" : "Submit Proof"}
          </button>
          <span className="text-xs opacity-70 self-center">模式：{MODE.toUpperCase()}（失败自动兜底）</span>
        </div>
      </form>

      {msg && <div className="pixel-surface">{msg}</div>}

      <div className="text-sm opacity-70">Recent proofs:</div>
      <ul className="text-sm space-y-1">
        {demo.proofs
          .slice(-5)
          .reverse()
          .map((p, i) => (
            <li key={i} className="flex justify-between border-b border-white/10 py-1">
              <span>
                {p.type} · {p.note}
              </span>
              <span>{new Date(p.at).toLocaleString()}</span>
            </li>
          ))}
      </ul>
    </div>
  );
}

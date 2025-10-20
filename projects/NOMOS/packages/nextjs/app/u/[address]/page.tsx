"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PixelModal from "@/components/PixelModal";
import { QRCodeCanvas } from "qrcode.react";
import { parseEther } from "viem";
import { useAccount, useSendTransaction } from "wagmi";

// 读 score 的 API
async function fetchScore(addr: string) {
  const r = await fetch(`/api/score?user=${addr}`, { cache: "no-store" });
  if (!r.ok) throw new Error((await r.json()).error || `HTTP ${r.status}`);
  const j = await r.json();
  return Number(j.score ?? 0);
}
function shortAddr(a?: string) {
  if (!a) return "-";
  return a.slice(0, 6) + "..." + a.slice(-4);
}
function levelByScore(s: number) {
  return s > 200 ? "Excellent" : s > 100 ? "Good" : "Poor";
}

export default function PublicCardPage() {
  const params = useParams<{ address: string }>();
  const address = useMemo(() => (params?.address || "").toLowerCase(), [params]);

  const [score, setScore] = useState<number | null>(null);
  const [err, setErr] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [doneMsg, setDoneMsg] = useState("");

  const shareUrl =
    typeof window !== "undefined" ? `${window.location.origin}/u/${address}` : `https://example.com/u/${address}`;

  useEffect(() => {
    if (!address) return;
    setErr("");
    setScore(null);
    fetchScore(address)
      .then(setScore)
      .catch(e => setErr(e?.message || String(e)));
  }, [address]);

  // 表单状态
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [message, setMessage] = useState("");
  const [amount, setAmount] = useState<string>("0.001"); // 默认 0.001 ETH
  const { address: myAddr, chain } = useAccount();
  const { sendTransaction, isPending } = useSendTransaction();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setDoneMsg("");
    // 1) 链上打赏（可选：金额>0 且连接钱包）
    try {
      const amt = Number(amount || "0");
      if (amt > 0 && myAddr) {
        await sendTransaction({
          to: address as `0x${string}`,
          value: parseEther(amt.toString()),
        });
      }
    } catch (e: any) {
      return alert("打赏交易未完成/被拒绝：" + (e?.message || e));
    }

    // 2) 提交到后端 API（必做）
    try {
      const r = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          to: address,
          name,
          handle,
          message,
          amountEth: amount,
          from: myAddr || "",
          chainId: chain?.id || "",
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "submit failed");
      setDoneMsg("成功提交！我们已收到你的 Follow/Tip。");
      setName("");
      setHandle("");
      setMessage("");
    } catch (e: any) {
      alert("提交失败：" + (e?.message || e));
    }
  }

  return (
    <main className="container py-10 md:py-16">
      {/* 顶部返回与标题条 */}
      <div className="flex items-center justify-between mb-6">
        <Link href="/" className="btn-ghost">
          ← Home
        </Link>
        <div className="h-1 w-1/2 bg-gradient-to-r from-[#00FF6A] via-[#00E5FF] to-[#FF3EB5]" />
      </div>

      {/* 名片主卡 */}
      <div className="pixel-card pink">
        <div className="badge-pixel">NOMOS CARD</div>

        <div className="mt-3 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold pixel-title pink">On-Chain NOMOS</h1>
            <div className="addr mono opacity-85 mt-1" title={address}>
              {shortAddr(address)}
            </div>

            {/* 数据面板 */}
            <div className="pixel-surface mt-4 inline-grid grid-cols-3 gap-10">
              <div>
                <div className="text-xs opacity-70">Score</div>
                <div className="text-2xl font-extrabold">{score ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Level</div>
                <div className="text-xl">{score == null ? "—" : levelByScore(score)}</div>
              </div>
              <div>
                <div className="text-xs opacity-70">Network</div>
                <div className="text-sm">Sepolia</div>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted max-w-xl">
              Proof → Score → UBI. Share your NOMOS identity with a public, verifiable reputation.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button className="pixel-btn" onClick={() => setOpen(true)}>
                Follow / Tip
              </button>

              <a
                className="btn-ghost"
                href={`data:text/vcard;charset=utf-8,${encodeURIComponent(
                  `BEGIN:VCARD
VERSION:3.0
FN:On-Chain NOMOS
NOTE:NOMOS profile ${address}
URL:${shareUrl}
END:VCARD`,
                )}`}
                download="NOMOS-card.vcf"
              >
                Download vCard
              </a>

              <button className="btn-ghost" onClick={() => navigator.clipboard?.writeText(shareUrl)}>
                Copy Link
              </button>

              <a className="btn-ghost" target="_blank" href={`https://sepolia.etherscan.io/address/${address}`}>
                View on Explorer
              </a>
            </div>

            {doneMsg && (
              <div className="pixel-surface mt-3" role="status">
                ✅ {doneMsg}
              </div>
            )}

            {err && <pre className="scrollbox mono mt-4 text-red-300 whitespace-pre-wrap">Load error: {err}</pre>}
          </div>

          {/* 右侧二维码 */}
          <div className="justify-self-end">
            <div className="p-2 bg-white border-4 border-[var(--pink)] inline-block">
              <QRCodeCanvas value={shareUrl} size={200} includeMargin bgColor="#ffffff" fgColor="#000000" />
            </div>
            <div className="text-xs opacity-70 mt-2">Scan to open public profile</div>
          </div>
        </div>
      </div>

      {/* Follow/Tip 弹窗表单 */}
      <PixelModal open={open} title="FOLLOW / TIP" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <div className="text-xs opacity-70 mb-1">Your Name</div>
              <input
                className="input w-full"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Satoshi"
                required
              />
            </label>
            <label className="block">
              <div className="text-xs opacity-70 mb-1">Handle / Link</div>
              <input
                className="input w-full"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@twitter / telegram / site"
              />
            </label>
          </div>
          <label className="block">
            <div className="text-xs opacity-70 mb-1">Message</div>
            <textarea
              className="input w-full"
              rows={3}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Hey, I’d like to connect / invite you …"
            />
          </label>
          <label className="block">
            <div className="text-xs opacity-70 mb-1">Tip (ETH, optional)</div>
            <input
              className="input w-40"
              type="number"
              min={0}
              step="0.0001"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.001"
            />
            <div className="text-xs opacity-60 mt-1">需要连接钱包；填 0 则仅提交表单不打赏。</div>
          </label>

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="pixel-btn" disabled={isPending}>
              {isPending ? "Sending…" : "Send"}
            </button>
          </div>
        </form>
      </PixelModal>
    </main>
  );
}

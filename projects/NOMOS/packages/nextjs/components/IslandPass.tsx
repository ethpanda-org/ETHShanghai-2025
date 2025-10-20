"use client";

export default function IslandPass() {
  return (
    <div className="pixel-card cyan">
      <div className="badge-pixel">ISLAND PASS (SBT)</div>

      <h3 className="mt-3 text-3xl font-extrabold pixel-title cyan">Good</h3>

      {/* 亮底内容面板：正文对比更强 */}
      <div className="pixel-surface mt-3">
        <p className="text-sm text-muted">Access to IRL nodes, events, and builder privileges.</p>

        {/* 关键权益点：行高更松、可读 */}
        <ul className="mt-3 space-y-2 text-sm">
          <li>• Entry to NOMOS Islands</li>
          <li>• Event priority & builder track</li>
          <li>• Reputation-linked perks</li>
        </ul>

        {/* 表单：采集用户资料用于 mintUserNFT */}
        <MintIslandPassForm />
      </div>

      {/* 操作按钮：一深一亮形成对比 */}
      <div className="mt-4 flex gap-3">
        <button className="btn-ghost">View Traits</button>
        <MintIslandPassButton />
      </div>
    </div>
  );
}

import { useState } from "react";
import { useAccount } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

function MintIslandPassButton() {
  const { address } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "SoulboundUserNFT" });

  // 仅渲染按钮，具体表单在 MintIslandPassForm 内部控制
  async function onMint() {}

  return (
    <button className="pixel-btn" onClick={onMint} disabled={!address}>
      Mint / Bind
    </button>
  );
}

function MintIslandPassForm() {
  const { address } = useAccount();
  const { writeContractAsync } = useScaffoldWriteContract({ contractName: "SoulboundUserNFT" });

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [skillsText, setSkillsText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailOk = !email || /.+@.+\..+/.test(email);
  const skills = skillsText
    .split(",")
    .map(s => s.trim())
    .filter(Boolean);

  async function submit() {
    if (!address) return alert("请先连接钱包");
    if (!username) return alert("请输入用户名");
    if (!emailOk) return alert("邮箱格式不正确");
    setSubmitting(true);
    try {
      await writeContractAsync({
        functionName: "mintUserNFT",
        args: [username, email, bio, avatar, skills],
      });
      alert("Mint transaction submitted");
    } catch (e: any) {
      alert(e?.shortMessage || e?.message || String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input
          className="input"
          placeholder="Username"
          value={username}
          onChange={e => setUsername(e.target.value)}
        />
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
      </div>
      <input
        className="input"
        placeholder="Avatar URL"
        value={avatar}
        onChange={e => setAvatar(e.target.value)}
      />
      <textarea
        className="textarea"
        placeholder="Bio"
        rows={3}
        value={bio}
        onChange={e => setBio(e.target.value)}
      />
      <input
        className="input"
        placeholder="Skills (comma separated)"
        value={skillsText}
        onChange={e => setSkillsText(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <button className="pixel-btn" disabled={!address || !username || !emailOk || submitting} onClick={submit}>
          {submitting ? "Minting…" : "Mint / Bind"}
        </button>
        {!emailOk && <span className="text-xs text-red-400">邮箱格式不正确</span>}
      </div>
    </div>
  );
}

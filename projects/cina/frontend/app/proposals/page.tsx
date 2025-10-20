'use client';
import { useEffect, useState } from 'react';

// 禁用静态优化，因为此页面需要从后端获取动态数据
export const dynamic = 'force-dynamic';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://sepolia.infura.io/v3/62c0ac4c3b2e4a809869158eeec667e8';
const DAO = process.env.NEXT_PUBLIC_DAO_ADDRESS || '';

export default function ProposalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string>('');

  useEffect(()=>{
    (async ()=>{
      try {
        const r = await fetch(`${BACKEND}/v1/dao/proposals?dao=${DAO}&fromBlock=-5000&limit=20`);
        const j = await r.json();
        if (j.code === 0) setItems(j.data);
        else setErr(j.message);
      } catch(e:any){ setErr(e?.message); }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="card p-4">
        <div className="text-lg font-semibold mb-3">Proposals</div>
      {err && <div className="text-red-400">{err}</div>}
      <div className="space-y-2">
        {items.map(p => (
          <a key={p.id} href={`/proposals/${p.id}`} className="block p-3 rounded-lg bg-white/5 hover:bg-white/10">
            <div className="text-sm text-neutral-400">#{p.id} · {p.state}</div>
            <div className="font-medium">{p.title}</div>
          </a>
        ))}
      </div>
      </div>
    </div>
  );
}

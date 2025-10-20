'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8787';
const DAO = process.env.NEXT_PUBLIC_DAO_ADDRESS || '';

export default function ProposalDetail() {
  const params = useParams();
  const id = params?.id as string;
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState<string>('');

  useEffect(()=>{
    if (!id) return;
    (async ()=>{
      try{
        const r = await fetch(`${BACKEND}/v1/dao/proposals/${id}?dao=${DAO}`);
        const j = await r.json();
        if (j.code === 0) setP(j.data);
        else setErr(j.message);
      }catch(e:any){ setErr(e?.message); }
    })();
  }, [id]);

  if (err) return <div className="card p-4 text-red-400">{err}</div>;
  if (!p) return <div className="card p-4">加载中…</div>;

  return (
    <div className="card p-4 space-y-2">
      <div className="text-sm text-neutral-400">Proposal #{p.id} · {p.state}</div>
      <div className="text-lg font-semibold">{p.title}</div>
      <pre className="whitespace-pre-wrap text-neutral-300">{p.description}</pre>
      <div className="mt-3">
        <div className="text-sm text-neutral-400">Actions</div>
        <pre className="whitespace-pre-wrap text-neutral-300">{JSON.stringify(p.actions, null, 2)}</pre>
      </div>
    </div>
  );
}

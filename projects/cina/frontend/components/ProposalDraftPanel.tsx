'use client';
import Button from './ui/Button';
import Input from './ui/Input';
import Textarea from './ui/Textarea';
import { useDraftStore } from '../lib/store/draft';
import { parseEther } from 'viem';
import { useState } from 'react';
import { useWriteContract } from 'wagmi';
import governorAbi from '../lib/abi/AIProposalGovernor.json';

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://127.0.0.1:8787';
const DAO = process.env.NEXT_PUBLIC_DAO_ADDRESS || '';

export default function ProposalDraftPanel() {
  const { draft, mergeDraft, reset } = useDraftStore(s => ({ draft: s.draft, mergeDraft: s.mergeDraft, reset: s.reset }));
  const [eth, setEth] = useState('');
  const [status, setStatus] = useState<string>('');
  const { writeContractAsync } = useWriteContract();

  // 点击模拟按钮
  const simulate = async () => {
    if (!draft) return;
    setStatus('模拟中...');
    const res = await fetch(`${BACKEND}/v1/dao/simulate`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        dao: DAO,
        title: draft.title,
        description: draft.description,
        fundAmountWei: draft.fundAmountWei,
        target: draft.target
      })
    });
    const data = await res.json();
    if (data.code === 0) {
      mergeDraft({ calldata: data.data.calldata, gasEstimate: data.data.gasEstimate });
      setStatus('模拟通过，预估 Gas ≈ ' + data.data.gasEstimate);
    } else {
      setStatus('模拟失败：' + data.message);
    }
  };

  const submit = async () => {
    if (!draft) return;
    try {
      setStatus('提交交易中...');
      const txhash = await writeContractAsync({
        address: DAO as `0x${string}`,
        abi: governorAbi as any,
        functionName: 'proposeAI',
        args: [[draft.title, draft.description, BigInt(draft.fundAmountWei)], draft.target as `0x${string}`],
      });
      setStatus('已提交：' + txhash);
    } catch (e:any) {
      setStatus('提交失败：' + (e?.shortMessage || e?.message));
    }
  };

  if (!draft) {
    return <div className="card p-4 h-full"><div className="text-lg font-semibold mb-2">提案草稿区</div><p className="text-neutral-400">🤖 等待 Chat 产出 <code>proposal_draft</code>，或手动填写……</p></div>;
  }

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="text-lg font-semibold mb-3">提案草稿区</div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <div className="text-sm text-neutral-400 mb-1">Title</div>
          <Input value={draft.title} onChange={e=>mergeDraft({ title: e.target.value })} />
        </div>
        <div>
          <div className="text-sm text-neutral-400 mb-1">Description</div>
          <Textarea value={draft.description} onChange={e=>mergeDraft({ description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-sm text-neutral-400 mb-1">Fund Amount (Wei)</div>
            <Input value={draft.fundAmountWei} onChange={e=>mergeDraft({ fundAmountWei: e.target.value })} />
          </div>
          <div>
            <div className="text-sm text-neutral-400 mb-1">或输入 ETH 快速换算</div>
            <div className="flex gap-2">
              <Input placeholder="1.0" value={eth} onChange={e=>setEth(e.target.value)} />
              <Button onClick={()=>{ try{ const w = parseEther(eth || '0'); mergeDraft({ fundAmountWei: w.toString() }); } catch{} }}>换算→Wei</Button>
            </div>
          </div>
        </div>
        <div>
          <div className="text-sm text-neutral-400 mb-1">Target</div>
          <Input value={draft.target} onChange={e=>mergeDraft({ target: e.target.value })} />
        </div>
        <div>
          <div className="text-sm text-neutral-400 mb-1">Calldata（只读，模拟后生成）</div>
          <Textarea value={draft.calldata || ''} readOnly />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button onClick={simulate}>模拟</Button>
        <Button onClick={submit}>提交到链上</Button>
        <Button onClick={reset}>清空</Button>
      </div>
      <div className="mt-3 text-sm text-neutral-300">{status}</div>
    </div>
  );
}

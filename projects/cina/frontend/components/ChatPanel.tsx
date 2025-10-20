'use client';
import { useState } from 'react';
import Button from './ui/Button';
import Input from './ui/Input';
import { useDraftStore } from '../lib/store/draft';
import type { ActionProtocol, ProposalDraft } from '../lib/types';

type Msg = { role: 'user'|'assistant'; content: string };

function tryParseAction(text: string): ActionProtocol | null {
  // try parse pure JSON
  try { const j = JSON.parse(text); if (j && j.type) return j; } catch {}
  // fallback: find first {...}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { const j = JSON.parse(text.slice(start, end+1)); if (j && j.type) return j; } catch {}
  }
  return null;
}

export default function ChatPanel() {
  const [messages, setMessages] = useState<Msg[]>([
    { role:'assistant' as const, content:'你好，我可以把你的治理诉求转为"提案草稿"。直接描述你的目标即可～' }
  ]);
  const [input, setInput] = useState('建议将 Q2 预算的 30% 分配给市场增长');
  const setDraft = useDraftStore(s => s.setDraft);

  const send = async () => {
    if (!input.trim()) return;
    const newMsgs: Msg[] = [...messages, { role:'user' as const, content: input }];
    setMessages(newMsgs);
    setInput('');
    try {
      const res = await fetch('/api/coze', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ messages: newMsgs }) });
      const data = await res.json();
      const reply = data.reply || '（请在 .env.local 配置 COZE_*，当前为占位回显）';
      setMessages(m => [...m, { role:'assistant' as const, content: reply }]);
      const act = tryParseAction(reply);
      if (act?.type === 'proposal_draft') {
        const d = act.data as ProposalDraft;
        setDraft({ title: d.title, description: d.description, fundAmountWei: d.fundAmountWei, target: d.target, calldata: d.calldata, gasEstimate: d.gasEstimate });
      }
    } catch (e:any) {
      setMessages(m => [...m, { role:'assistant' as const, content: '调用 Coze 失败：' + e?.message }]);
    }
  };

  return (
    <div className="card p-4 h-full flex flex-col">
      <div className="text-lg font-semibold mb-3">Chat（Coze）</div>
      <div className="flex-1 overflow-auto space-y-3 pr-1">
        {messages.map((m, i) => (
          <div key={i} className={m.role==='user' ? 'text-right' : ''}>
            <div className={"inline-block px-3 py-2 rounded-xl " + (m.role==='user' ? 'bg-white/10' : 'bg-white/5')}>
              <pre className="whitespace-pre-wrap text-sm">{m.content}</pre>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="输入你的治理诉求..." />
        <Button onClick={send}>发送</Button>
      </div>
    </div>
  );
}

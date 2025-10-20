import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const base = process.env.COZE_API_BASE;
    const token = process.env.COZE_API_TOKEN;
    const botId = process.env.COZE_BOT_ID;

    // If not configured, echo a synthetic "proposal_draft" to unblock the demo
    if (!base || !token || !botId) {
      const synthetic = {
        type: "proposal_draft",
        data: {
          title: "Q2 Marketing Budget",
          description: "将 30% 基金用于市场增长，分阶段投放。",
          fundAmountWei: "1000000000000000000",
          target: "0x0000000000000000000000000000000000000000"
        },
        next_step: "ask_user_confirm",
        notes: "占位返回。配置 COZE_* 可接入真实智能体。"
      };
      return NextResponse.json({ reply: JSON.stringify(synthetic, null, 2) });
    }

    // Example proxy skeleton (adjust to real Coze API schema)
    const r = await fetch(`${base}/chat`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ bot_id: botId, messages })
    });
    const j = await r.json();
    // Try to extract assistant text; adapt to actual response format
    const reply = j?.result?.text || j?.choices?.[0]?.message?.content || JSON.stringify(j);
    return NextResponse.json({ reply });
  } catch (e:any) {
    return NextResponse.json({ reply: 'Coze 调用异常：' + e?.message }, { status: 200 });
  }
}

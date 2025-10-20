import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const api = process.env.NEXT_PUBLIC_PROOF_API;
    if (!api) return NextResponse.json({ ok: false, error: "NO_PROOF_API" }, { status: 400 });

    const r = await fetch(api, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.PROOF_BEARER_TOKEN ? { Authorization: `Bearer ${process.env.PROOF_BEARER_TOKEN}` } : {}),
      },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return NextResponse.json({ ok: false, error: j.error || `Upstream ${r.status}` }, { status: 500 });
    return NextResponse.json({ ok: true, data: j });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

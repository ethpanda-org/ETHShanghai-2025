import { NextResponse } from "next/server";

const BACKEND_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE_URL || "http://localhost:8080";

export async function GET(_req: Request, context: { params: { address: string } }) {
  const address = context.params?.address;
  if (!address) {
    return NextResponse.json({ error: "missing address" }, { status: 400 });
  }

  try {
    const r = await fetch(`${BACKEND_BASE}/api/v1/guild/score/${address}`, {
      // Avoid caching to reflect latest score
      cache: "no-store",
      // Forward as server-side request
      headers: {
        "Content-Type": "application/json",
      },
    });

    const text = await r.text();
    let data: any;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      return NextResponse.json({ error: `Invalid JSON from backend`, raw: text }, { status: 502 });
    }

    if (!r.ok) {
      const status = r.status || 502;
      return NextResponse.json({ error: data?.error || `Upstream HTTP ${status}` }, { status });
    }

    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || String(e) }, { status: 502 });
  }
}



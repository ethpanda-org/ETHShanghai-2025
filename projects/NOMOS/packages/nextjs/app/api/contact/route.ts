// app/api/contact/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // 简单校验
    const { to, name, handle, message, amountEth } = body || {};
    if (!to || typeof to !== "string") {
      return NextResponse.json({ ok: false, error: "missing 'to' address" }, { status: 400 });
    }

    // 这里你可以对接外部服务：数据库、Webhook、Notion、Slack 等
    // 现在先打印日志（Vercel/本地都能看到服务器日志）
    console.log("[CONTACT_FORM]", { to, name, handle, message, amountEth, ts: Date.now() });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

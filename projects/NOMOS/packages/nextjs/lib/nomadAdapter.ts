"use client";

export async function readScore(user: string) {
  const r = await fetch(`/api/v1/guild/score/${user}`, { cache: "no-store" });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    throw new Error(j.error || `HTTP ${r.status}`);
  }
  const j = await r.json();
  // Backend returns { total_score: number, ... }
  // Be defensive to support multiple shapes
  const maybe = (j && (j.total_score ?? j.score ?? j?.data?.total_score)) as unknown;
  const n = typeof maybe === "string" ? Number(maybe) : (maybe as number);
  return Number.isFinite(n) ? Number(n) : 0;
}

export const SCORE_ADDRESS = process.env.NEXT_PUBLIC_SCORE_ADDRESS || "0x5b34DE9C5B069070F05bdE9d329B525b4F4BE5d9";

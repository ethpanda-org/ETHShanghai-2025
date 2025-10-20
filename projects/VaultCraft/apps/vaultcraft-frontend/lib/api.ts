import { BACKEND_URL } from "@/lib/config";

export type VaultSummary = {
  id: string;
  name: string;
  type: "public" | "private";
  aum?: number;
};

export type VaultDetail = VaultSummary & {
  unitNav: number;
  lockDays: number;
  performanceFee: number;
  managementFee: number;
  totalShares: number;
  metrics: {
    ann_return: number;
    ann_vol: number;
    sharpe: number;
    mdd: number;
    recovery_days: number;
  };
};

export async function getVaults(): Promise<VaultSummary[]> {
  const r = await fetch(`${BACKEND_URL}/api/v1/vaults`, { cache: "no-store" });
  if (!r.ok) throw new Error("vaults fetch failed");
  const data = await r.json();
  return data.vaults || [];
}

export async function getVault(id: string): Promise<VaultDetail> {
  const r = await fetch(`${BACKEND_URL}/api/v1/vaults/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("vault detail fetch failed");
  return await r.json();
}

export async function getNav(id: string, window = 60): Promise<number[]> {
  const r = await fetch(`${BACKEND_URL}/api/v1/nav/${id}?window=${window}`, { cache: "no-store" });
  if (!r.ok) throw new Error("nav fetch failed");
  const data = await r.json();
  return data.nav || [];
}

export type NavPoint = { ts: number; nav: number }

export async function getNavSeries(id: string, opts?: { since?: number; window?: number }): Promise<NavPoint[]> {
  const qs: string[] = []
  if (opts?.since !== undefined) qs.push(`since=${opts.since}`)
  if (opts?.window !== undefined) qs.push(`window=${opts.window}`)
  const r = await fetch(`${BACKEND_URL}/api/v1/nav_series/${id}${qs.length ? `?${qs.join("&")}` : ""}`, { cache: "no-store" })
  if (!r.ok) throw new Error("nav series fetch failed")
  const data = await r.json()
  return data.series || []
}

export async function getMetrics(id: string, series?: number[]): Promise<VaultDetail["metrics"]> {
  if (series && series.length > 1) {
    const qs = series.join(",");
    const r = await fetch(`${BACKEND_URL}/api/v1/metrics/${id}?series=${qs}`, { cache: "no-store" });
    if (!r.ok) throw new Error("metrics fetch failed");
    return await r.json();
  }
  const r = await fetch(`${BACKEND_URL}/api/v1/metrics/${id}`, { cache: "no-store" });
  if (!r.ok) throw new Error("metrics fetch failed");
  return await r.json();
}

export async function getPrices(symbols: string[]): Promise<Record<string, number>> {
  const r = await fetch(`${BACKEND_URL}/api/v1/price?symbols=${symbols.join(",")}`, { cache: "no-store" });
  if (!r.ok) throw new Error("price fetch failed");
  const data = await r.json();
  return data.prices || {};
}

export type EventItem = {
  type: string
  ts?: number
  status?: string
  payload?: any
  error?: string
  symbol?: string
  side?: string
  size?: number
}

export async function getEvents(vault: string, limit = 50): Promise<EventItem[]> {
  const r = await fetch(`${BACKEND_URL}/api/v1/events/${vault}?limit=${limit}`, { cache: "no-store" })
  if (!r.ok) throw new Error("events fetch failed")
  const data = await r.json()
  return data.events || []
}

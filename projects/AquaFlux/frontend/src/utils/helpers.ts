// Types
interface Asset {
  id: string
  name: string
  issuer: string
  maturity: string
  pApy: number
  cApr: number
  sApyRange: number[]
  tvl: number
  vol24h: number
  isNew?: boolean
}

// 类名合并工具
export function cx(...a: (string | boolean | null | undefined)[]): string { 
  return a.filter(Boolean).join(" ") 
}

// 数组平均值
export function avg(arr: number[]): number { 
  if (!Array.isArray(arr) || arr.length === 0) return 0
  if (arr.length === 1) return arr[0]
  return (arr[0] + arr[1]) / 2 
}

// 计算到期天数
export function daysUntil(dateStr: string): number { 
  const d = new Date(dateStr)
  const today = new Date()
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

// 判断是否临近到期
export function isNearMaturity(asset: Asset): boolean { 
  return daysUntil(asset.maturity) <= 90 
}

// 基于 ID 的种子生成器（用于模拟数据）
export function seedFromId(id: string): number { 
  let s = 0
  for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) >>> 0
  return s || 1
}

// 线性同余生成器
export function lcg(seed: number): () => number { 
  let x = seed >>> 0
  const m = 2 ** 32
  return function(): number { 
    x = (1664525 * x + 1013904223) % m
    return x / m
  } 
}

// 生成模拟走势数据
export function sparkSeries(seed: number, n: number): number[] { 
  const rnd = lcg(seed)
  let v = 1
  const out: number[] = []
  for (let i = 0; i < n; i++) { 
    v = v * (1 + (rnd() - 0.5) * 0.06)
    out.push(v)
  } 
  return out
}

// 获取资产的走势数据
export function getSpark(asset: Asset, n: number): number[] { 
  return sparkSeries(seedFromId(asset.id), n)
}
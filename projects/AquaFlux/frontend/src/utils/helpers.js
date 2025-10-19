// 类名合并工具
export function cx(...a) { 
  return a.filter(Boolean).join(" ") 
}

// 数组平均值
export function avg(arr) { 
  return (arr[0] + arr[1]) / 2 
}

// 计算到期天数
export function daysUntil(dateStr) { 
  const d = new Date(dateStr)
  const today = new Date()
  return Math.ceil((d - today) / 86400000)
}

// 判断是否临近到期
export function isNearMaturity(asset) { 
  return daysUntil(asset.maturity) <= 90 
}

// 基于 ID 的种子生成器（用于模拟数据）
export function seedFromId(id) { 
  let s = 0
  for (const ch of id) s = (s * 31 + ch.charCodeAt(0)) >>> 0
  return s || 1
}

// 线性同余生成器
export function lcg(seed) { 
  let x = seed >>> 0
  const m = 2 ** 32
  return function() { 
    x = (1664525 * x + 1013904223) % m
    return x / m
  } 
}

// 生成模拟走势数据
export function sparkSeries(seed, n) { 
  const rnd = lcg(seed)
  let v = 1
  const out = []
  for (let i = 0; i < n; i++) { 
    v = v * (1 + (rnd() - 0.5) * 0.06)
    out.push(v)
  } 
  return out
}

// 获取资产的走势数据
export function getSpark(asset, n) { 
  return sparkSeries(seedFromId(asset.id), n)
}

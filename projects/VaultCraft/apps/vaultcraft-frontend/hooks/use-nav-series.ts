"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getNavSeries, type NavPoint } from "@/lib/api"

export function useNavSeries(vaultId: string, pollMs = 5000, window = 120) {
  const [series, setSeries] = useState<NavPoint[]>([])
  const [loading, setLoading] = useState(false)
  const sinceRef = useRef<number | undefined>(undefined)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Use since to reduce payload where possible
      const pts = await getNavSeries(vaultId, sinceRef.current ? { since: sinceRef.current } : { window })
      if (pts.length > 0) {
        sinceRef.current = pts[pts.length - 1].ts
        setSeries((prev) => {
          const merged = [...prev]
          for (const p of pts) {
            if (!merged.find((q) => q.ts === p.ts)) merged.push(p)
          }
          // keep last N points
          const maxN = Math.max(window, 60)
          return merged.slice(-maxN)
        })
      }
    } catch {}
    finally {
      setLoading(false)
    }
  }, [vaultId, window])

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      try {
        const pts = await getNavSeries(vaultId, { window })
        if (alive) {
          setSeries(pts)
          sinceRef.current = pts.length ? pts[pts.length - 1].ts : undefined
        }
      } finally {
        setLoading(false)
      }
    })()
    const id = setInterval(() => { load() }, pollMs)
    return () => { alive = false; clearInterval(id) }
  }, [vaultId, pollMs, window, load])

  return { series, loading, refresh: load }
}


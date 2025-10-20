"use client"

import { useEffect, useMemo, useState } from "react"
import { getEvents, type EventItem } from "@/lib/api"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts"

type Point = { ts: number; [sym: string]: number }

export function PositionsHistory({ vaultId }: { vaultId: string }) {
  const [events, setEvents] = useState<EventItem[]>([])
  useEffect(() => {
    let alive = true
    getEvents(vaultId, 200).then((ev) => { if (alive) setEvents(ev) }).catch(() => {})
    const id = setInterval(() => { getEvents(vaultId, 200).then(setEvents).catch(() => {}) }, 5000)
    return () => { alive = false; clearInterval(id) }
  }, [vaultId])

  const data: Point[] = useMemo(() => {
    // rebuild exposures over time from fill events
    const exposures: Record<string, number> = {}
    const timeline: Point[] = []
    // Sort by ts ascending
    const fills = events.filter((e) => e.type === 'fill').sort((a, b) => (a.ts||0) - (b.ts||0))
    for (const e of fills) {
      const sym = e.symbol || "?"
      if (!(sym in exposures)) exposures[sym] = 0
      if (e.side === 'close') {
        // reduce toward zero by size
        const cur = exposures[sym]
        const s = Math.abs(Number(e.size || 0))
        exposures[sym] = cur > 0 ? Math.max(0, cur - s) : Math.min(0, cur + s)
      } else if (e.side === 'buy') {
        exposures[sym] += Number(e.size || 0)
      } else if (e.side === 'sell') {
        exposures[sym] -= Number(e.size || 0)
      }
      const p: Point = { ts: Math.floor((e.ts || 0)) }
      for (const k of Object.keys(exposures)) p[k] = exposures[k]
      timeline.push(p)
    }
    return timeline
  }, [events])

  const symbols = useMemo(() => {
    const set = new Set<string>()
    data.forEach((p) => Object.keys(p).forEach((k) => { if (k !== 'ts') set.add(k) }))
    return Array.from(set)
  }, [data])

  if (data.length === 0) {
    return <div className="text-sm text-muted-foreground">No fills yet. Execute a trade to see history.</div>
  }

  return (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, left: 10, right: 10, bottom: 5 }}>
          <XAxis dataKey="ts" tickFormatter={(t) => new Date(t * 1000).toLocaleTimeString()} stroke="#888" tick={{ fill: '#aaa', fontSize: 12 }} />
          <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 12 }} />
          <Tooltip labelFormatter={(t) => new Date(Number(t) * 1000).toLocaleString()} />
          <Legend />
          {symbols.map((s, i) => (
            <Line key={s} type="monotone" dataKey={s} stroke={i % 2 === 0 ? "#60a5fa" : "#22d3ee"} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}


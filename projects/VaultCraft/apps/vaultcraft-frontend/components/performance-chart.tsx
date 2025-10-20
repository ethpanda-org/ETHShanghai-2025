"use client"
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts"

type Point = { date: string; nav: number };

// Mock performance data (deterministic to avoid hydration mismatches)
const mockData: Point[] = Array.from({ length: 90 }, (_, i) => ({
  date: `Day ${i + 1}`,
  nav: Number((1.0 + i * 0.003 + Math.sin(i / 8) * 0.02).toFixed(4)),
}))

export function PerformanceChart({ data }: { data?: Point[] }) {
  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data && data.length > 1 ? data : mockData}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.02 240)" />
          <XAxis dataKey="date" stroke="oklch(0.60 0.01 90)" tick={{ fill: "oklch(0.60 0.01 90)", fontSize: 12 }} />
          <YAxis
            stroke="oklch(0.60 0.01 90)"
            tick={{ fill: "oklch(0.60 0.01 90)", fontSize: 12 }}
            domain={["dataMin - 0.05", "dataMax + 0.05"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "oklch(0.13 0.01 240)",
              border: "1px solid oklch(0.22 0.02 240)",
              borderRadius: "8px",
              color: "oklch(0.95 0.005 90)",
            }}
          />
          <Line type="monotone" dataKey="nav" stroke="oklch(0.60 0.20 195)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

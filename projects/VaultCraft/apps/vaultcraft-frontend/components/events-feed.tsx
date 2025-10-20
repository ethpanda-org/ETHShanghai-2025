"use client"

import { useEffect, useState } from "react"
import { getEvents, type EventItem } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { useLocale } from "@/components/locale-provider"

export function EventsFeed({ vaultId }: { vaultId: string }) {
  const [items, setItems] = useState<EventItem[]>([])
  const [busy, setBusy] = useState(false)
  const [filterExec, setFilterExec] = useState(true)
  const [filterFill, setFilterFill] = useState(true)
  const [filterOther, setFilterOther] = useState(true)
  const [autoScroll, setAutoScroll] = useState(true)
  const { t } = useLocale()

  async function load() {
    setBusy(true)
    try {
      const ev = await getEvents(vaultId, 100)
      setItems(ev)
    } catch (e) {
      // ignore
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    let alive = true
    ;(async () => {
      setBusy(true)
      try {
        const ev = await getEvents(vaultId, 50)
        if (alive) setItems(ev)
      } finally {
        setBusy(false)
      }
    })()
    const id = setInterval(() => {
      getEvents(vaultId, 50).then((ev) => {
        setItems(ev)
        if (autoScroll && typeof window !== 'undefined') {
          try {
            const el = document.getElementById('events-feed-bottom')
            el?.scrollIntoView({ behavior: 'smooth', block: 'end' })
          } catch {}
        }
      }).catch(() => {})
    }, 5000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [vaultId, autoScroll])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{t("vault.events.title", "Recent Events")}</div>
        <Button size="sm" variant="outline" disabled={busy} onClick={load}>
          {t("common.refresh", "Refresh")}
        </Button>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <label className="text-xs flex items-center gap-1">
          <input type="checkbox" checked={filterExec} onChange={(e) => setFilterExec(e.target.checked)} />{" "}
          {t("events.filter.exec", "exec")}
        </label>
        <label className="text-xs flex items-center gap-1">
          <input type="checkbox" checked={filterFill} onChange={(e) => setFilterFill(e.target.checked)} />{" "}
          {t("events.filter.fill", "fill")}
        </label>
        <label className="text-xs flex items-center gap-1">
          <input type="checkbox" checked={filterOther} onChange={(e) => setFilterOther(e.target.checked)} />{" "}
          {t("events.filter.other", "other")}
        </label>
        <label className="text-xs flex items-center gap-1 ml-auto">
          <input type="checkbox" checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} />{" "}
          {t("events.autoscroll", "auto-scroll")}
        </label>
      </div>
      <div className="space-y-2 max-h-64 overflow-auto pr-1">
        {items.length === 0 && (
          <div className="text-sm text-muted-foreground">
            {t(
              "events.empty",
              "No events yet — on Hyper testnet trades may wait for counterparties; check Listener status for last fill time."
            )}
          </div>
        )}
        {items
          .filter((e) => {
            if (e.type?.startsWith("exec")) return filterExec
            if (e.type === "fill") return filterFill
            return filterOther
          })
          .map((e, i) => (
            <div key={i} className="text-xs border border-border/40 rounded p-2 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-full ${
                      e.type?.startsWith("exec")
                        ? "bg-blue-500/10 text-blue-300"
                        : e.type === "fill"
                        ? "bg-green-500/10 text-green-300"
                        : "bg-zinc-500/10 text-zinc-300"
                    }`}
                  >
                    {e.type}
                  </span>
                  {e.status && (
                    <span
                      className={`px-2 py-0.5 rounded-full ${
                        e.status === "ack"
                          ? "bg-green-500/10 text-green-300"
                          : e.status === "dry_run"
                          ? "bg-yellow-500/10 text-yellow-300"
                          : e.status === "rejected"
                          ? "bg-red-500/10 text-red-300"
                          : "bg-zinc-500/10 text-zinc-300"
                      }`}
                    >
                      {e.status}
                    </span>
                  )}
                  {e.type === "fill" && e["source"] && (
                    <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300">{String(e["source"])}</span>
                  )}
                </div>
                {e.symbol && (
                  <div className="text-muted-foreground mt-1">
                    {e.symbol} {e.side} {e.size ?? ""}
                  </div>
                )}
                {typeof e.attempts === "number" && (
                  <div className="text-muted-foreground mt-1">
                    {t("events.attempts", "attempts")}: {e.attempts}
                  </div>
                )}
                {e.error && <div className="text-destructive mt-1">{e.error}</div>}
              </div>
              <div className="text-muted-foreground">{e.ts ? new Date(e.ts * 1000).toLocaleTimeString() : ""}</div>
            </div>
          ))}
        <div id="events-feed-bottom" />
      </div>
    </div>
  )
}

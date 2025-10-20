"use client"

import { useEffect, useState } from "react"
import { BACKEND_URL } from "@/lib/config"
import { useLocale } from "@/components/locale-provider"

type Flags = {
  enable_sdk: boolean
  enable_live_exec: boolean
  enable_user_ws: boolean
  enable_snapshot_daemon: boolean
  address?: string | null
  allowed_symbols?: string
  exec_min_leverage?: number
  exec_max_leverage?: number
  exec_min_notional_usd?: number
  exec_max_notional_usd?: number
}

type Net = { rpc?: string | null; chainId?: number | null; block?: number | null }

export function StatusBar() {
  const [flags, setFlags] = useState<Flags | null>(null)
  const [net, setNet] = useState<Net | null>(null)
  const [runtime, setRuntime] = useState<{ listener?: string; snapshot?: string; listenerLastTs?: number | null } | null>(null)
  const { t } = useLocale()

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const r = await fetch(`${BACKEND_URL}/api/v1/status`, { cache: "no-store" })
        if (!r.ok) return
        const b = await r.json()
        if (!alive) return
        setFlags(b.flags)
        setNet(b.network)
        setRuntime(b.state || null)
      } catch {}
    }
    load()
    const id = setInterval(load, 10000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (!flags) return null
  const mode = flags.enable_live_exec ? t("status.mode.live", "Live") : t("status.mode.dryrun", "Dry-run")
  const modeColor = flags.enable_live_exec ? "text-green-400" : "text-yellow-400"
  const lastTs = runtime?.listenerLastTs
  const ageSec = lastTs ? Math.max(0, Math.round(Date.now() / 1000 - lastTs)) : null
  const listenerState = (() => {
    if (!flags.enable_user_ws) return { text: t("status.listener.off", "off"), className: "text-muted-foreground" }
    const base = runtime?.listener ?? "idle"
    if (!lastTs) return { text: base, className: base === "running" ? "text-green-400" : "text-yellow-400" }
    if (ageSec != null && ageSec > 300) {
      return {
        text: `${base} · ${t("status.listener.noFill", "no fill")} ${Math.floor(ageSec / 60)}m`,
        className: "text-yellow-400",
      }
    }
    if (ageSec != null && ageSec > 60) {
      return {
        text: `${base} · ${t("status.listener.last", "last")} ${Math.floor(ageSec / 60)}m`,
        className: base === "running" ? "text-green-300" : "text-yellow-300",
      }
    }
    return {
      text: base === "running" ? t("status.listener.recent", "running · recent fill") : base,
      className: base === "running" ? "text-green-400" : "text-yellow-400",
    }
  })()
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-4 px-4 py-2 border-b border-border/40">
      <div>
        {t("status.mode.label", "Mode")}: <span className={`${modeColor} font-mono`}>{mode}</span>
      </div>
      <div>
        SDK:{" "}
        <span className={flags.enable_sdk ? "text-green-400" : "text-yellow-400"}>
          {flags.enable_sdk ? t("status.enabled", "on") : t("status.disabled", "off")}
        </span>
      </div>
      <div>
        {t("status.listener.title", "Listener")}: <span className={listenerState.className}>{listenerState.text}</span>
      </div>
      {flags.allowed_symbols && (
        <div>
          {t("status.symbols", "Symbols")}: <span className="font-mono">{flags.allowed_symbols}</span>
        </div>
      )}
      {(flags.exec_min_leverage != null && flags.exec_max_leverage != null) && (
        <div>
          {t("status.leverage", "Lev")}:{" "}
          <span className="font-mono">
            {flags.exec_min_leverage}–{flags.exec_max_leverage}x
          </span>
        </div>
      )}
      {(flags.exec_min_notional_usd != null) && (
        <div>
          {t("status.minNotional", "Min")} ${flags.exec_min_notional_usd}
        </div>
      )}
      {flags.enable_snapshot_daemon && (
        <div>
          {t("status.snapshot.title", "Snapshot")}:{" "}
          <span className={runtime?.snapshot === "running" ? "text-green-400" : "text-yellow-400"}>
            {runtime?.snapshot || t("status.snapshot.idle", "idle")}
          </span>
        </div>
      )}
      {net && (
        <div className="ml-auto">
          {t("status.chain", "RPC")}: <span className="font-mono">{net.chainId ?? "?"}</span> ·{" "}
          {t("status.block", "Block")}: <span className="font-mono">{net.block ?? "?"}</span>
        </div>
      )}
    </div>
  )
}

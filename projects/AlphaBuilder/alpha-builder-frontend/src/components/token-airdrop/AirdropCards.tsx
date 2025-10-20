import { useEffect, useState } from "react";
import {
  CalendarDays,
  Gift,
  Coins,
  AlertCircle,
  CheckCircle2,
  Hash,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";
import type { AirdropItem } from "@/hooks/useAirdropFeed";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AirdropCardsProps {
  items: AirdropItem[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
}

type AirdropStatus = "announced" | "ongoing" | "completed";

const STATUS_META: Record<
  AirdropStatus,
  { label: string; badge: string; dot: string }
> = {
  announced: {
    label: "已公布",
    badge: "bg-sky-100/70 text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  ongoing: {
    label: "进行中",
    badge: "bg-emerald-100/70 text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "已完成",
    badge: "bg-slate-200/80 text-slate-700 ring-slate-300",
    dot: "bg-slate-500",
  },
};

function resolveStatus(status?: string | null): AirdropStatus {
  const normalized = (status ?? "").toLowerCase();
  if (normalized.includes("ongoing") || normalized.includes("live")) {
    return "ongoing";
  }
  if (
    normalized.includes("complete") ||
    normalized.includes("finished") ||
    normalized.includes("ended")
  ) {
    return "completed";
  }
  return "announced";
}

function formatValue(value?: string | number | boolean | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }
  if (typeof value === "boolean") {
    return value ? "是" : "否";
  }
  return value;
}

const SKELETON_ITEMS = Array.from({ length: 3 });

function CopyAddressButton({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = window.setTimeout(() => setCopied(false), 1800);
    return () => {
      window.clearTimeout(timer);
    };
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
    } catch (error) {
      console.error("无法复制合约地址", error);
      setCopied(false);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={cn(
        "gap-2 rounded-full border-border/70 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all",
        "hover:border-primary/70 hover:text-primary focus-visible:ring-primary/30"
      )}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-500" />
      ) : (
        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      {copied ? "已复制" : "复制地址"}
    </Button>
  );
}

export function AirdropCards({
  items,
  loading = false,
  error = null,
  onRetry,
  title = "最新空投活动",
}: AirdropCardsProps) {
  const summary = items.reduce(
    (acc, item) => {
      const status = resolveStatus(item.status);
      acc[status] += 1;
      return acc;
    },
    { announced: 0, ongoing: 0, completed: 0 }
  );

  const showEmpty = !loading && !error && items.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="border-b border-border/70 bg-gradient-to-r from-secondary/10 via-secondary/5 to-transparent px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {title}
            </h2>
            <p className="text-sm text-muted-foreground">
              紧跟热门空投节奏，掌握发放时间、奖励和合约地址，快速参与。
            </p>
          </div>

          <div className="flex items-center gap-4">
            {onRetry && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRetry}
                disabled={loading}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              >
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-xs font-medium">
            {([
              { key: "ongoing", label: "进行中", tone: "text-emerald-600" },
              { key: "announced", label: "已公布", tone: "text-sky-600" },
              { key: "completed", label: "已完成", tone: "text-slate-600" },
            ] as const).map((itemMeta) => (
              <div
                key={itemMeta.key}
                className="rounded-xl border border-border/60 bg-background/60 px-4 py-2"
              >
                <p className="mb-1 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
                  {itemMeta.label}
                </p>
                {loading && items.length === 0 ? (
                  <span className="mx-auto block h-4 w-10 animate-pulse rounded-full bg-muted/80" />
                ) : (
                  <p className={cn("text-base font-semibold", itemMeta.tone)}>
                    {summary[itemMeta.key]}
                  </p>
                )}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="px-6 py-12 text-center">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-500">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">空投数据加载失败</h3>
            <p className="text-sm text-muted-foreground">
              {error.message || "请稍后重试，或检查网络连接。"}
            </p>
            {onRetry && (
              <Button onClick={onRetry} variant="secondary">
                重试
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          {loading && items.length === 0 ? (
            <div className="grid gap-4 pt-6 md:grid-cols-2">
              {SKELETON_ITEMS.map((_, index) => (
                <div
                  key={index}
                  className="animate-pulse rounded-2xl border border-border bg-muted/40 p-6"
                >
                  <div className="mb-6 h-4 w-32 rounded bg-muted/80" />
                  <div className="mb-3 h-4 w-48 rounded bg-muted/70" />
                  <div className="mb-6 h-3 w-40 rounded bg-muted/70" />
                  <div className="grid gap-3">
                    <div className="h-3 w-full rounded bg-muted/60" />
                    <div className="h-3 w-[70%] rounded bg-muted/60" />
                    <div className="h-3 w-[80%] rounded bg-muted/60" />
                  </div>
                </div>
              ))}
            </div>
          ) : showEmpty ? (
            <div className="py-12 text-center">
              <h3 className="text-lg font-semibold text-foreground">
                暂无空投信息
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                当前没有发现新的空投活动，稍后再来看看吧。
              </p>
            </div>
          ) : (
            <div className="grid gap-4 pt-6 md:grid-cols-2 xl:grid-cols-3">
              {items.map((airdrop) => {
                const statusKey = resolveStatus(airdrop.status);
                const meta = STATUS_META[statusKey];
                const dateDisplay = [airdrop.date, airdrop.time]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <article
                    key={`${airdrop.token}-${airdrop.system_timestamp ?? airdrop.updated_timestamp ?? airdrop.date}`}
                    className="flex h-full flex-col rounded-2xl border border-border bg-background/80 p-6 transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex h-2.5 w-2.5 rounded-full",
                              meta.dot
                            )}
                          >
                            <span className="sr-only">{meta.label}</span>
                          </span>
                          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            {airdrop.token}
                          </p>
                        </div>
                        <h3 className="mt-2 text-lg font-semibold text-foreground">
                          {airdrop.name || airdrop.token}
                        </h3>
                      </div>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
                          meta.badge
                        )}
                      >
                        {statusKey === "completed" ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Gift className="h-3.5 w-3.5" />
                        )}
                        {meta.label}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground">
                      {airdrop.type ? `${airdrop.type} 空投 · 第 ${airdrop.phase ?? "-"} 阶段` : "空投活动"}
                    </p>

                    <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-primary/70" />
                        <span>{dateDisplay || "时间待定"}</span>
                      </div>

                      {airdrop.points ? (
                        <div className="flex items-center gap-2">
                          <Coins className="h-4 w-4 text-amber-500" />
                          <span>积分：{formatValue(airdrop.points)}</span>
                        </div>
                      ) : null}

                      {airdrop.amount ? (
                        <div className="flex items-center gap-2">
                          <Gift className="h-4 w-4 text-emerald-500" />
                          <span>奖励：{airdrop.amount}</span>
                        </div>
                      ) : null}

                      {/* {airdrop.language ? (
                        <div className="flex items-center gap-2">
                          <Languages className="h-4 w-4 text-blue-500" />
                          <span>语言：{airdrop.language}</span>
                        </div>
                      ) : null} */}

                      {airdrop.contract_address ? (
                        <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-muted-foreground/90">
                              <Hash className="h-4 w-4" />
                            </div>
                            <div className="flex flex-1 flex-col gap-2">
                              <div className="flex flex-col gap-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/70">
                                  合约地址
                                </span>
                                <span className="font-mono text-sm font-medium text-foreground/90 break-all">
                                  {airdrop.contract_address}
                                </span>
                              </div>
                              <CopyAddressButton address={airdrop.contract_address} />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {/* {airdrop.chain_id ? (
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-muted-foreground/80" />
                          <span>链：{airdrop.chain_id}</span>
                        </div>
                      ) : null} */}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

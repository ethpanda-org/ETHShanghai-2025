import { useMemo } from "react";
import { RefreshCw, ChevronDown, ChevronUp, Coins, DollarSign, Calendar, Clock, Star, TrendingUp, Package } from "lucide-react";
import type { AirdropHistoryItem } from "@/hooks/useAirdropHistory";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface AirdropHistoryTableProps {
  items: AirdropHistoryItem[];
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  title?: string;
}

const HEADERS = [
  { key: "token", label: "代币", icon: Coins },
  { key: "name", label: "项目", icon: TrendingUp },
  { key: "date", label: "日期", icon: Calendar },
  { key: "time", label: "时间", icon: Clock },
  { key: "points", label: "积分", icon: Star },
  { key: "amount", label: "数量", icon: Package },
  { key: "market_cap", label: "市值(USDT)", icon: DollarSign },
];


function formatNumber(value: number | string | undefined | null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return "-";
    }
    return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return "-";
  }
  const sanitized = trimmed.replace(/,/g, "");
  if (!/^[-+]?\d+(\.\d+)?$/.test(sanitized)) {
    return value;
  }
  const parsed = Number(sanitized);
  if (!Number.isFinite(parsed)) {
    return value;
  }
  return parsed.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function AirdropHistoryTable({
  items,
  loading = false,
  error = null,
  onRetry,
  title = "历史空投记录",
}: AirdropHistoryTableProps) {
  const empty = !loading && !error && items.length === 0;


  const content = useMemo(() => {
    if (loading) {
      return (
        <tbody>
          {Array.from({ length: 5 }).map((_, rowIdx) => {
            const isLastRow = rowIdx === 4;
            return (
              <tr
                key={rowIdx}
                className={cn(
                  "border-b border-border/70",
                  rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"
                )}
              >
                {HEADERS.map((header, colIdx) => (
                  <td
                    key={header.key}
                    className={cn(
                      "px-4 py-4",
                      rowIdx === 0 && "pt-4",
                      isLastRow && "pb-4",
                      colIdx === 0 && "pl-6",
                      colIdx === HEADERS.length - 1 && "pr-6"
                    )}
                  >
                    <div className="h-4 w-20 animate-pulse rounded bg-muted/80" />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      );
    }

    if (error) {
      return (
        <tbody>
          <tr>
            <td colSpan={HEADERS.length} className="px-6 py-14 text-center">
              <div className="flex flex-col items-center gap-4">
                <p className="text-sm text-destructive">
                  历史数据加载失败：{error.message}
                </p>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="rounded-full border border-destructive/30 px-4 py-1.5 text-xs font-semibold text-destructive transition hover:bg-destructive/10"
                  >
                    重试
                  </button>
                )}
              </div>
            </td>
          </tr>
        </tbody>
      );
    }

    if (empty) {
      return (
        <tbody>
          <tr>
            <td colSpan={HEADERS.length} className="px-6 py-14 text-center">
              <p className="text-sm text-muted-foreground">
                暂无历史记录
              </p>
            </td>
          </tr>
        </tbody>
      );
    }

    return (
      <tbody>
        {items.map((item, index) => {
          const isLastRow = index === items.length - 1;
          return (
            <tr
              key={`${item.token}-${item.system_timestamp ?? item.date}`}
              className={cn(
                "border-b border-border/80 transition-colors",
                index % 2 === 0 ? "bg-background" : "bg-muted/30",
                "hover:bg-muted/60"
              )}
            >
              <td className={cn(
                "px-4 py-4 text-sm font-semibold tracking-wide text-foreground text-center",
                index === 0 && "pt-4",
                isLastRow && "pb-4",
                "pl-6"
              )}>
                <span className="inline-flex min-w-[3.5rem] items-center gap-2">
                  <span className="font-medium text-muted-foreground/70">#</span>
                  {item.token}
                </span>
              </td>
              <td className={cn(
                "px-4 py-4 text-sm text-foreground/80 text-center",
                index === 0 && "pt-4",
                isLastRow && "pb-4"
              )}>{item.name ?? "-"}</td>
              <td className={cn(
                "px-4 py-4 text-sm text-center",
                index === 0 && "pt-4",
                isLastRow && "pb-4"
              )}>{item.date ?? "-"}</td>
              <td className={cn(
                "px-4 py-4 text-sm text-muted-foreground/80 text-center",
                index === 0 && "pt-4",
                isLastRow && "pb-4"
              )}>{item.time ?? "-"}</td>
              <td className={cn(
                "px-4 py-4 text-sm font-semibold text-primary text-center",
                index === 0 && "pt-4",
                isLastRow && "pb-4"
              )}>
                {formatNumber(item.points)}
              </td>
              <td className={cn(
                "px-4 py-4 text-sm text-foreground/80 text-center",
                index === 0 && "pt-4",
                isLastRow && "pb-4"
              )}>
                {formatNumber(item.amount)}
              </td>
              <td className={cn(
                "px-4 py-4 pr-6 text-center",
                index === 0 && "pt-4",
                isLastRow && "pb-4"
              )}>{formatNumber(item.market_cap)}</td>
            </tr>
          );
        })}
      </tbody>
    );
  }, [items, loading, error, onRetry, empty]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card text-card-foreground">
      <div className="border-b border-border/70 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h2>
            <p className="text-sm text-muted-foreground">
              回顾历史空投表现，快速筛选积分、阶段与市值数据。
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
            <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
              <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background/80 px-3 py-1 shadow-sm backdrop-blur-sm">
                总计
                <span className="text-foreground/80">{items.length}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="history-table" className="border-none">
          <AccordionTrigger className="group relative flex items-center justify-center gap-2 text-base font-semibold text-foreground bg-muted/20 rounded-lg mx-6 my-4 px-4 py-3 hover:bg-muted/30 transition [&>svg]:hidden">
            <div className="flex items-center gap-2">
              <span>历史数据表格</span>
              <ChevronUp className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=closed]:hidden" />
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:hidden" />
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-0 pb-4">
            <div className="overflow-x-auto">
              <table className="min-w-full border-separate border-spacing-0 text-sm">
                <thead className="bg-transparent">
                  <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                    {HEADERS.map((header, index) => (
                      <th
                        key={header.key}
                        scope="col"
                        className={cn(
                          "bg-transparent px-4 py-3 text-sm font-bold text-foreground tracking-wide uppercase",
                          "text-center",
                          index === 0 && "rounded-tl-2xl pl-6",
                          index === HEADERS.length - 1 && "rounded-tr-2xl pr-6"
                        )}
                      >
                        <div className="flex items-center gap-1.5 justify-center">
                          {header.icon && <header.icon className="h-4 w-4 text-muted-foreground" />}
                          <span>{header.label}</span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                {content}
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

import { tool } from "ai";
import { z } from "zod";

// 简单无状态K线工具：默认从 public API 获取分钟级K线（近若干点）
// 这里用 Binance 公共API 示例（无需密钥）。
// 注意：在某些网络环境下可能需要代理或更换API源。

const Intervals = z.enum([
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
]);

function normalizeSymbol(input: string): string {
  const s = (input || "").toUpperCase().replace(/[^A-Z0-9/:-]/g, "");
  // Common patterns: BTC, BTC/USDT, BTC-USDT, BINANCE:BTCUSDT
  const afterColon = s.includes(":") ? s.split(":").pop()! : s;
  const parts = afterColon.split(/[\/-]/g).filter(Boolean);
  if (parts.length === 2) {
    return `${parts[0]}${parts[1]}`;
  }
  const hasQuote = /(USDT|USDC|BUSD|USD)$/.test(afterColon);
  if (!hasQuote) return `${afterColon}USDT`;
  return afterColon;
}

export const getCryptoKline = tool({
  description:
    "规范化用户输入的加密货币交易对并返回绘图所需的最小参数（无状态）",
  inputSchema: z.object({
    symbol: z
      .string()
      .min(2)
      .describe("币种或交易对，例如 BTC、BTCUSDT、BTC/USDT"),
    interval: Intervals.default("1m"),
    exchange: z
      .enum(["BINANCE", "OKX", "BYBIT", "COINBASE"])
      .default("BINANCE"),
  }),
  async execute({ symbol, interval, exchange }) {
    const normalized = normalizeSymbol(symbol);
    // 不再访问外部API，直接返回给前端使用 TradingView 组件渲染
    return { symbol: normalized, interval, exchange } as const;
  },
});

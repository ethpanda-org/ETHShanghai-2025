"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
} from "react";
import { useWindowSize } from "usehooks-ts";
import { useArtifact } from "@/hooks/use-artifact";
import { ArtifactCloseButton } from "./artifact-close-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { TradingViewChart } from "./tradingview-chart";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { textArtifact } from "@/artifacts/text/client";
import { codeArtifact } from "@/artifacts/code/client";
import { imageArtifact } from "@/artifacts/image/client";
import { sheetArtifact } from "@/artifacts/sheet/client";
import { ArrowLeftRight } from "lucide-react";
import { useSwap } from "@/hooks/use-swap";

export const artifactDefinitions = [
  textArtifact,
  codeArtifact,
  imageArtifact,
  sheetArtifact,
];
export type ArtifactKind = (typeof artifactDefinitions)[number]["kind"];

export interface UIArtifact {
  title: string;
  documentId: string;
  kind: ArtifactKind;
  content: string;
  isVisible: boolean;
  status: "streaming" | "idle";
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
}

export type TokenInfo = {
  address: string;
  symbol: string;
  name: string;
};

type SwapTokenOption = {
  address: string;
  symbol: string;
  name: string;
  description?: string;
};

type UnknownRecord = Record<string, unknown>;

const DEFAULT_CHART_INTERVAL = "1h";

type AllowanceHolderPriceResponse = {
  price?: string;
  grossPrice?: string;
  buyAmount?: string;
  sellAmount?: string;
  minBuyAmount?: string;
  fees?: {
    zeroExFee?: {
      amount?: string | null;
      token?: string | null;
    } | null;
    gasFee?: {
      amount?: string | null;
      token?: string | null;
    } | null;
    integratorFee?: {
      amount?: string | null;
      token?: string | null;
    } | null;
  } | null;
  totalNetworkFee?: string;
  issues?: {
    balance?: {
      token?: string | null;
      actual?: string | null;
      expected?: string | null;
    } | null;
  } | null;
};

const FALLBACK_TOKEN_OPTIONS: SwapTokenOption[] = [
  {
    address: "0xc02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    symbol: "ETH",
    name: "Ethereum",
    description: "Wrapped Ether (WETH)",
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    symbol: "USDT",
    name: "Tether USD",
    description: "USD stablecoin",
  },
  {
    address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    symbol: "USDC",
    name: "USD Coin",
    description: "Circle stablecoin",
  },
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    symbol: "WBTC",
    name: "Wrapped BTC",
    description: "Bitcoin on Ethereum",
  },
];

const DEFAULT_PRICE_MAP: Record<string, number> = {
  ETH: 3200,
  USDT: 1,
  USDC: 1,
  WBTC: 68000,
};

const DEFAULT_FROM_SYMBOL = "ETH";
const DEFAULT_TO_SYMBOL = "USDT";
const DEFAULT_PRICE_FALLBACK = 1;
const DEFAULT_CHAIN_ID = 1;

const TOKEN_DECIMALS: Record<string, number> = {
  ETH: 18,
  WETH: 18,
  USDT: 6,
  USDC: 6,
  DAI: 18,
  WBTC: 8,
  BTC: 8,
  SOL: 9,
};

function getTokenDecimals(symbol: string): number {
  const normalized = normalizeTokenSymbol(symbol);
  return TOKEN_DECIMALS[normalized] ?? 18;
}

const PLACEHOLDER_ADDRESSES = new Set([
  "0x0000000000000000000000000000000000000000",
  "0x0000000000000000000000000000000000000001",
]);

function getTokenIdentifier(option: SwapTokenOption): string {
  const address = option.address?.trim();
  if (
    address &&
    /^0x[a-fA-F0-9]{40}$/i.test(address) &&
    !PLACEHOLDER_ADDRESSES.has(address.toLowerCase())
  ) {
    return address;
  }
  return option.symbol;
}

function toBaseUnitAmount(amount: string, decimals: number): string {
  const sanitized = amount.replace(/,/g, "").trim();
  if (sanitized === "") {
    return "0";
  }

  const [rawInteger, rawFraction = ""] = sanitized.split(".");
  const integerPart = rawInteger.replace(/\D/g, "") || "0";
  let fractionPart = rawFraction.replace(/\D/g, "");

  if (decimals === 0) {
    return BigInt(integerPart).toString();
  }

  if (fractionPart.length > decimals) {
    fractionPart = fractionPart.slice(0, decimals);
  }

  const paddedFraction = fractionPart.padEnd(decimals, "0");

  const baseUnitValue =
    BigInt(integerPart) * 10n ** BigInt(decimals) +
    (paddedFraction ? BigInt(paddedFraction) : 0n);

  return baseUnitValue.toString();
}

function baseUnitToDecimal(raw: string | null | undefined, decimals: number) {
  if (typeof raw !== "string") return null;
  try {
    const value = BigInt(raw);
    const scale = 10n ** BigInt(Math.max(decimals, 0));
    const integer = value / scale;
    const remainder = value % scale;
    const decimal =
      Number(integer) + Number(remainder) / Number(scale > 0n ? scale : 1n);
    return Number.isFinite(decimal) ? decimal : null;
  } catch (_) {
    return null;
  }
}

function resolveTokenMeta(
  address: string | null | undefined,
  fromToken: SwapTokenOption,
  toToken: SwapTokenOption
) {
  if (typeof address !== "string") return null;
  const normalized = address.toLowerCase();
  if (fromToken.address?.toLowerCase() === normalized) {
    return {
      symbol: fromToken.symbol,
      decimals: getTokenDecimals(fromToken.symbol),
    };
  }
  if (toToken.address?.toLowerCase() === normalized) {
    return {
      symbol: toToken.symbol,
      decimals: getTokenDecimals(toToken.symbol),
    };
  }

  const fallback = FALLBACK_TOKEN_OPTIONS.find(
    (option) => option.address?.toLowerCase() === normalized
  );
  if (fallback) {
    return {
      symbol: fallback.symbol,
      decimals: getTokenDecimals(fallback.symbol),
    };
  }
  return null;
}

function deriveConversionRate(
  payload: AllowanceHolderPriceResponse,
  sellDecimals: number,
  buyDecimals: number,
  fallbackSellAmount: string
) {
  const priceValue = Number(
    typeof payload.grossPrice === "string"
      ? payload.grossPrice
      : typeof payload.price === "string"
      ? payload.price
      : NaN
  );
  if (Number.isFinite(priceValue) && priceValue > 0) {
    return priceValue;
  }

  const rawBuyAmount = payload.buyAmount;
  const rawSellAmount = payload.sellAmount ?? fallbackSellAmount;
  if (!rawBuyAmount || !rawSellAmount) {
    return 0;
  }

  const buy = baseUnitToDecimal(rawBuyAmount, buyDecimals);
  const sell = baseUnitToDecimal(rawSellAmount, sellDecimals);
  if (buy === null || sell === null || sell <= 0) {
    return 0;
  }
  return buy / sell;
}

function normalizePairSymbol(symbol?: string | null) {
  if (!symbol) return "BTCUSDT";
  const value = symbol.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
  return value || "BTCUSDT";
}

function normalizeTokenSymbol(symbol?: string | null) {
  if (!symbol) return "";
  return symbol.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

function truncateAddress(address?: string | null) {
  if (!address) return "";
  if (address.length <= 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const TRADINGVIEW_INTERVAL_MAP = new Map<string, string>([
  ["1m", "1"],
  ["3m", "3"],
  ["5m", "5"],
  ["15m", "15"],
  ["30m", "30"],
  ["45m", "45"],
  ["1h", "60"],
  ["2h", "120"],
  ["4h", "240"],
  ["6h", "360"],
  ["8h", "480"],
  ["12h", "720"],
  ["1d", "D"],
  ["3d", "3D"],
  ["1w", "W"],
  ["1M", "M"],
]);

function mapIntervalToTradingView(interval?: string | null) {
  if (!interval) {
    return TRADINGVIEW_INTERVAL_MAP.get(DEFAULT_CHART_INTERVAL) ?? "60";
  }

  if (TRADINGVIEW_INTERVAL_MAP.has(interval)) {
    return TRADINGVIEW_INTERVAL_MAP.get(interval) as string;
  }

  const normalized = interval.toLowerCase();
  if (TRADINGVIEW_INTERVAL_MAP.has(normalized)) {
    return TRADINGVIEW_INTERVAL_MAP.get(normalized) as string;
  }

  if (/^\d+$/.test(interval)) {
    return interval;
  }

  return TRADINGVIEW_INTERVAL_MAP.get(DEFAULT_CHART_INTERVAL) ?? "60";
}

type ChartConfig = {
  symbol: string;
  exchange: string;
  displayInterval: string;
  tvInterval: string;
};

function buildChartConfig(
  baseToken: TokenInfo,
  quoteToken: TokenInfo
): ChartConfig {
  const base = normalizeTokenSymbol(baseToken.symbol) || "BTC";
  const quote = normalizeTokenSymbol(quoteToken.symbol) || "USDT";

  return {
    symbol: `${base}${quote}`,
    exchange: "BINANCE",
    displayInterval: DEFAULT_CHART_INTERVAL.toUpperCase(),
    tvInterval: mapIntervalToTradingView(DEFAULT_CHART_INTERVAL),
  };
}

function normalizeTokenOption(
  option?: TokenInfo | SwapTokenOption | null
): SwapTokenOption | null {
  if (!option) return null;
  const symbol = normalizeTokenSymbol(
    (option as TokenInfo).symbol ?? (option as SwapTokenOption).symbol
  );
  if (!symbol) return null;
  const name =
    (option as TokenInfo).name ?? (option as SwapTokenOption).name ?? symbol;
  const address =
    (option as TokenInfo).address ?? (option as SwapTokenOption).address ?? "";
  return {
    symbol,
    name,
    address,
    description:
      (option as SwapTokenOption).description ?? truncateAddress(address),
  };
}

function buildTokenOptions(
  baseToken: TokenInfo,
  quoteToken: TokenInfo
): SwapTokenOption[] {
  const candidates: Array<SwapTokenOption | null> = [
    normalizeTokenOption(baseToken),
    normalizeTokenOption(quoteToken),
    ...FALLBACK_TOKEN_OPTIONS,
  ];

  const seen = new Set<string>();
  return candidates
    .filter((option): option is SwapTokenOption => Boolean(option))
    .filter((option) => {
      if (seen.has(option.symbol)) return false;
      seen.add(option.symbol);
      return true;
    });
}

function buildPriceMap(options: SwapTokenOption[]): Record<string, number> {
  const map: Record<string, number> = { ...DEFAULT_PRICE_MAP };
  options.forEach((option) => {
    if (!(option.symbol in map)) {
      map[option.symbol] = DEFAULT_PRICE_FALLBACK;
    }
  });
  return map;
}

function sanitizeToken(
  token: unknown,
  fallback: string,
  options: SwapTokenOption[]
): string {
  if (typeof token === "string") {
    const normalized = normalizeTokenSymbol(token);
    if (options.some((option) => option.symbol === normalized)) {
      return normalized;
    }
  }
  return fallback;
}

function deriveTokensFromSymbol(
  symbol: string,
  options: SwapTokenOption[]
): {
  base?: string;
  quote?: string;
} {
  const normalized = normalizePairSymbol(symbol);
  const symbols = options.map((option) => option.symbol);
  const quote = symbols.find((token) => normalized.endsWith(token));
  if (!quote) return {};
  const baseCandidate = normalized.slice(0, normalized.length - quote.length);
  const base = symbols.find((token) => token === baseCandidate);
  return { base, quote };
}

type SwapFormDefaults = {
  fromToken?: string;
  toToken?: string;
  fromAmount?: string;
  slippage?: string;
};

function deriveSwapDefaults(
  metadata: unknown,
  symbol: string,
  options: SwapTokenOption[]
): SwapFormDefaults {
  const tokensFromSymbol = deriveTokensFromSymbol(symbol, options);
  const fallbackFrom =
    tokensFromSymbol.base ?? options[0]?.symbol ?? DEFAULT_FROM_SYMBOL;
  const fallbackTo =
    tokensFromSymbol.quote && tokensFromSymbol.quote !== fallbackFrom
      ? tokensFromSymbol.quote
      : options.find((option) => option.symbol !== fallbackFrom)?.symbol ??
        DEFAULT_TO_SYMBOL;

  if (typeof metadata !== "object" || metadata === null) {
    return {
      fromToken: fallbackFrom,
      toToken: fallbackTo,
    };
  }

  const record = metadata as UnknownRecord;
  const rawSwapDefaults =
    typeof record.swapDefaults === "object" && record.swapDefaults !== null
      ? (record.swapDefaults as UnknownRecord)
      : null;

  const fromToken = sanitizeToken(
    rawSwapDefaults?.fromToken,
    fallbackFrom,
    options
  );
  let toToken = sanitizeToken(rawSwapDefaults?.toToken, fallbackTo, options);

  if (toToken === fromToken) {
    toToken =
      options.find((option) => option.symbol !== fromToken)?.symbol ??
      fallbackTo;
  }

  const fromAmount =
    typeof rawSwapDefaults?.fromAmount === "string" &&
    rawSwapDefaults.fromAmount.trim() !== "" &&
    Number(rawSwapDefaults.fromAmount) > 0
      ? rawSwapDefaults.fromAmount
      : undefined;

  const slippage =
    typeof rawSwapDefaults?.slippage === "string" &&
    rawSwapDefaults.slippage.trim() !== "" &&
    Number(rawSwapDefaults.slippage) >= 0 &&
    Number(rawSwapDefaults.slippage) <= 100
      ? rawSwapDefaults.slippage
      : undefined;

  return {
    fromToken,
    toToken,
    fromAmount,
    slippage,
  };
}

function formatNumeric(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  const maximumFractionDigits = value < 1 ? 6 : 4;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
}

function findAlternativeSymbol(
  current: string,
  options: SwapTokenOption[],
  fallback: string
) {
  return (
    options.find((option) => option.symbol !== current)?.symbol ?? fallback
  );
}

function SwapForm({
  defaults,
  priceMap,
  fromTokenOption,
  toTokenOption,
  chainId,
  takerAddress,
  onFlip,
}: {
  defaults?: SwapFormDefaults;
  priceMap: Record<string, number>;
  fromTokenOption: SwapTokenOption;
  toTokenOption: SwapTokenOption;
  chainId: number;
  takerAddress?: string;
  onFlip?: () => void;
}) {
  const amountId = useId();
  const slippageId = useId();
  const { swap } = useSwap({
    chainId: 8453,
    sellToken: "0x4200000000000000000000000000000000000006", // WETH
    buyToken: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
    decimals: 18,
  });

  const fromToken = fromTokenOption.symbol;
  const toToken = toTokenOption.symbol;
  const [fromAmount, setFromAmount] = useState<string>(
    typeof defaults?.fromAmount === "string" && Number(defaults.fromAmount) > 0
      ? defaults.fromAmount
      : "0.0001"
  );
  const [slippage, setSlippage] = useState<string>(
    typeof defaults?.slippage === "string" &&
      Number(defaults.slippage) >= 0 &&
      Number(defaults.slippage) <= 100
      ? defaults.slippage
      : "0.5"
  );
  const [status, setStatus] = useState<"idle" | "pending" | "success">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [priceQuote, setPriceQuote] = useState<number | null>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState<boolean>(false);
  const [priceError, setPriceError] = useState<string | null>(null);
  const [priceDetails, setPriceDetails] =
    useState<AllowanceHolderPriceResponse | null>(null);
  const sellTokenDecimals = useMemo(
    () => getTokenDecimals(fromTokenOption.symbol),
    [fromTokenOption.symbol]
  );
  const buyTokenDecimals = useMemo(
    () => getTokenDecimals(toTokenOption.symbol),
    [toTokenOption.symbol]
  );
  const resolvedChainId =
    Number.isFinite(chainId) && chainId ? chainId : DEFAULT_CHAIN_ID;

  useEffect(() => {
    if (
      typeof defaults?.fromAmount === "string" &&
      Number(defaults.fromAmount) > 0
    ) {
      setFromAmount(defaults.fromAmount);
    }

    if (
      typeof defaults?.slippage === "string" &&
      Number(defaults.slippage) >= 0 &&
      Number(defaults.slippage) <= 100
    ) {
      setSlippage(defaults.slippage);
    }
  }, [defaults]);

  useEffect(() => {
    setConfirmation(null);
    setStatus("idle");
  }, [fromToken, toToken]);

  useEffect(() => {
    setPriceQuote(null);
    setPriceDetails(null);
    setPriceError(null);
    setIsFetchingPrice(false);
  }, [fromTokenOption.symbol, toTokenOption.symbol]);

  useEffect(() => {
    const amountValue = Number(fromAmount);
    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      setPriceQuote(null);
      setPriceError(null);
      setIsFetchingPrice(false);
      setPriceDetails(null);
      return;
    }

    const controller = new AbortController();

    const fetchPrice = async () => {
      try {
        setIsFetchingPrice(true);
        setPriceError(null);

        const sellDecimals = sellTokenDecimals;
        const buyDecimals = buyTokenDecimals;
        const sellAmountBaseUnits = toBaseUnitAmount(fromAmount, sellDecimals);
        const params = new URLSearchParams();
        params.set("chainId", String(resolvedChainId));
        params.set("sellToken", getTokenIdentifier(fromTokenOption));
        params.set("buyToken", getTokenIdentifier(toTokenOption));
        params.set("sellAmount", sellAmountBaseUnits);
        if (takerAddress) {
          params.set("taker", takerAddress);
        }

        const response = await fetch(`/api/price?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as Record<
          string,
          unknown
        > | null;

        if (!response.ok || !payload) {
          const message =
            (payload?.detail as string) ??
            (payload?.error as string) ??
            (payload?.message as string) ??
            `Request failed (${response.status})`;
          throw new Error(message);
        }

        const pricePayload = payload as AllowanceHolderPriceResponse;
        setPriceDetails(pricePayload);

        const computedPrice = deriveConversionRate(
          pricePayload,
          sellDecimals,
          buyDecimals,
          sellAmountBaseUnits
        );

        if (!Number.isFinite(computedPrice) || computedPrice <= 0) {
          throw new Error("Invalid price returned");
        }

        setPriceQuote(computedPrice);
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Failed to fetch price", err);
        setPriceQuote(null);
        setPriceDetails(null);
        setPriceError(
          err instanceof Error
            ? err.message
            : "Failed to fetch price, please try again later"
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingPrice(false);
        }
      }
    };

    fetchPrice();

    return () => {
      controller.abort();
    };
  }, [
    buyTokenDecimals,
    fromAmount,
    fromToken,
    fromTokenOption,
    resolvedChainId,
    sellTokenDecimals,
    takerAddress,
    toToken,
    toTokenOption,
  ]);

  const conversionRate = useMemo(() => {
    if (priceQuote !== null && Number.isFinite(priceQuote) && priceQuote > 0) {
      return priceQuote;
    }

    const fromPrice = priceMap[fromToken] ?? DEFAULT_PRICE_FALLBACK;
    const toPrice = priceMap[toToken] ?? DEFAULT_PRICE_FALLBACK;
    if (!fromPrice || !toPrice) return 0;
    return fromPrice / toPrice;
  }, [fromToken, priceMap, priceQuote, toToken]);

  const estimatedOutputValue = useMemo(() => {
    const amount = Number(fromAmount);
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    return amount * conversionRate;
  }, [fromAmount, conversionRate]);

  const estimatedOutput = useMemo(
    () => formatNumeric(estimatedOutputValue),
    [estimatedOutputValue]
  );

  const quote = useMemo(() => formatNumeric(conversionRate), [conversionRate]);

  const handleAmountChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setFromAmount(event.target.value);
      setError(null);
      setStatus("idle");
    },
    []
  );

  const minBuyAmountDisplay = useMemo(() => {
    if (!priceDetails?.minBuyAmount) return null;
    const value = baseUnitToDecimal(
      priceDetails.minBuyAmount,
      buyTokenDecimals
    );
    if (value === null) return null;
    return `${formatNumeric(value)} ${toToken}`;
  }, [buyTokenDecimals, priceDetails?.minBuyAmount, toToken]);

  const zeroExFeeDisplay = useMemo(() => {
    const amount = priceDetails?.fees?.zeroExFee?.amount;
    if (!amount) return null;
    const tokenMeta = resolveTokenMeta(
      priceDetails?.fees?.zeroExFee?.token ?? null,
      fromTokenOption,
      toTokenOption
    );
    const decimals = tokenMeta?.decimals ?? buyTokenDecimals;
    const symbol = tokenMeta?.symbol ?? toToken;
    const value = baseUnitToDecimal(amount, decimals);
    if (value === null) return null;
    return `${formatNumeric(value)} ${symbol}`;
  }, [
    buyTokenDecimals,
    fromTokenOption,
    priceDetails?.fees?.zeroExFee?.amount,
    priceDetails?.fees?.zeroExFee?.token,
    toToken,
    toTokenOption,
  ]);

  const networkFeeDisplay = useMemo(() => {
    if (!priceDetails?.totalNetworkFee) return null;
    const value = baseUnitToDecimal(priceDetails.totalNetworkFee, 18);
    if (value === null) return null;
    return `${formatNumeric(value)} ETH`;
  }, [priceDetails?.totalNetworkFee]);

  const balanceWarning = useMemo(() => {
    const balanceIssue = priceDetails?.issues?.balance;
    if (!balanceIssue?.actual || !balanceIssue.expected) return null;
    const actual = baseUnitToDecimal(balanceIssue.actual, sellTokenDecimals);
    const expected = baseUnitToDecimal(
      balanceIssue.expected,
      sellTokenDecimals
    );
    if (actual === null || expected === null) return null;
    if (actual >= expected) return null;
    return `Insufficient balance: currently ${formatNumeric(
      actual
    )} ${fromToken}, requires ${formatNumeric(expected)} ${fromToken}`;
  }, [fromToken, priceDetails?.issues?.balance, sellTokenDecimals]);

  const handleSlippageChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        setSlippage(value);
        return;
      }

      const clamped = Math.min(Math.max(numeric, 0), 100);
      setSlippage(clamped.toString());
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const amountValue = Number(fromAmount);
      if (!Number.isFinite(amountValue) || amountValue <= 0) {
        setError("Enter a valid swap amount");
        setConfirmation(null);
        return;
      }

      try {
        setStatus("pending");
        setError(null);
        setConfirmation(null);

        await swap(fromAmount);

        setConfirmation(
          `已提交：${formatNumeric(
            amountValue
          )} ${fromToken} → ${toToken}，等待确认中…`
        );
      } catch (err: any) {
        setError(err?.message || "下单失败");
        setStatus("idle");
      }
    },
    [fromAmount, fromToken, toToken, swap]
  );

  const isSubmitting = status === "pending";

  return (
    <Card className="flex h-full flex-col border-border/60 bg-background/90 shadow-sm">
      <CardHeader className="space-y-1 pb-4">
        <CardTitle>Token Swap</CardTitle>
        <CardDescription>
          Configure amount, slippage, and preview the conversion (simulation
          only).
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
          <div className="grid gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor={amountId}>Amount to Swap</Label>
              <Input
                id={amountId}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={fromAmount}
                onChange={handleAmountChange}
              />
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label>From</Label>
                <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">
                    {fromTokenOption.name} ({fromToken})
                  </span>
                  {fromTokenOption.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {fromTokenOption.description}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label>To</Label>
                <div className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-sm">
                  <span className="font-medium">
                    {toTokenOption.name} ({toToken})
                  </span>
                  {toTokenOption.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {toTokenOption.description}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            {onFlip ? (
              <Button
                type="button"
                variant="outline"
                className="flex items-center gap-2 self-start"
                onClick={onFlip}
              >
                <ArrowLeftRight size={16} />
                Flip Direction
              </Button>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={slippageId}>Max Slippage (%)</Label>
              <Input
                id={slippageId}
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.1"
                value={slippage}
                onChange={handleSlippageChange}
              />
            </div>

            <div className="flex flex-col justify-center gap-1 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/40 p-3 text-sm">
              <span className="text-xs uppercase text-muted-foreground">
                Live Rate
              </span>
              <span className="text-base font-medium">
                {isFetchingPrice
                  ? "Loading..."
                  : `1 ${fromToken} ≈ ${quote} ${toToken}`}
              </span>
              {priceError ? (
                <span className="text-xs text-destructive">{priceError}</span>
              ) : null}
            </div>
          </div>

          <div className="rounded-lg border border-border/60 bg-background/70 p-3 text-sm shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Estimated Output</span>
              <span className="font-semibold">
                {estimatedOutput} {toToken}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Status</span>
              <span>
                {status === "pending"
                  ? "Simulating..."
                  : status === "success"
                  ? "Simulated"
                  : "Preview"}
              </span>
            </div>
          </div>

          {priceDetails ? (
            <div className="space-y-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Minimum Output</span>
                <span className="font-medium">
                  {minBuyAmountDisplay ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Protocol Fee</span>
                <span className="font-medium">{zeroExFeeDisplay ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  Estimated Network Fee
                </span>
                <span className="font-medium">{networkFeeDisplay ?? "—"}</span>
              </div>
              {balanceWarning ? (
                <div className="rounded-md bg-destructive/10 px-3 py-2 text-destructive">
                  {balanceWarning}
                </div>
              ) : null}
            </div>
          ) : null}

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          {confirmation ? (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm text-primary dark:text-primary-foreground">
              {confirmation}
            </p>
          ) : null}

          <div className="mt-auto">
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Simulate Swap"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function Artifact({
  baseToken,
  quoteToken,
  chainId,
  takerAddress,
}: {
  baseToken?: TokenInfo;
  quoteToken?: TokenInfo;
  chainId?: number;
  takerAddress?: string;
}) {
  const { artifact, metadata } = useArtifact();
  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile =
    typeof windowWidth === "number" && windowWidth > 0
      ? windowWidth < 768
      : false;
  const resolvedWindowWidth =
    typeof windowWidth === "number" && windowWidth > 0
      ? windowWidth
      : undefined;
  const resolvedWindowHeight =
    typeof windowHeight === "number" && windowHeight > 0
      ? windowHeight
      : undefined;

  const chartConfig = useMemo(
    () =>
      buildChartConfig(
        baseToken ?? {
          address: "0xc02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          symbol: "ETH",
          name: "Ethereum",
        },
        quoteToken ?? {
          address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          symbol: "USDT",
          name: "Tether USD",
        }
      ),
    [baseToken, quoteToken]
  );

  const tokenOptions = useMemo(
    () =>
      buildTokenOptions(
        baseToken ?? {
          address: "0xc02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
          symbol: "ETH",
          name: "Ethereum",
        },
        quoteToken ?? {
          address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
          symbol: "USDT",
          name: "Tether USD",
        }
      ),
    [baseToken, quoteToken]
  );

  const priceMap = useMemo(() => buildPriceMap(tokenOptions), [tokenOptions]);

  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    setIsFlipped(false);
  }, [baseToken?.address, quoteToken?.address]);

  const resolvedChainId =
    Number.isFinite(chainId) && chainId ? chainId : DEFAULT_CHAIN_ID;
  const resolvedTaker =
    typeof takerAddress === "string" && takerAddress.trim() !== ""
      ? takerAddress
      : undefined;

  const basePairOptions = useMemo(() => {
    const fallbackFrom: SwapTokenOption = {
      address: "0xc02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      symbol: DEFAULT_FROM_SYMBOL,
      name: "Ethereum",
      description: "Wrapped Ether (WETH)",
    };

    const fallbackTo: SwapTokenOption = {
      address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      symbol: DEFAULT_TO_SYMBOL,
      name: "Tether USD",
      description: "USD stablecoin",
    };

    const normalizedFrom = normalizeTokenOption(baseToken) ?? fallbackFrom;
    let normalizedTo = normalizeTokenOption(quoteToken) ?? fallbackTo;

    if (normalizedTo.symbol === normalizedFrom.symbol) {
      const alternative = tokenOptions.find(
        (option) => option.symbol !== normalizedFrom.symbol
      );
      if (alternative) {
        normalizedTo = alternative;
      }
    }

    return {
      fromTokenOption: normalizedFrom,
      toTokenOption: normalizedTo,
    };
  }, [baseToken, quoteToken, tokenOptions]);

  const fromTokenOption = isFlipped
    ? basePairOptions.toTokenOption
    : basePairOptions.fromTokenOption;
  const toTokenOption = isFlipped
    ? basePairOptions.fromTokenOption
    : basePairOptions.toTokenOption;

  const swapDefaults = useMemo(() => {
    const defaults = deriveSwapDefaults(
      metadata,
      chartConfig.symbol,
      tokenOptions
    );

    if (isFlipped) {
      return {
        ...defaults,
        fromToken: defaults.toToken,
        toToken: defaults.fromToken,
      };
    }

    return defaults;
  }, [isFlipped, metadata, chartConfig.symbol, tokenOptions]);

  const targetPanelWidth = isMobile
    ? resolvedWindowWidth ?? 360
    : resolvedWindowWidth
    ? Math.max(resolvedWindowWidth - 400, 360)
    : 960;
  const targetPanelHeight = resolvedWindowHeight ?? 720;

  const initialWidth =
    artifact.boundingBox.width > 0 ? artifact.boundingBox.width : 280;
  const initialHeight =
    artifact.boundingBox.height > 0 ? artifact.boundingBox.height : 200;
  const initialTop =
    artifact.boundingBox.top > 0 ? artifact.boundingBox.top : 40;
  const initialRight =
    resolvedWindowWidth && artifact.boundingBox.width > 0
      ? Math.max(
          resolvedWindowWidth -
            (artifact.boundingBox.left + artifact.boundingBox.width),
          0
        )
      : 20;

  return (
    <AnimatePresence>
      {artifact.isVisible && (
        <motion.div className="pointer-events-none fixed inset-0 z-50">
          {!isMobile && (
            <motion.div
              className="pointer-events-auto fixed left-0 top-0 hidden h-dvh w-[400px] flex-col border-r border-border/60 bg-background shadow-xl dark:bg-background md:flex"
              initial={{ opacity: 0, x: -40 }}
              animate={{
                opacity: 1,
                x: 0,
                transition: {
                  delay: 0.05,
                  type: "spring",
                  stiffness: 320,
                  damping: 32,
                },
              }}
              exit={{
                opacity: 0,
                x: -20,
                transition: { duration: 0.2 },
              }}
            ></motion.div>
          )}

          <motion.div
            data-testid="artifact"
            className="pointer-events-auto fixed top-0 right-0 flex h-dvh flex-col overflow-y-auto bg-background shadow-2xl dark:bg-muted"
            initial={{
              opacity: 0,
              top: initialTop,
              right: initialRight,
              width: initialWidth,
              height: initialHeight,
              borderRadius: 24,
            }}
            animate={{
              opacity: 1,
              top: 0,
              right: 0,
              width: targetPanelWidth,
              height: targetPanelHeight,
              borderRadius: 0,
              transition: {
                delay: 0,
                type: "spring",
                stiffness: 300,
                damping: 30,
                duration: 0.6,
              },
            }}
            exit={{
              opacity: 0,
              top: initialTop,
              right: initialRight,
              width: initialWidth,
              height: initialHeight,
              borderRadius: 24,
              transition: {
                delay: 0.1,
                type: "spring",
                stiffness: 500,
                damping: 36,
              },
            }}
          >
            <div className="flex flex-row justify-between items-center px-4 pt-4">
              <div>
                <div className="text-xs uppercase text-muted-foreground">
                  Market Tools
                </div>
                <div className="text-xl font-semibold mt-1">
                  {chartConfig.symbol} Dashboard
                </div>
              </div>
              <ArtifactCloseButton />
            </div>

            <div className="w-full flex flex-col gap-6 p-4 md:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
                <Card className="flex h-full flex-col border-border/60 bg-background/90 dark:bg-background shadow-sm">
                  <CardHeader className="space-y-1 pb-4">
                    <CardTitle>{`${chartConfig.symbol} Market`}</CardTitle>
                    <CardDescription>
                      {chartConfig.exchange} · Interval{" "}
                      {DEFAULT_CHART_INTERVAL.toUpperCase()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-[420px] w-full pt-0 lg:h-[520px]">
                    <TradingViewChart
                      symbol={chartConfig.symbol}
                      exchange={chartConfig.exchange}
                      interval={chartConfig.tvInterval}
                      height={480}
                    />
                  </CardContent>
                </Card>

                <SwapForm
                  defaults={swapDefaults}
                  priceMap={priceMap}
                  fromTokenOption={fromTokenOption}
                  toTokenOption={toTokenOption}
                  chainId={resolvedChainId}
                  takerAddress={resolvedTaker}
                  onFlip={() => setIsFlipped((prev) => !prev)}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

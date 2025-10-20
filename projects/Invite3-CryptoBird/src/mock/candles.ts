import type { CandlestickData, UTCTimestamp } from 'lightweight-charts';

export type TimeframeKey = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M';

const POINTS_PER_SERIES = 100;
const BASE_TIMESTAMP = 1_717_200_000;

interface TimeframeConfig {
  intervalSeconds: number;
  basePrice: number;
  volatility: number;
  seed: number;
}

const timeframeConfigs: Record<TimeframeKey, TimeframeConfig> = {
  '1m': { intervalSeconds: 60, basePrice: 0.00035, volatility: 0.16, seed: 11 },
  '5m': { intervalSeconds: 300, basePrice: 0.00036, volatility: 0.12, seed: 23 },
  '15m': { intervalSeconds: 900, basePrice: 0.00034, volatility: 0.1, seed: 37 },
  '1h': { intervalSeconds: 3600, basePrice: 0.00032, volatility: 0.08, seed: 49 },
  '4h': { intervalSeconds: 14_400, basePrice: 0.00031, volatility: 0.07, seed: 61 },
  '1d': { intervalSeconds: 86_400, basePrice: 0.00029, volatility: 0.05, seed: 73 },
  '1w': { intervalSeconds: 604_800, basePrice: 0.00027, volatility: 0.04, seed: 89 },
  '1M': { intervalSeconds: 2_592_000, basePrice: 0.00025, volatility: 0.035, seed: 101 },
};

const roundPrice = (value: number) => Number(value.toFixed(8));

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const createSeededRandom = (seed: number) => {
  let current = seed >>> 0;
  return () => {
    current = (1664525 * current + 1013904223) >>> 0;
    return current / 2 ** 32;
  };
};

const generateSeries = ({
  intervalSeconds,
  basePrice,
  volatility,
  seed,
}: TimeframeConfig): CandlestickData[] => {
  const random = createSeededRandom(seed);
  const start = BASE_TIMESTAMP - intervalSeconds * POINTS_PER_SERIES;
  const candles: CandlestickData[] = [];
  let lastClose = basePrice;

  for (let i = 0; i < POINTS_PER_SERIES; i += 1) {
    const time = (start + i * intervalSeconds) as UTCTimestamp;
    const direction = random() - 0.5;
    const move = direction * volatility;
    const openRaw = lastClose;
    const closeRaw = Math.max(openRaw * (1 + move), basePrice * 0.3);

    const highBase = Math.max(openRaw, closeRaw);
    const lowBase = Math.min(openRaw, closeRaw);
    const wickRange = 0.02 + random() * 0.03;
    const highRaw = highBase * (1 + wickRange * random());
    const lowRaw = Math.max(lowBase * (1 - wickRange * random()), basePrice * 0.1);

    let high = roundPrice(Math.max(highRaw, openRaw, closeRaw));
    let low = roundPrice(Math.min(lowRaw, openRaw, closeRaw));
    let open = roundPrice(openRaw);
    let close = roundPrice(closeRaw);

    if (low > high) {
      low = roundPrice(high * 0.98);
    }

    if (high <= low) {
      high = roundPrice(low * 1.02);
    }

    open = clamp(open, low, high);
    close = clamp(close, low, high);

    candles.push({
      time,
      open,
      high,
      low,
      close,
    });

    lastClose = closeRaw;
  }

  return candles;
};

export const STATIC_SERIES: Record<TimeframeKey, CandlestickData[]> = {
  '1m': generateSeries(timeframeConfigs['1m']),
  '5m': generateSeries(timeframeConfigs['5m']),
  '15m': generateSeries(timeframeConfigs['15m']),
  '1h': generateSeries(timeframeConfigs['1h']),
  '4h': generateSeries(timeframeConfigs['4h']),
  '1d': generateSeries(timeframeConfigs['1d']),
  '1w': generateSeries(timeframeConfigs['1w']),
  '1M': generateSeries(timeframeConfigs['1M']),
};

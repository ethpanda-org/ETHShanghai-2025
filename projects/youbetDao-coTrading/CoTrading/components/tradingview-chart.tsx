'use client';

import { memo, useEffect, useId, useRef } from 'react';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { TradingView: any }
}

function loadTradingViewScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return resolve();
    if (window.TradingView) return resolve();

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load TradingView script'));
    document.head.appendChild(script);
  });
}

export const TradingViewChart = memo(function TradingViewChart({
  symbol,
  exchange = 'BINANCE',
  interval = '1',
  theme = 'dark',
  height = 420,
}: {
  symbol: string; // e.g. BTCUSDT
  exchange?: string; // e.g. BINANCE, BYBIT, OKX
  interval?: string; // TradingView interval: '1','5','15','60','240','D'...
  theme?: 'light' | 'dark';
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const id = useId().replace(/:/g, '');

  useEffect(() => {
    let widget: unknown;

    loadTradingViewScript()
      .then(() => {
        if (!containerRef.current || !window.TradingView) return;
        const tvSymbol = `${exchange}:${symbol}`;
        // eslint-disable-next-line new-cap
        widget = new window.TradingView.widget({
          symbol: tvSymbol,
          interval,
          autosize: true,
          container_id: id,
          theme,
          hide_side_toolbar: false,
          hide_top_toolbar: false,
          allow_symbol_change: true,
          studies: [
            'MA@tv-basicstudies',
            'MACD@tv-basicstudies',
            'Volume@tv-basicstudies',
          ],
          locale: 'en',
          timezone: 'Etc/UTC',
          withdateranges: true,
          toolbar_bg: 'transparent',
        });
      })
      .catch((err) => {
        // eslint-disable-next-line no-console
        console.error(err);
      });

    return () => {
      // TradingView widget cleans up automatically when container is removed
    };
  }, [symbol, exchange, interval, theme, id]);

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      <div id={id} style={{ width: '100%', height: '100%' }} />
    </div>
  );
});



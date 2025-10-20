'use client';

import { memo, useEffect, useRef } from 'react';

type Candle = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  closeTime?: number;
};

export type CryptoChartData = {
  symbol: string;
  interval: string;
  candles: Candle[];
};

// 轻量纯DOM实现：用 <canvas> 简单绘制蜡烛图，避免额外依赖
export const CryptoChart = memo(function CryptoChart({
  data,
  height = 240,
}: {
  data: CryptoChartData;
  height?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.clientWidth * devicePixelRatio;
    const h = height * devicePixelRatio;
    canvas.width = width;
    canvas.height = h;

    ctx.clearRect(0, 0, width, h);

    const candles = data.candles.slice(-100); // 只绘制最近 100 根
    if (candles.length === 0) return;

    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const minY = Math.min(...lows);
    const maxY = Math.max(...highs);

    const padding = 16 * devicePixelRatio;
    const chartW = width - padding * 2;
    const chartH = h - padding * 2;
    const stepX = chartW / candles.length;

    const yScale = (price: number) =>
      padding + chartH * (1 - (price - minY) / Math.max(1e-9, maxY - minY));

    // 轴与标题
    ctx.fillStyle = 'rgba(148,163,184,0.6)';
    ctx.font = `${12 * devicePixelRatio}px system-ui, -apple-system`;
    ctx.fillText(`${data.symbol} · ${data.interval}`,
      padding,
      padding - 2 * devicePixelRatio,
    );

    // 绘制蜡烛
    candles.forEach((c, i) => {
      const x = padding + i * stepX + stepX / 2;
      const yOpen = yScale(c.open);
      const yClose = yScale(c.close);
      const yHigh = yScale(c.high);
      const yLow = yScale(c.low);

      const isUp = c.close >= c.open;
      const color = isUp ? '#16a34a' : '#ef4444';

      // 影线
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1, devicePixelRatio);
      ctx.beginPath();
      ctx.moveTo(x, yHigh);
      ctx.lineTo(x, yLow);
      ctx.stroke();

      // 实体
      const bodyTop = Math.min(yOpen, yClose);
      const bodyBottom = Math.max(yOpen, yClose);
      const bodyW = Math.max(2 * devicePixelRatio, stepX * 0.6);
      ctx.fillStyle = color;
      ctx.fillRect(x - bodyW / 2, bodyTop, bodyW, Math.max(1, bodyBottom - bodyTop));
    });
  }, [data, height]);

  return (
    <div className="w-full">
      <canvas ref={canvasRef} style={{ width: '100%', height }} />
    </div>
  );
});



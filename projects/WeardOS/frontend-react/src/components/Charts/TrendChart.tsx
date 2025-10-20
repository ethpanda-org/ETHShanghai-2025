// TrendChart.tsx - 趋势图表组件
import React, { useEffect, useRef } from 'react';
import { Card } from 'antd';
import * as echarts from 'echarts';
import './TrendChart.scss';

export interface TrendDataPoint {
  time: string;
  value: number;
  volume?: number;
}

export interface TrendChartProps {
  title: string;
  data: TrendDataPoint[];
  type?: 'line' | 'area' | 'candlestick';
  height?: number;
  color?: string;
  showVolume?: boolean;
  loading?: boolean;
  className?: string;
}

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  data,
  type = 'line',
  height = 300,
  color = '#1890ff',
  showVolume = false,
  loading = false,
  className
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current!, 'dark');
    }

    const chart = chartInstance.current;

    // 准备数据
    const times = data.map(item => item.time);
    const values = data.map(item => item.value);
    const volumes = data.map(item => item.volume || 0);

    // 计算价格变化
    const priceChange = data.length > 1 ? 
      ((data[data.length - 1].value - data[0].value) / data[0].value) * 100 : 0;

    // 动态颜色
    const lineColor = priceChange >= 0 ? '#52c41a' : '#ff4d4f';
    const areaColor = priceChange >= 0 ? 
      ['rgba(82, 196, 26, 0.3)', 'rgba(82, 196, 26, 0.1)'] :
      ['rgba(255, 77, 79, 0.3)', 'rgba(255, 77, 79, 0.1)'];

    // 图表配置
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: showVolume ? [
        { left: '3%', right: '4%', top: '10%', height: '60%' },
        { left: '3%', right: '4%', top: '75%', height: '20%' }
      ] : {
        left: '3%',
        right: '4%',
        top: '10%',
        bottom: '10%'
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: color,
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const value = param.value;
          const time = param.axisValue;
          
          let tooltip = `
            <div style="padding: 8px;">
              <div style="color: #fff; font-weight: bold;">${time}</div>
              <div style="color: ${lineColor}; margin-top: 4px;">
                价格: $${typeof value === 'number' ? value.toFixed(4) : value}
              </div>
          `;
          
          if (showVolume && param.seriesName === 'Volume') {
            tooltip += `<div style="color: #8c8c8c; margin-top: 4px;">成交量: ${value.toLocaleString()}</div>`;
          }
          
          tooltip += '</div>';
          return tooltip;
        }
      },
      xAxis: showVolume ? [
        {
          type: 'category',
          data: times,
          gridIndex: 0,
          axisLine: { lineStyle: { color: '#434343' } },
          axisTick: { show: false },
          axisLabel: { 
            color: '#8c8c8c',
            fontSize: 11
          },
          splitLine: { show: false }
        },
        {
          type: 'category',
          data: times,
          gridIndex: 1,
          axisLine: { lineStyle: { color: '#434343' } },
          axisTick: { show: false },
          axisLabel: { 
            color: '#8c8c8c',
            fontSize: 11
          },
          splitLine: { show: false }
        }
      ] : {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#434343' } },
        axisTick: { show: false },
        axisLabel: { 
          color: '#8c8c8c',
          fontSize: 11
        },
        splitLine: { show: false }
      },
      yAxis: showVolume ? [
        {
          type: 'value',
          gridIndex: 0,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { 
            color: '#8c8c8c',
            fontSize: 11,
            formatter: (value: number) => `$${value.toFixed(2)}`
          },
          splitLine: { 
            lineStyle: { 
              color: '#434343',
              type: 'dashed'
            }
          }
        },
        {
          type: 'value',
          gridIndex: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { 
            color: '#8c8c8c',
            fontSize: 11,
            formatter: (value: number) => value > 1000 ? `${(value/1000).toFixed(1)}K` : value.toString()
          },
          splitLine: { 
            lineStyle: { 
              color: '#434343',
              type: 'dashed'
            }
          }
        }
      ] : {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { 
          color: '#8c8c8c',
          fontSize: 11,
          formatter: (value: number) => `$${value.toFixed(2)}`
        },
        splitLine: { 
          lineStyle: { 
            color: '#434343',
            type: 'dashed'
          }
        }
      },
      series: []
    };

    // 主价格线
    const priceSeries: any = {
      name: 'Price',
      type: type === 'candlestick' ? 'candlestick' : 'line',
      data: values,
      xAxisIndex: 0,
      yAxisIndex: 0,
      smooth: type === 'line',
      symbol: 'none',
      lineStyle: {
        color: lineColor,
        width: 2
      },
      itemStyle: {
        color: lineColor
      }
    };

    // 面积图配置
    if (type === 'area') {
      priceSeries.areaStyle = {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: areaColor[0] },
          { offset: 1, color: areaColor[1] }
        ])
      };
    }

    (option.series as any[]).push(priceSeries);

    // 成交量柱状图
    if (showVolume) {
      (option.series as any[]).push({
        name: 'Volume',
        type: 'bar',
        data: volumes,
        xAxisIndex: 1,
        yAxisIndex: 1,
        itemStyle: {
          color: '#434343',
          opacity: 0.6
        },
        emphasis: {
          itemStyle: {
            color: color,
            opacity: 0.8
          }
        }
      });
    }

    // 设置图表选项
    chart.setOption(option, true);

    // 添加动画效果
    chart.on('finished', () => {
      // 图表渲染完成后的回调
    });

    // 响应式处理
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, type, color, showVolume, height]);

  useEffect(() => {
    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
        chartInstance.current = null;
      }
    };
  }, []);

  return (
    <Card 
      title={title}
      className={`trend-chart ${className || ''}`}
      loading={loading}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <div 
        ref={chartRef} 
        className="chart-container"
        style={{ height: `${height}px`, width: '100%' }}
      />
      
      {data.length > 1 && (
        <div className="chart-summary">
          <div className="price-info">
            <div className="current-price">
              ${data[data.length - 1]?.value.toFixed(4)}
            </div>
            <div className={`price-change ${
              ((data[data.length - 1]?.value - data[0]?.value) / data[0]?.value) >= 0 ? 'positive' : 'negative'
            }`}>
              {((data[data.length - 1]?.value - data[0]?.value) / data[0]?.value) >= 0 ? '+' : ''}{((data[data.length - 1]?.value - data[0]?.value) / data[0]?.value * 100).toFixed(2)}%
            </div>
          </div>
          
          {showVolume && (
            <div className="volume-info">
              <div className="volume-label">24h Volume:</div>
              <div className="volume-value">
                ${data.reduce((sum, item) => sum + (item.volume || 0), 0).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default TrendChart;
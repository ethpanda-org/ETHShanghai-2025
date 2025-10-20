// BarChart.tsx - 柱状图组件
import React, { useEffect, useRef, useMemo } from 'react';
import { Card } from 'antd';
import * as echarts from 'echarts';
import './BarChart.scss';

export interface BarDataItem {
  name: string;
  value: number;
  color?: string;
  category?: string;
}

export interface BarChartProps {
  title: string;
  data: BarDataItem[];
  height?: number;
  type?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showValues?: boolean;
  gradient?: boolean;
  loading?: boolean;
  className?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  maxBarWidth?: number;
}

const BarChart: React.FC<BarChartProps> = ({
  title,
  data,
  height = 300,
  type = 'vertical',
  showGrid = true,
  showValues = true,
  gradient = true,
  loading = false,
  className,
  xAxisLabel,
  yAxisLabel,
  maxBarWidth = 40
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  // 默认颜色方案
  const defaultColors = useMemo(() => [
    '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
    '#13c2c2', '#eb2f96', '#fa8c16', '#a0d911', '#2f54eb'
  ], []);

  useEffect(() => {
    if (!chartRef.current || !data.length) return;

    // 初始化图表
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current!, 'dark');
    }

    const chart = chartInstance.current;

    // 处理数据
    const categories = data.map(item => item.name);
    const values = data.map(item => item.value);
    const maxValue = Math.max(...values);

    // 创建渐变色
    const createGradientColor = (color: string) => {
      if (!gradient) return color;
      
      return new echarts.graphic.LinearGradient(
        0, 0, 0, 1,
        [
          { offset: 0, color: color },
          { offset: 1, color: echarts.color.modifyAlpha(color, 0.3) }
        ]
      );
    };

    // 处理柱状图数据
    const seriesData = data.map((item, index) => {
      const baseColor = item.color || defaultColors[index % defaultColors.length];
      return {
        value: item.value,
        itemStyle: {
          color: createGradientColor(baseColor),
          borderRadius: type === 'vertical' ? [4, 4, 0, 0] : [0, 4, 4, 0]
        },
        emphasis: {
          itemStyle: {
            color: baseColor,
            shadowBlur: 10,
            shadowColor: echarts.color.modifyAlpha(baseColor, 0.5)
          }
        }
      };
    });

    // 图表配置
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      grid: {
        left: type === 'horizontal' ? '15%' : '3%',
        right: '4%',
        top: '15%',
        bottom: xAxisLabel ? '15%' : '10%',
        containLabel: true
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#1890ff',
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          const param = Array.isArray(params) ? params[0] : params;
          const percent = maxValue > 0 ? ((param.value / maxValue) * 100).toFixed(1) : '0';
          
          return `
            <div style="padding: 8px;">
              <div style="color: #fff; font-weight: bold; margin-bottom: 4px;">
                ${param.name}
              </div>
              <div style="color: ${param.color};">
                数值: ${param.value.toLocaleString()}
              </div>
              <div style="color: #8c8c8c; font-size: 12px;">
                占比: ${percent}%
              </div>
            </div>
          `;
        }
      },
      xAxis: {
        type: type === 'vertical' ? 'category' : 'value',
        data: type === 'vertical' ? categories : undefined,
        axisLine: {
          lineStyle: {
            color: '#434343'
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#8c8c8c',
          fontSize: 11,
          rotate: type === 'vertical' && categories.some(cat => cat.length > 6) ? 45 : 0,
          formatter: type === 'horizontal' ? 
            (value: number) => value > 1000 ? `${(value/1000).toFixed(1)}K` : value.toString() :
            undefined
        },
        splitLine: showGrid ? {
          lineStyle: {
            color: '#434343',
            type: 'dashed'
          }
        } : { show: false },
        name: xAxisLabel,
        nameTextStyle: {
          color: '#8c8c8c',
          fontSize: 12
        },
        nameLocation: 'middle',
        nameGap: 30
      } as any,
      yAxis: {
        type: type === 'vertical' ? 'value' : 'category',
        data: type === 'horizontal' ? categories : undefined,
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#8c8c8c',
          fontSize: 11,
          formatter: type === 'vertical' ? 
            (value: number) => value > 1000 ? `${(value/1000).toFixed(1)}K` : value.toString() :
            undefined
        },
        splitLine: showGrid ? {
          lineStyle: {
            color: '#434343',
            type: 'dashed'
          }
        } : { show: false },
        name: yAxisLabel,
        nameTextStyle: {
          color: '#8c8c8c',
          fontSize: 12
        },
        nameLocation: 'middle',
        nameGap: 50
      } as any,
      series: [
        {
          name: title,
          type: 'bar',
          data: seriesData,
          barMaxWidth: maxBarWidth,
          label: showValues ? {
            show: true,
            position: type === 'vertical' ? 'top' : 'right',
            color: '#fff',
            fontSize: 11,
            formatter: (params: any) => {
              return params.value > 1000 ? 
                `${(params.value/1000).toFixed(1)}K` : 
                params.value.toString();
            }
          } : { show: false },
          animationDelay: (idx: number) => idx * 100,
          animationDuration: 800,
          animationEasing: 'elasticOut'
        }
      ]
    };

    // 设置图表选项
    chart.setOption(option, true);

    // 响应式处理
    const handleResize = () => {
      chart.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data, height, type, showGrid, showValues, gradient, maxBarWidth, xAxisLabel, yAxisLabel, defaultColors, title]);

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
      className={`bar-chart ${className || ''} ${type}-bar`}
      loading={loading}
      bodyStyle={{ padding: '16px 24px' }}
    >
      <div 
        ref={chartRef} 
        className="chart-container"
        style={{ height: `${height}px`, width: '100%' }}
      />
      
      {data.length > 0 && (
        <div className="chart-summary">
          <div className="stats-row">
            <div className="stat-item">
              <span className="stat-label">最高值:</span>
              <span className="stat-value">
                {Math.max(...data.map(item => item.value)).toLocaleString()}
              </span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">平均值:</span>
              <span className="stat-value">
                {(data.reduce((sum, item) => sum + item.value, 0) / data.length).toLocaleString()}
              </span>
            </div>
            
            <div className="stat-item">
              <span className="stat-label">总计:</span>
              <span className="stat-value">
                {data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
              </span>
            </div>
          </div>
          
          {/* 显示前3名 */}
          <div className="top-items">
            <div className="top-items-title">排行榜</div>
            {data
              .sort((a, b) => b.value - a.value)
              .slice(0, 3)
              .map((item, index) => (
                <div key={item.name} className="top-item">
                  <div className="rank-badge">{index + 1}</div>
                  <div className="item-info">
                    <span className="item-name">{item.name}</span>
                    <span className="item-value">{item.value.toLocaleString()}</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ 
                        width: `${(item.value / Math.max(...data.map(d => d.value))) * 100}%`,
                        backgroundColor: item.color || defaultColors[data.indexOf(item)]
                      }}
                    />
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}
    </Card>
  );
};

export default BarChart;
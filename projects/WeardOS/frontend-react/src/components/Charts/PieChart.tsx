// PieChart.tsx - 饼图组件
import React, { useEffect, useRef, useMemo } from 'react';
import { Card } from 'antd';
import * as echarts from 'echarts';
import './PieChart.scss';

export interface PieDataItem {
  name: string;
  value: number;
  color?: string;
  icon?: string;
}

export interface PieChartProps {
  title: string;
  data: PieDataItem[];
  height?: number;
  showLegend?: boolean;
  showLabels?: boolean;
  innerRadius?: string;
  outerRadius?: string;
  loading?: boolean;
  className?: string;
  centerText?: {
    title: string;
    subtitle: string;
  };
}

const PieChart: React.FC<PieChartProps> = ({
  title,
  data,
  height = 300,
  showLegend = true,
  showLabels = true,
  innerRadius = '40%',
  outerRadius = '70%',
  loading = false,
  className,
  centerText
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

    // 处理数据，添加颜色
    const processedData = data.map((item, index) => ({
      ...item,
      itemStyle: {
        color: item.color || defaultColors[index % defaultColors.length]
      }
    }));

    // 计算总值
    const totalValue = data.reduce((sum, item) => sum + item.value, 0);

    // 图表配置
    const option: echarts.EChartsOption = {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        borderColor: '#1890ff',
        textStyle: {
          color: '#fff'
        },
        formatter: (params: any) => {
          const percent = ((params.value / totalValue) * 100).toFixed(1);
          return `
            <div style="padding: 8px;">
              <div style="display: flex; align-items: center; margin-bottom: 4px;">
                <div style="width: 12px; height: 12px; background: ${params.color}; border-radius: 50%; margin-right: 8px;"></div>
                <span style="color: #fff; font-weight: bold;">${params.name}</span>
              </div>
              <div style="color: #8c8c8c;">
                数量: ${params.value.toLocaleString()}
              </div>
              <div style="color: #8c8c8c;">
                占比: ${percent}%
              </div>
            </div>
          `;
        }
      },
      legend: showLegend ? {
        orient: 'vertical',
        right: '10%',
        top: 'center',
        textStyle: {
          color: '#fff',
          fontSize: 12
        },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 16,
        formatter: (name: string) => {
          const item = data.find(d => d.name === name);
          const percent = item ? ((item.value / totalValue) * 100).toFixed(1) : '0';
          return `${name} ${percent}%`;
        }
      } : undefined,
      series: [
        {
          name: title,
          type: 'pie',
          radius: [innerRadius, outerRadius],
          center: ['40%', '50%'],
          data: processedData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            },
            scaleSize: 5
          },
          label: showLabels ? {
            show: true,
            position: 'outside',
            color: '#fff',
            fontSize: 11,
            formatter: (params: any) => {
              const percent = ((params.value / totalValue) * 100).toFixed(1);
              return `${params.name}\n${percent}%`;
            }
          } : {
            show: false
          },
          labelLine: showLabels ? {
            show: true,
            lineStyle: {
              color: '#8c8c8c'
            }
          } : {
            show: false
          },
          animationType: 'scale',
          animationEasing: 'elasticOut',
          animationDelay: (_idx: number) => Math.random() * 200
        }
      ]
    };

    // 如果有中心文本，添加中心文本系列
    if (centerText) {
      (option.series as any[]).push({
        name: 'Center Text',
        type: 'pie',
        radius: ['0%', '30%'],
        center: ['40%', '50%'],
        data: [{
          value: 1,
          name: '',
          itemStyle: {
            color: 'transparent'
          },
          label: {
            show: true,
            position: 'center',
            color: '#fff',
            fontSize: 16,
            fontWeight: 'bold',
            formatter: () => centerText.title
          }
        }],
        silent: true
      } as any);

      // 添加副标题
      option.graphic = {
        type: 'text',
        left: '40%',
        top: '55%',
        style: {
          text: centerText.subtitle,
          fill: '#8c8c8c',
          fontSize: 12
        }
      } as any;
    }

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
  }, [data, height, showLegend, showLabels, innerRadius, outerRadius, centerText, defaultColors, title]);

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
      className={`pie-chart ${className || ''}`}
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
          <div className="total-info">
            <span className="total-label">总计:</span>
            <span className="total-value">
              {data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
            </span>
          </div>
          
          <div className="top-items">
            {data
              .sort((a, b) => b.value - a.value)
              .slice(0, 3)
              .map((item, _index) => {
                const percent = ((item.value / data.reduce((sum, d) => sum + d.value, 0)) * 100).toFixed(1);
                return (
                  <div key={item.name} className="top-item">
                    <div className="item-info">
                      <div 
                        className="item-color" 
                        style={{ backgroundColor: item.color || defaultColors[data.indexOf(item)] }}
                      />
                      <span className="item-name">{item.name}</span>
                    </div>
                    <div className="item-stats">
                      <span className="item-value">{item.value.toLocaleString()}</span>
                      <span className="item-percent">{percent}%</span>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      )}
    </Card>
  );
};

export default PieChart;
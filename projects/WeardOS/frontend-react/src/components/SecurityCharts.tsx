// SecurityCharts.tsx
import React, { useState } from 'react';
import { Card, Row, Col, Select, Statistic, Tag } from 'antd';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Treemap
} from 'recharts';
import { 
  BarChartOutlined,
  PieChartOutlined,
  LineChartOutlined,
  RadarChartOutlined,
  DashboardOutlined,
  TrophyOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import './SecurityCharts.scss';

const { Option } = Select;

// 图表数据接口
export interface ChartData {
  riskDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  categoryAnalysis: Array<{
    category: string;
    issues: number;
    severity: number;
    fixed: number;
  }>;
  timelineData: Array<{
    date: string;
    scanned: number;
    issues: number;
    fixed: number;
  }>;
  securityMetrics: Array<{
    metric: string;
    score: number;
    fullMark: number;
  }>;
  gasOptimization: Array<{
    function: string;
    before: number;
    after: number;
    savings: number;
  }>;
  codeComplexity: Array<{
    name: string;
    size: number;
    complexity: number;
    issues: number;
  }>;
}

interface SecurityChartsProps {
  data: ChartData;
  isLoading?: boolean;
}

const SecurityCharts: React.FC<SecurityChartsProps> = ({
  data,
  isLoading = false
}) => {
  const [selectedChart, setSelectedChart] = useState<string>('overview');

  // 风险分布饼图
  const RiskDistributionChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data.riskDistribution}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(props: any) => `${props.name} ${(props.percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.riskDistribution.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );

  // 分类分析柱状图
  const CategoryAnalysisChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.categoryAnalysis}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          dataKey="category" 
          tick={{ fill: '#ffffff', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
        />
        <YAxis 
          tick={{ fill: '#ffffff', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
        />
        <Bar dataKey="issues" fill="#ff4d4f" name="问题数量" />
        <Bar dataKey="fixed" fill="#52c41a" name="已修复" />
        <Legend />
      </BarChart>
    </ResponsiveContainer>
  );

  // 时间线趋势图
  const TimelineChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data.timelineData}>
        <defs>
          <linearGradient id="colorScanned" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#21d4fd" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#21d4fd" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorIssues" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ff4d4f" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ff4d4f" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorFixed" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#52c41a" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#52c41a" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="date" 
          tick={{ fill: '#ffffff', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
        />
        <YAxis 
          tick={{ fill: '#ffffff', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
        />
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <Area 
          type="monotone" 
          dataKey="scanned" 
          stroke="#21d4fd" 
          fillOpacity={1} 
          fill="url(#colorScanned)"
          name="扫描数量"
        />
        <Area 
          type="monotone" 
          dataKey="issues" 
          stroke="#ff4d4f" 
          fillOpacity={1} 
          fill="url(#colorIssues)"
          name="发现问题"
        />
        <Area 
          type="monotone" 
          dataKey="fixed" 
          stroke="#52c41a" 
          fillOpacity={1} 
          fill="url(#colorFixed)"
          name="已修复"
        />
        <Legend />
      </AreaChart>
    </ResponsiveContainer>
  );

  // 安全指标雷达图
  const SecurityMetricsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart data={data.securityMetrics}>
        <PolarGrid stroke="rgba(255,255,255,0.2)" />
        <PolarAngleAxis 
          dataKey="metric" 
          tick={{ fill: '#ffffff', fontSize: 12 }}
        />
        <PolarRadiusAxis 
          tick={{ fill: '#ffffff', fontSize: 10 }}
          tickCount={6}
        />
        <Radar
          name="安全评分"
          dataKey="score"
          stroke="#21d4fd"
          fill="#21d4fd"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </RadarChart>
    </ResponsiveContainer>
  );

  // Gas优化对比图
  const GasOptimizationChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data.gasOptimization} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
        <XAxis 
          type="number"
          tick={{ fill: '#ffffff', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
        />
        <YAxis 
          type="category"
          dataKey="function" 
          tick={{ fill: '#ffffff', fontSize: 12 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.3)' }}
          width={100}
        />
        <Bar dataKey="before" fill="#ff7a45" name="优化前" />
        <Bar dataKey="after" fill="#52c41a" name="优化后" />
        <Legend />
      </BarChart>
    </ResponsiveContainer>
  );

  // 代码复杂度树图
  const CodeComplexityChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <Treemap
        data={data.codeComplexity}
        dataKey="size"
        stroke="#fff"
        fill="#21d4fd"
        content={(props: any) => {
          const { depth, x, y, width, height, payload } = props;
          return (
            <g>
              <rect
                x={x}
                y={y}
                width={width}
                height={height}
                style={{
                  fill: payload.issues > 5 ? '#ff4d4f' : payload.issues > 2 ? '#faad14' : '#52c41a',
                  stroke: '#fff',
                  strokeWidth: 2 / (depth + 1e-10),
                  strokeOpacity: 1 / (depth + 1e-10),
                }}
              />
              {depth === 1 && (
                <text
                  x={x + width / 2}
                  y={y + height / 2 + 7}
                  textAnchor="middle"
                  fill="#fff"
                  fontSize={12}
                >
                  {payload.name}
                </text>
              )}
            </g>
          );
        }}
      />
    </ResponsiveContainer>
  );

  // 渲染选中的图表
  const renderChart = () => {
    switch (selectedChart) {
      case 'risk':
        return <RiskDistributionChart />;
      case 'category':
        return <CategoryAnalysisChart />;
      case 'timeline':
        return <TimelineChart />;
      case 'metrics':
        return <SecurityMetricsChart />;
      case 'gas':
        return <GasOptimizationChart />;
      case 'complexity':
        return <CodeComplexityChart />;
      default:
        return <RiskDistributionChart />;
    }
  };

  // 获取图表标题
  const getChartTitle = () => {
    switch (selectedChart) {
      case 'risk':
        return '风险分布';
      case 'category':
        return '分类分析';
      case 'timeline':
        return '时间趋势';
      case 'metrics':
        return '安全指标';
      case 'gas':
        return 'Gas优化';
      case 'complexity':
        return '代码复杂度';
      default:
        return '数据概览';
    }
  };

  // 计算统计数据
  const totalIssues = data.riskDistribution.reduce((sum, item) => sum + item.value, 0);
  const criticalIssues = data.riskDistribution.find(item => item.name === '严重')?.value || 0;
  const fixedIssues = data.categoryAnalysis.reduce((sum, item) => sum + item.fixed, 0);
  const avgSecurityScore = Math.round(
    data.securityMetrics.reduce((sum, item) => sum + item.score, 0) / data.securityMetrics.length
  );

  return (
    <Card 
      className="security-charts-card"
      title={
        <div className="charts-header">
          <div className="header-left">
            <BarChartOutlined className="charts-icon" />
            <div>安全分析图表</div>
          </div>
          <div className="header-controls">
            <Select
              value={selectedChart}
              onChange={setSelectedChart}
              className="chart-selector"
              size="small"
            >
              <Option value="risk">
                <PieChartOutlined /> 风险分布
              </Option>
              <Option value="category">
                <BarChartOutlined /> 分类分析
              </Option>
              <Option value="timeline">
                <LineChartOutlined /> 时间趋势
              </Option>
              <Option value="metrics">
                <RadarChartOutlined /> 安全指标
              </Option>
              <Option value="gas">
                <DashboardOutlined /> Gas优化
              </Option>
              <Option value="complexity">
                <BugOutlined /> 代码复杂度
              </Option>
            </Select>
          </div>
        </div>
      }
      loading={isLoading}
    >
      {/* 统计概览 */}
      <div className="charts-overview">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <div className="overview-stat">
              <Statistic
                title="总问题数"
                value={totalIssues}
                valueStyle={{ color: totalIssues > 0 ? '#ff4d4f' : '#52c41a' }}
                prefix={<BugOutlined />}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="overview-stat">
              <Statistic
                title="严重问题"
                value={criticalIssues}
                valueStyle={{ color: '#ff4d4f' }}
                prefix={<ExclamationCircleOutlined />}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="overview-stat">
              <Statistic
                title="已修复"
                value={fixedIssues}
                valueStyle={{ color: '#52c41a' }}
                prefix={<CheckCircleOutlined />}
              />
            </div>
          </Col>
          <Col xs={12} sm={6}>
            <div className="overview-stat">
              <Statistic
                title="安全评分"
                value={avgSecurityScore}
                suffix="/100"
                valueStyle={{ color: avgSecurityScore >= 80 ? '#52c41a' : avgSecurityScore >= 60 ? '#faad14' : '#ff4d4f' }}
                prefix={<TrophyOutlined />}
              />
            </div>
          </Col>
        </Row>
      </div>

      {/* 图表区域 */}
      <div className="chart-container">
        <div className="chart-header">
          <h4 className="chart-title">{getChartTitle()}</h4>
          <div className="chart-legend">
            {selectedChart === 'risk' && (
              <div className="legend-items">
                {data.riskDistribution.map((item, index) => (
                  <div key={`legend-${item.name}-${index}`} className="legend-item">
                    <div 
                      className="legend-color" 
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="legend-text">{item.name}</div>
                    <Tag className="legend-value">{item.value}</Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="chart-content">
          {renderChart()}
        </div>
      </div>

      {/* 图表说明 */}
      <div className="chart-insights">
        {selectedChart === 'risk' && (
          <div className="insight-section">
            <h5>关键洞察</h5>
            <ul>
              <li>
                <strong>风险分布:</strong> 
                {criticalIssues > 0 ? 
                  `发现 ${criticalIssues} 个严重安全问题，需要立即处理` : 
                  '未发现严重安全问题，整体风险可控'
                }
              </li>
              <li>
                <strong>修复建议:</strong> 
                优先处理高危和严重级别的安全问题，确保合约安全性
              </li>
            </ul>
          </div>
        )}
        
        {selectedChart === 'metrics' && (
          <div className="insight-section">
            <h5>安全指标分析</h5>
            <ul>
              <li>
                <strong>综合评分:</strong> 
                {avgSecurityScore >= 80 ? '安全性良好' : 
                 avgSecurityScore >= 60 ? '安全性一般，需要改进' : '安全性较差，需要重点关注'}
              </li>
              <li>
                <strong>改进方向:</strong> 
                重点关注评分较低的安全指标，制定针对性的改进计划
              </li>
            </ul>
          </div>
        )}
        
        {selectedChart === 'gas' && (
          <div className="insight-section">
            <h5>Gas优化效果</h5>
            <ul>
              <li>
                <strong>优化成果:</strong> 
                通过代码优化，平均节省了 
                {Math.round(
                  data.gasOptimization.reduce((sum, item) => sum + item.savings, 0) / 
                  data.gasOptimization.length
                )}% 的Gas消耗
              </li>
              <li>
                <strong>经济效益:</strong> 
                优化后的合约在执行时将显著降低用户的交易成本
              </li>
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SecurityCharts;
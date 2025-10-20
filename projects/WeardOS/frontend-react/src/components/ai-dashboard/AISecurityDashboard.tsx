import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Progress,
  Badge,
  Statistic,
  List,
  Tag,
  Timeline,
  Button,
  Space,
  Tooltip
} from 'antd';
import {
  SafetyOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  BugOutlined
} from '@ant-design/icons';
import './AISecurityDashboard.scss';

interface SecurityMetric {
  id: string;
  name: string;
  value: number;
  status: 'safe' | 'warning' | 'danger';
  description: string;
  lastUpdated: string;
}

interface SecurityAlert {
  id: string;
  type: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  timestamp: string;
  resolved: boolean;
}

interface AISecurityDashboardProps {
  className?: string;
}

const AISecurityDashboard: React.FC<AISecurityDashboardProps> = ({ className }) => {
  const [securityMetrics, setSecurityMetrics] = useState<SecurityMetric[]>([]);
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
  const [overallScore] = useState(85);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 模拟加载安全数据
    const loadSecurityData = async () => {
      setLoading(true);
      
      // 模拟API调用延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟安全指标数据
      const mockMetrics: SecurityMetric[] = [
        {
          id: 'contract-security',
          name: '智能合约安全',
          value: 92,
          status: 'safe',
          description: '合约代码已通过安全审计，无重大漏洞',
          lastUpdated: '2024-01-15 14:30:00'
        },
        {
          id: 'transaction-monitoring',
          name: '交易监控',
          value: 88,
          status: 'safe',
          description: '实时监控异常交易模式',
          lastUpdated: '2024-01-15 14:25:00'
        },
        {
          id: 'access-control',
          name: '访问控制',
          value: 75,
          status: 'warning',
          description: '部分权限配置需要优化',
          lastUpdated: '2024-01-15 14:20:00'
        },
        {
          id: 'data-privacy',
          name: '数据隐私',
          value: 95,
          status: 'safe',
          description: '用户数据加密存储，符合隐私标准',
          lastUpdated: '2024-01-15 14:15:00'
        }
      ];

      // 模拟安全警报数据
      const mockAlerts: SecurityAlert[] = [
        {
          id: 'alert-1',
          type: 'medium',
          title: '检测到异常交易模式',
          description: '在过去1小时内检测到3笔大额转账，建议进一步审查',
          timestamp: '2024-01-15 14:30:00',
          resolved: false
        },
        {
          id: 'alert-2',
          type: 'low',
          title: 'API访问频率异常',
          description: '某IP地址的API调用频率超过正常范围',
          timestamp: '2024-01-15 14:15:00',
          resolved: false
        },
        {
          id: 'alert-3',
          type: 'high',
          title: '权限配置更新',
          description: '管理员权限配置已更新，请确认变更',
          timestamp: '2024-01-15 13:45:00',
          resolved: true
        }
      ];

      setSecurityMetrics(mockMetrics);
      setSecurityAlerts(mockAlerts);
      setLoading(false);
    };

    loadSecurityData();
  }, []);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'safe': return '#52c41a';
      case 'warning': return '#faad14';
      case 'danger': return '#ff4d4f';
      default: return '#d9d9d9';
    }
  };

  // 获取警报颜色
  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'gold';
      case 'low': return 'blue';
      default: return 'default';
    }
  };

  return (
    <div className={`ai-security-dashboard ${className || ''}`}>
      {/* 总体安全评分 */}
      <Row gutter={[24, 24]} className="dashboard-header">
        <Col span={24}>
          <Card className="security-overview-card">
            <div className="security-overview">
              <div className="score-section">
                <div className="score-circle">
                  <Progress
                    type="circle"
                    percent={overallScore}
                    size={120}
                    strokeColor={{
                      '0%': '#21d4fd',
                      '100%': '#b721ff',
                    }}
                    format={(percent) => (
                      <div className="score-content">
                        <div className="score-number">{percent}</div>
                        <div className="score-label">安全评分</div>
                      </div>
                    )}
                  />
                </div>
                <div className="score-info">
                  <h3>AI安全防护系统</h3>
                  <p>基于AI算法的实时安全监控与威胁检测</p>
                  <div className="status-indicators">
                    <Badge status="success" text="系统正常运行" />
                    <Badge status="processing" text="实时监控中" />
                  </div>
                </div>
              </div>
              
              <div className="quick-stats">
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="今日检测"
                      value={1247}
                      prefix={<EyeOutlined />}
                      valueStyle={{ color: '#21d4fd' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="威胁拦截"
                      value={23}
                      prefix={<SafetyCertificateOutlined />}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="风险警报"
                      value={5}
                      prefix={<WarningOutlined />}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="系统响应"
                      value={0.8}
                      suffix="ms"
                      prefix={<ThunderboltOutlined />}
                      valueStyle={{ color: '#b721ff' }}
                    />
                  </Col>
                </Row>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 安全指标卡片 */}
      <Row gutter={[24, 24]} className="metrics-section">
        {securityMetrics.map((metric) => (
          <Col key={metric.id} xs={24} sm={12} lg={6}>
            <Card className="metric-card" loading={loading}>
              <div className="metric-header">
                <div className="metric-icon">
                  <SafetyOutlined style={{ color: getStatusColor(metric.status) }} />
                </div>
                <div className="metric-title">
                  <h4>{metric.name}</h4>
                  <Tooltip title={metric.description}>
                    <InfoCircleOutlined className="info-icon" />
                  </Tooltip>
                </div>
              </div>
              
              <div className="metric-content">
                <Progress
                  percent={metric.value}
                  strokeColor={getStatusColor(metric.status)}
                  showInfo={false}
                />
                <div className="metric-value">
                  <div className="value">{metric.value}%</div>
                  <Tag color={getStatusColor(metric.status)}>
                    {metric.status === 'safe' && '安全'}
                    {metric.status === 'warning' && '警告'}
                    {metric.status === 'danger' && '危险'}
                  </Tag>
                </div>
                <div className="metric-time">
                  更新时间: {metric.lastUpdated}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 安全警报和时间线 */}
      <Row gutter={[24, 24]} className="alerts-section">
        <Col xs={24} lg={12}>
          <Card title="安全警报" className="alerts-card">
            <div className="alerts-list">
              {securityAlerts.map((alert) => (
                <List.Item
                  key={alert.id}
                  className={`alert-item ${alert.resolved ? 'resolved' : ''}`}
                  style={{ marginBottom: 12 }}
                >
                  <div className="alert-header">
                    <div className="alert-title">{alert.title}</div>
                    <Tag color={getAlertColor(alert.type)}>{alert.type.toUpperCase()}</Tag>
                  </div>
                  <div className="alert-content">
                    <div className="alert-description">
                      {alert.description}
                    </div>
                    <div className="alert-footer">
                      <div className="alert-time">{alert.timestamp}</div>
                      {alert.resolved && (
                        <Tag color="green" icon={<CheckCircleOutlined />}>已解决</Tag>
                      )}
                    </div>
                  </div>
                </List.Item>
              ))}
            </div>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card title="安全事件时间线" className="timeline-card">
            <Timeline>
              <Timeline.Item color="green" dot={<CheckCircleOutlined />}>
                <div className="timeline-content">
                  <h5>系统安全扫描完成</h5>
                  <p>全面扫描完成，未发现安全漏洞</p>
                  <div className="timeline-time">14:30</div>
                </div>
              </Timeline.Item>
              <Timeline.Item color="blue" dot={<EyeOutlined />}>
                <div className="timeline-content">
                  <h5>异常交易监控</h5>
                  <p>检测到3笔大额转账，已标记为待审查</p>
                  <div className="timeline-time">14:15</div>
                </div>
              </Timeline.Item>
              <Timeline.Item color="orange" dot={<WarningOutlined />}>
                <div className="timeline-content">
                  <h5>权限配置更新</h5>
                  <p>管理员权限已更新，系统自动备份</p>
                  <div className="timeline-time">13:45</div>
                </div>
              </Timeline.Item>
              <Timeline.Item color="red" dot={<BugOutlined />}>
                <div className="timeline-content">
                  <h5>漏洞修复</h5>
                  <p>修复了一个中等级别的安全漏洞</p>
                  <div className="timeline-time">12:30</div>
                </div>
              </Timeline.Item>
            </Timeline>
          </Card>
        </Col>
      </Row>

      {/* 操作按钮 */}
      <Row gutter={[24, 24]} className="actions-section">
        <Col span={24}>
          <Card className="actions-card">
            <Space size="large">
              <Button type="primary" icon={<SafetyCertificateOutlined />} size="large">
                执行安全扫描
              </Button>
              <Button icon={<EyeOutlined />} size="large">
                查看详细报告
              </Button>
              <Button icon={<WarningOutlined />} size="large">
                配置警报规则
              </Button>
              <Button icon={<SafetyOutlined />} size="large">
                安全设置
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AISecurityDashboard;
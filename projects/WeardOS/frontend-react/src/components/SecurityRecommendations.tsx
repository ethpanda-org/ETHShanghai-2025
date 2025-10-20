// SecurityRecommendations.tsx
import React, { useState } from 'react';
import { 
  Card, 
  List, 
  Tag, 
  Button, 
  Collapse, 
  Steps, 
  Alert, 
  Tooltip, 
  Badge,
  Space,
  Progress,
  Typography
} from 'antd';
import { 
  ExclamationCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  ToolOutlined,
  CodeOutlined,
  LinkOutlined,
  ClockCircleOutlined,
  UserOutlined,
  DollarOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import './SecurityRecommendations.scss';

const { Panel } = Collapse;
const { Step } = Steps;
const { Text, Paragraph } = Typography;

// 风险等级枚举
export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

// 修复难度枚举
export enum FixDifficulty {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard'
}

// 修复步骤接口
export interface FixStep {
  id: string;
  title: string;
  description: string;
  codeExample?: string;
  estimatedTime?: number; // 预计时间（分钟）
  isCompleted?: boolean;
}

// 安全建议接口
export interface SecurityRecommendation {
  id: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  category: string;
  priority: number;
  difficulty: FixDifficulty;
  estimatedTime: number; // 预计修复时间（小时）
  estimatedCost?: number; // 预计成本（美元）
  impact: string;
  fixSteps: FixStep[];
  codeExample?: string;
  beforeCode?: string;
  afterCode?: string;
  references?: string[];
  tags?: string[];
  isImplemented?: boolean;
}

interface SecurityRecommendationsProps {
  recommendations: SecurityRecommendation[];
  onImplement?: (recommendationId: string) => void;
  onStepComplete?: (recommendationId: string, stepId: string) => void;
  isLoading?: boolean;
}

const SecurityRecommendations: React.FC<SecurityRecommendationsProps> = ({
  recommendations,
  onImplement,
  onStepComplete,
  isLoading = false
}) => {
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [filter, setFilter] = useState<RiskLevel | 'all'>('all');

  // 获取风险等级颜色
  const getRiskLevelColor = (level: RiskLevel): string => {
    switch (level) {
      case RiskLevel.CRITICAL:
        return '#ff4d4f';
      case RiskLevel.HIGH:
        return '#ff7a45';
      case RiskLevel.MEDIUM:
        return '#faad14';
      case RiskLevel.LOW:
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  };

  // 获取风险等级图标
  const getRiskLevelIcon = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.CRITICAL:
        return <ExclamationCircleOutlined />;
      case RiskLevel.HIGH:
        return <WarningOutlined />;
      case RiskLevel.MEDIUM:
        return <InfoCircleOutlined />;
      case RiskLevel.LOW:
        return <CheckCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  // 获取修复难度颜色
  const getDifficultyColor = (difficulty: FixDifficulty): string => {
    switch (difficulty) {
      case FixDifficulty.EASY:
        return '#52c41a';
      case FixDifficulty.MEDIUM:
        return '#faad14';
      case FixDifficulty.HARD:
        return '#ff4d4f';
      default:
        return '#d9d9d9';
    }
  };

  // 获取修复难度文本
  const getDifficultyText = (difficulty: FixDifficulty): string => {
    switch (difficulty) {
      case FixDifficulty.EASY:
        return '简单';
      case FixDifficulty.MEDIUM:
        return '中等';
      case FixDifficulty.HARD:
        return '困难';
      default:
        return '未知';
    }
  };

  // 过滤建议
  const filteredRecommendations = recommendations.filter(rec => 
    filter === 'all' || rec.riskLevel === filter
  );

  // 按风险等级分组
  const groupedRecommendations = filteredRecommendations.reduce((acc, rec) => {
    if (!acc[rec.riskLevel]) {
      acc[rec.riskLevel] = [];
    }
    acc[rec.riskLevel].push(rec);
    return acc;
  }, {} as Record<RiskLevel, SecurityRecommendation[]>);

  // 计算完成进度
  const getCompletionProgress = (recommendation: SecurityRecommendation): number => {
    if (recommendation.isImplemented) return 100;
    const completedSteps = recommendation.fixSteps.filter(step => step.isCompleted).length;
    return Math.round((completedSteps / recommendation.fixSteps.length) * 100);
  };

  // 处理步骤完成
  const handleStepComplete = (recommendationId: string, stepId: string) => {
    if (onStepComplete) {
      onStepComplete(recommendationId, stepId);
    }
  };

  // 处理实施建议
  const handleImplement = (recommendationId: string) => {
    if (onImplement) {
      onImplement(recommendationId);
    }
  };

  // 统计信息
  const stats = {
    total: recommendations.length,
    critical: recommendations.filter(r => r.riskLevel === RiskLevel.CRITICAL).length,
    high: recommendations.filter(r => r.riskLevel === RiskLevel.HIGH).length,
    medium: recommendations.filter(r => r.riskLevel === RiskLevel.MEDIUM).length,
    low: recommendations.filter(r => r.riskLevel === RiskLevel.LOW).length,
    implemented: recommendations.filter(r => r.isImplemented).length
  };

  return (
    <Card 
      className="security-recommendations-card"
      title={
        <div className="recommendations-header">
          <div className="header-left">
            <BulbOutlined className="recommendations-icon" />
            <span>安全修复建议</span>
            <Badge count={stats.total} className="total-badge" />
          </div>
          <div className="header-stats">
            <Space size="small">
              <Tag color="error">严重: {stats.critical}</Tag>
              <Tag color="warning">高危: {stats.high}</Tag>
              <Tag color="orange">中危: {stats.medium}</Tag>
              <Tag color="green">低危: {stats.low}</Tag>
              <Tag color="blue">已修复: {stats.implemented}</Tag>
            </Space>
          </div>
        </div>
      }
      loading={isLoading}
    >
      {/* 过滤器 */}
      <div className="filter-section">
        <Space wrap>
          <Button 
            type={filter === 'all' ? 'primary' : 'default'}
            onClick={() => setFilter('all')}
            size="small"
          >
            全部 ({stats.total})
          </Button>
          <Button 
            type={filter === RiskLevel.CRITICAL ? 'primary' : 'default'}
            onClick={() => setFilter(RiskLevel.CRITICAL)}
            size="small"
            danger={filter === RiskLevel.CRITICAL}
          >
            严重 ({stats.critical})
          </Button>
          <Button 
            type={filter === RiskLevel.HIGH ? 'primary' : 'default'}
            onClick={() => setFilter(RiskLevel.HIGH)}
            size="small"
          >
            高危 ({stats.high})
          </Button>
          <Button 
            type={filter === RiskLevel.MEDIUM ? 'primary' : 'default'}
            onClick={() => setFilter(RiskLevel.MEDIUM)}
            size="small"
          >
            中危 ({stats.medium})
          </Button>
          <Button 
            type={filter === RiskLevel.LOW ? 'primary' : 'default'}
            onClick={() => setFilter(RiskLevel.LOW)}
            size="small"
          >
            低危 ({stats.low})
          </Button>
        </Space>
      </div>

      {/* 建议列表 */}
      <div className="recommendations-list">
        {Object.entries(groupedRecommendations)
          .sort(([a], [b]) => {
            const order = [RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW];
            return order.indexOf(a as RiskLevel) - order.indexOf(b as RiskLevel);
          })
          .map(([level, recs]) => (
            <div key={level} className="risk-level-section">
              <div className="section-header">
                <Tag 
                  color={getRiskLevelColor(level as RiskLevel)}
                  icon={getRiskLevelIcon(level as RiskLevel)}
                  className="section-tag"
                >
                  {level.toUpperCase()} 风险 ({recs.length})
                </Tag>
              </div>

              <Collapse 
                activeKey={activeKeys}
                onChange={setActiveKeys}
                className="recommendations-collapse"
                ghost
              >
                {recs
                  .sort((a, b) => b.priority - a.priority)
                  .map((recommendation) => (
                    <Panel
                      key={recommendation.id}
                      header={
                        <div className="recommendation-header">
                          <div className="header-main">
                            <div className="title-section">
                              <h4 className="recommendation-title">
                                {recommendation.title}
                              </h4>
                              <div className="recommendation-meta">
                                <Tag className="category-tag">
                                  {recommendation.category}
                                </Tag>
                                <Tag 
                                  color={getDifficultyColor(recommendation.difficulty)}
                                  className="difficulty-tag"
                                >
                                  {getDifficultyText(recommendation.difficulty)}
                                </Tag>
                                {recommendation.tags?.map(tag => (
                                  <Tag key={tag} className="custom-tag">
                                    {tag}
                                  </Tag>
                                ))}
                              </div>
                            </div>
                            <div className="progress-section">
                              <Progress
                                percent={getCompletionProgress(recommendation)}
                                size="small"
                                status={recommendation.isImplemented ? 'success' : 'active'}
                                className="completion-progress"
                              />
                              <Text className="progress-text">
                                {getCompletionProgress(recommendation)}% 完成
                              </Text>
                            </div>
                          </div>
                          <div className="header-stats">
                            <Space size="small">
                              <Tooltip title="预计修复时间">
                                <Tag icon={<ClockCircleOutlined />} className="stat-tag">
                                  {recommendation.estimatedTime}h
                                </Tag>
                              </Tooltip>
                              {recommendation.estimatedCost && (
                                <Tooltip title="预计成本">
                                  <Tag icon={<DollarOutlined />} className="stat-tag">
                                    ${recommendation.estimatedCost}
                                  </Tag>
                                </Tooltip>
                              )}
                              <Tooltip title="优先级">
                                <Tag icon={<ThunderboltOutlined />} className="stat-tag">
                                  P{recommendation.priority}
                                </Tag>
                              </Tooltip>
                            </Space>
                          </div>
                        </div>
                      }
                      className={`recommendation-panel ${level}-risk ${recommendation.isImplemented ? 'implemented' : ''}`}
                    >
                      <div className="recommendation-content">
                        {/* 描述和影响 */}
                        <div className="description-section">
                          <Paragraph className="recommendation-description">
                            {recommendation.description}
                          </Paragraph>
                          
                          <Alert
                            message="安全影响"
                            description={recommendation.impact}
                            type="warning"
                            showIcon
                            className="impact-alert"
                          />
                        </div>

                        {/* 修复步骤 */}
                        <div className="fix-steps-section">
                          <h5 className="section-title">
                            <ToolOutlined /> 修复步骤
                          </h5>
                          
                          <Steps
                            direction="vertical"
                            size="small"
                            className="fix-steps"
                          >
                            {recommendation.fixSteps.map((step, _index) => (
                              <Step
                                key={step.id}
                                title={
                                  <div className="step-title">
                                    <span>{step.title}</span>
                                    {step.estimatedTime && (
                                      <Tag className="time-tag">
                                        ~{step.estimatedTime}min
                                      </Tag>
                                    )}
                                  </div>
                                }
                                description={
                                  <div className="step-content">
                                    <Paragraph className="step-description">
                                      {step.description}
                                    </Paragraph>
                                    
                                    {step.codeExample && (
                                      <div className="code-example">
                                        <Text strong>代码示例:</Text>
                                        <pre className="code-block">
                                          {step.codeExample}
                                        </pre>
                                      </div>
                                    )}
                                    
                                    <Button
                                      size="small"
                                      type={step.isCompleted ? 'default' : 'primary'}
                                      icon={step.isCompleted ? <CheckCircleOutlined /> : <ToolOutlined />}
                                      onClick={() => handleStepComplete(recommendation.id, step.id)}
                                      className="step-action-btn"
                                    >
                                      {step.isCompleted ? '已完成' : '标记完成'}
                                    </Button>
                                  </div>
                                }
                                status={step.isCompleted ? 'finish' : 'process'}
                                icon={step.isCompleted ? <CheckCircleOutlined /> : <ToolOutlined />}
                              />
                            ))}
                          </Steps>
                        </div>

                        {/* 代码对比 */}
                        {(recommendation.beforeCode || recommendation.afterCode) && (
                          <div className="code-comparison-section">
                            <h5 className="section-title">
                              <CodeOutlined /> 代码对比
                            </h5>
                            
                            <div className="code-comparison">
                              {recommendation.beforeCode && (
                                <div className="code-before">
                                  <Text strong className="code-label">修复前:</Text>
                                  <pre className="code-block before">
                                    {recommendation.beforeCode}
                                  </pre>
                                </div>
                              )}
                              
                              {recommendation.afterCode && (
                                <div className="code-after">
                                  <Text strong className="code-label">修复后:</Text>
                                  <pre className="code-block after">
                                    {recommendation.afterCode}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 参考资料 */}
                        {recommendation.references && recommendation.references.length > 0 && (
                          <div className="references-section">
                            <h5 className="section-title">
                              <LinkOutlined /> 参考资料
                            </h5>
                            
                            <List
                              size="small"
                              dataSource={recommendation.references}
                              renderItem={(reference, _index) => (
                                <List.Item>
                                  <a 
                                    href={reference} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="reference-link"
                                  >
                                    {reference}
                                  </a>
                                </List.Item>
                              )}
                              className="references-list"
                            />
                          </div>
                        )}

                        {/* 操作按钮 */}
                        <div className="recommendation-actions">
                          <Space>
                            <Button
                              type="primary"
                              icon={<CheckCircleOutlined />}
                              onClick={() => handleImplement(recommendation.id)}
                              disabled={recommendation.isImplemented}
                              className="implement-btn"
                            >
                              {recommendation.isImplemented ? '已实施' : '实施修复'}
                            </Button>
                            
                            <Button
                              type="default"
                              icon={<UserOutlined />}
                              className="assign-btn"
                            >
                              分配给开发者
                            </Button>
                          </Space>
                        </div>
                      </div>
                    </Panel>
                  ))}
              </Collapse>
            </div>
          ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <Alert
          message="暂无安全建议"
          description="当前筛选条件下没有找到相关的安全修复建议。"
          type="info"
          showIcon
          className="no-recommendations-alert"
        />
      )}
    </Card>
  );
};

export default SecurityRecommendations;
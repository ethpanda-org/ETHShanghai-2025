// SecurityReport.tsx
import React, { useState } from 'react';
import { Card, Row, Col, Progress, Tag, Collapse, Alert, Statistic, Badge, Tooltip, Button } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  BugOutlined, 
  SecurityScanOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  EyeOutlined,
  DownloadOutlined,
  ShareAltOutlined
} from '@ant-design/icons';
import './SecurityReport.scss';

const { Panel } = Collapse;

// 安全风险等级定义
export enum RiskLevel {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info'
}

// 漏洞类型定义
export interface Vulnerability {
  id: string;
  title: string;
  description: string;
  riskLevel: RiskLevel;
  category: string;
  location: {
    file?: string;
    line?: number;
    function?: string;
  };
  impact: string;
  recommendation: string;
  codeSnippet?: string;
  references?: string[];
  cvssScore?: number;
}

// 安全评分定义
export interface SecurityScore {
  overall: number;
  categories: {
    accessControl: number;
    inputValidation: number;
    businessLogic: number;
    cryptography: number;
    errorHandling: number;
    gasOptimization: number;
  };
}

// 报告统计信息
export interface ReportStats {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  infoIssues: number;
  linesAnalyzed: number;
  functionsAnalyzed: number;
  analysisTime: number;
}

interface SecurityReportProps {
  vulnerabilities: Vulnerability[];
  securityScore: SecurityScore;
  stats: ReportStats;
  contractAddress?: string;
  analysisDate: Date;
  isLoading?: boolean;
}

const SecurityReport: React.FC<SecurityReportProps> = ({
  vulnerabilities,
  securityScore,
  stats,
  contractAddress,
  analysisDate,
  isLoading = false
}) => {
  const [activeKey, setActiveKey] = useState<string[]>(['overview', 'vulnerabilities']);

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
      case RiskLevel.INFO:
        return '#1890ff';
      default:
        return '#d9d9d9';
    }
  };

  // 获取风险等级图标
  const getRiskLevelIcon = (level: RiskLevel) => {
    switch (level) {
      case RiskLevel.CRITICAL:
        return <CloseCircleOutlined />;
      case RiskLevel.HIGH:
        return <ExclamationCircleOutlined />;
      case RiskLevel.MEDIUM:
        return <WarningOutlined />;
      case RiskLevel.LOW:
        return <InfoCircleOutlined />;
      case RiskLevel.INFO:
        return <CheckCircleOutlined />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  // 获取安全评分颜色
  const getScoreColor = (score: number): string => {
    if (score >= 90) return '#52c41a';
    if (score >= 70) return '#faad14';
    if (score >= 50) return '#ff7a45';
    return '#ff4d4f';
  };

  // 按风险等级分组漏洞
  const groupedVulnerabilities = vulnerabilities.reduce((acc, vuln) => {
    if (!acc[vuln.riskLevel]) {
      acc[vuln.riskLevel] = [];
    }
    acc[vuln.riskLevel].push(vuln);
    return acc;
  }, {} as Record<RiskLevel, Vulnerability[]>);

  // 导出报告
  const handleExportReport = () => {
    // 实现报告导出逻辑
    console.log('Exporting security report...');
  };

  // 分享报告
  const handleShareReport = () => {
    // 实现报告分享逻辑
    console.log('Sharing security report...');
  };

  return (
    <Card 
      className="security-report-card"
      title={
        <div className="report-header">
          <div className="header-left">
            <SecurityScanOutlined className="report-icon" />
            <div>安全风险评估报告</div>
          </div>
          <div className="header-actions">
            <Button 
              type="text" 
              icon={<EyeOutlined />}
              className="action-btn"
            >
              预览
            </Button>
            <Button 
              type="text" 
              icon={<DownloadOutlined />}
              onClick={handleExportReport}
              className="action-btn"
            >
              导出
            </Button>
            <Button 
              type="text" 
              icon={<ShareAltOutlined />}
              onClick={handleShareReport}
              className="action-btn"
            >
              分享
            </Button>
          </div>
        </div>
      }
      loading={isLoading}
    >
      <Collapse 
        activeKey={activeKey}
        onChange={setActiveKey}
        className="report-collapse"
        ghost
      >
        {/* 报告概览 */}
        <Panel 
          header={
            <div className="panel-header">
              <CheckCircleOutlined className="panel-icon" />
              <div>报告概览</div>
              <Badge 
                count={stats.totalIssues} 
                className="issue-badge"
                style={{ backgroundColor: stats.criticalIssues > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </div>
          } 
          key="overview"
          className="overview-panel"
        >
          {/* 基本信息 */}
          <div className="report-meta">
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <div className="meta-item">
                  <div className="meta-label">合约地址:</div>
                  <div className="meta-value">{contractAddress || 'N/A'}</div>
                </div>
              </Col>
              <Col span={12}>
                <div className="meta-item">
                  <div className="meta-label">分析时间:</div>
                  <div className="meta-value">{analysisDate.toLocaleString()}</div>
                </div>
              </Col>
            </Row>
          </div>

          {/* 安全评分 */}
          <div className="security-score-section">
            <Row gutter={[24, 24]}>
              <Col xs={24} md={8}>
                <div className="overall-score">
                  <div className="score-circle">
                    <Progress
                      type="circle"
                      percent={securityScore.overall}
                      format={(percent) => `${percent}`}
                      strokeColor={getScoreColor(securityScore.overall)}
                      size={120}
                      strokeWidth={8}
                    />
                  </div>
                  <div className="score-label">
                    <h3>安全评分</h3>
                    <p>综合安全等级</p>
                  </div>
                </div>
              </Col>
              <Col xs={24} md={16}>
                <div className="category-scores">
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Statistic
                        title="访问控制"
                        value={securityScore.categories.accessControl}
                        suffix="/100"
                        valueStyle={{ color: getScoreColor(securityScore.categories.accessControl) }}
                      />
                      <Progress 
                        percent={securityScore.categories.accessControl} 
                        showInfo={false}
                        strokeColor={getScoreColor(securityScore.categories.accessControl)}
                        size="small"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="输入验证"
                        value={securityScore.categories.inputValidation}
                        suffix="/100"
                        valueStyle={{ color: getScoreColor(securityScore.categories.inputValidation) }}
                      />
                      <Progress 
                        percent={securityScore.categories.inputValidation} 
                        showInfo={false}
                        strokeColor={getScoreColor(securityScore.categories.inputValidation)}
                        size="small"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="业务逻辑"
                        value={securityScore.categories.businessLogic}
                        suffix="/100"
                        valueStyle={{ color: getScoreColor(securityScore.categories.businessLogic) }}
                      />
                      <Progress 
                        percent={securityScore.categories.businessLogic} 
                        showInfo={false}
                        strokeColor={getScoreColor(securityScore.categories.businessLogic)}
                        size="small"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="密码学"
                        value={securityScore.categories.cryptography}
                        suffix="/100"
                        valueStyle={{ color: getScoreColor(securityScore.categories.cryptography) }}
                      />
                      <Progress 
                        percent={securityScore.categories.cryptography} 
                        showInfo={false}
                        strokeColor={getScoreColor(securityScore.categories.cryptography)}
                        size="small"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="错误处理"
                        value={securityScore.categories.errorHandling}
                        suffix="/100"
                        valueStyle={{ color: getScoreColor(securityScore.categories.errorHandling) }}
                      />
                      <Progress 
                        percent={securityScore.categories.errorHandling} 
                        showInfo={false}
                        strokeColor={getScoreColor(securityScore.categories.errorHandling)}
                        size="small"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="Gas优化"
                        value={securityScore.categories.gasOptimization}
                        suffix="/100"
                        valueStyle={{ color: getScoreColor(securityScore.categories.gasOptimization) }}
                      />
                      <Progress 
                        percent={securityScore.categories.gasOptimization} 
                        showInfo={false}
                        strokeColor={getScoreColor(securityScore.categories.gasOptimization)}
                        size="small"
                      />
                    </Col>
                  </Row>
                </div>
              </Col>
            </Row>
          </div>

          {/* 统计信息 */}
          <div className="stats-section">
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="总问题数"
                  value={stats.totalIssues}
                  valueStyle={{ color: stats.totalIssues > 0 ? '#ff4d4f' : '#52c41a' }}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="严重问题"
                  value={stats.criticalIssues}
                  valueStyle={{ color: '#ff4d4f' }}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="高危问题"
                  value={stats.highIssues}
                  valueStyle={{ color: '#ff7a45' }}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="中危问题"
                  value={stats.mediumIssues}
                  valueStyle={{ color: '#faad14' }}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="代码行数"
                  value={stats.linesAnalyzed}
                  valueStyle={{ color: '#1890ff' }}
                />
              </Col>
              <Col xs={12} sm={8} md={4}>
                <Statistic
                  title="分析耗时"
                  value={stats.analysisTime}
                  suffix="s"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Col>
            </Row>
          </div>
        </Panel>

        {/* 漏洞详情 */}
        <Panel 
          header={
            <div className="panel-header">
              <BugOutlined className="panel-icon" />
              <div>安全漏洞详情</div>
              <div className="vulnerability-summary">
                {stats.criticalIssues > 0 && (
                  <Tag color="error" className="risk-tag">
                    严重: {stats.criticalIssues}
                  </Tag>
                )}
                {stats.highIssues > 0 && (
                  <Tag color="warning" className="risk-tag">
                    高危: {stats.highIssues}
                  </Tag>
                )}
                {stats.mediumIssues > 0 && (
                  <Tag color="orange" className="risk-tag">
                    中危: {stats.mediumIssues}
                  </Tag>
                )}
                {stats.lowIssues > 0 && (
                  <Tag color="green" className="risk-tag">
                    低危: {stats.lowIssues}
                  </Tag>
                )}
              </div>
            </div>
          } 
          key="vulnerabilities"
          className="vulnerabilities-panel"
        >
          {vulnerabilities.length === 0 ? (
            <Alert
              message="恭喜！"
              description="未发现安全漏洞，合约安全性良好。"
              type="success"
              showIcon
              className="no-vulnerabilities-alert"
            />
          ) : (
            <div className="vulnerabilities-list">
              {Object.entries(groupedVulnerabilities)
                .sort(([a], [b]) => {
                  const order = [RiskLevel.CRITICAL, RiskLevel.HIGH, RiskLevel.MEDIUM, RiskLevel.LOW, RiskLevel.INFO];
                  return order.indexOf(a as RiskLevel) - order.indexOf(b as RiskLevel);
                })
                .map(([level, vulns]) => (
                  <div key={level} className="risk-level-group">
                    <div className="risk-level-header">
                      <Tag 
                        color={getRiskLevelColor(level as RiskLevel)}
                        icon={getRiskLevelIcon(level as RiskLevel)}
                        className="risk-level-tag"
                      >
                        {level.toUpperCase()} ({vulns.length})
                      </Tag>
                    </div>
                    
                    {vulns.map((vuln) => (
                      <Card 
                        key={vuln.id}
                        className={`vulnerability-card ${level}-risk`}
                        size="small"
                      >
                        <div className="vulnerability-header">
                          <div className="vuln-title">
                            <h4>{vuln.title}</h4>
                            <Tag className="category-tag">{vuln.category}</Tag>
                            {vuln.cvssScore && (
                              <Tooltip title="CVSS评分">
                                <Tag color="blue">CVSS: {vuln.cvssScore}</Tag>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                        
                        <div className="vulnerability-content">
                          <p className="vuln-description">{vuln.description}</p>
                          
                          {vuln.location && (
                            <div className="vuln-location">
                              <strong>位置:</strong>
                              {vuln.location.file && <div> 文件: {vuln.location.file}</div>}
                              {vuln.location.line && <div> 行: {vuln.location.line}</div>}
                              {vuln.location.function && <div> 函数: {vuln.location.function}</div>}
                            </div>
                          )}
                          
                          <div className="vuln-impact">
                            <strong>影响:</strong>
                            <p>{vuln.impact}</p>
                          </div>
                          
                          <div className="vuln-recommendation">
                            <strong>修复建议:</strong>
                            <p>{vuln.recommendation}</p>
                          </div>
                          
                          {vuln.codeSnippet && (
                            <div className="vuln-code">
                              <strong>相关代码:</strong>
                              <pre className="code-snippet">{vuln.codeSnippet}</pre>
                            </div>
                          )}
                          
                          {vuln.references && vuln.references.length > 0 && (
                            <div className="vuln-references">
                              <strong>参考资料:</strong>
                              <ul>
                                {vuln.references.map((ref, index) => (
                        <li key={`ref-${vuln.id}-${index}-${ref.substring(0, 20)}`}>
                                    <a href={ref} target="_blank" rel="noopener noreferrer">
                                      {ref}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </Card>
                    ))}
                  </div>
                ))}
            </div>
          )}
        </Panel>
      </Collapse>
    </Card>
  );
};

export default SecurityReport;
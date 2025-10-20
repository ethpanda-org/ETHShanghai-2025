import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Progress, 
  Typography, 
  Space, 
  Spin,
  Statistic,
  Tag
} from 'antd';
import {
  LoadingOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  BarChartOutlined,
  FileTextOutlined,
  BugOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import './AnalysisProgress.scss';

const { Title, Text } = Typography;

interface AnalysisStep {
  id: string;
  title: string;
  description: string;
  status: 'waiting' | 'process' | 'finish' | 'error';
  progress: number;
  duration?: number;
  icon: React.ReactNode;
  details?: string[];
}

interface AnalysisProgressProps {
  isAnalyzing: boolean;
  currentStep?: number;
  steps?: AnalysisStep[];
  onComplete?: () => void;
}

const defaultSteps: AnalysisStep[] = [
  {
    id: 'parse',
    title: '代码解析',
    description: '解析智能合约源代码结构',
    status: 'waiting',
    progress: 0,
    icon: <FileTextOutlined />,
    details: ['语法分析', '结构解析', '依赖检测']
  },
  {
    id: 'static',
    title: '静态分析',
    description: '执行静态代码分析检查',
    status: 'waiting',
    progress: 0,
    icon: <SearchOutlined />,
    details: ['代码质量检查', '潜在漏洞扫描', '最佳实践验证']
  },
  {
    id: 'security',
    title: '安全审计',
    description: 'AI驱动的安全漏洞检测',
    status: 'waiting',
    progress: 0,
    icon: <SafetyCertificateOutlined />,
    details: ['重入攻击检测', '整数溢出检查', '访问控制验证', '逻辑漏洞分析']
  },
  {
    id: 'vulnerability',
    title: '漏洞扫描',
    description: '深度漏洞模式匹配',
    status: 'waiting',
    progress: 0,
    icon: <BugOutlined />,
    details: ['已知漏洞模式', 'CVE数据库匹配', '零日漏洞检测']
  },
  {
    id: 'risk',
    title: '风险评估',
    description: '综合风险等级评定',
    status: 'waiting',
    progress: 0,
    icon: <SafetyOutlined />,
    details: ['风险等级计算', '影响范围评估', '修复优先级排序']
  },
  {
    id: 'report',
    title: '生成报告',
    description: '生成详细分析报告',
    status: 'waiting',
    progress: 0,
    icon: <BarChartOutlined />,
    details: ['报告生成', '可视化图表', '修复建议整理']
  }
];

const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  isAnalyzing,
  steps = defaultSteps,
  onComplete
}) => {
  const [analysisSteps, setAnalysisSteps] = useState<AnalysisStep[]>(steps);
  const [overallProgress, setOverallProgress] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);

  // 模拟分析进度
  useEffect(() => {
    if (!isAnalyzing) {
      setAnalysisSteps(steps.map(step => ({ ...step, status: 'waiting', progress: 0 })));
      setOverallProgress(0);
      setStartTime(null);
      setElapsedTime(0);
      return;
    }

    setStartTime(new Date());
    
    const simulateProgress = () => {
      let stepIndex = 0;
      const totalSteps = steps.length;
      
      const updateStep = () => {
        if (stepIndex >= totalSteps) {
          onComplete?.();
          return;
        }

        const currentStepData = { ...steps[stepIndex] };
        let progress = 0;

        const progressInterval = setInterval(() => {
          progress += Math.random() * 15 + 5; // 随机增加5-20%
          
          if (progress >= 100) {
            progress = 100;
            currentStepData.status = 'finish';
            currentStepData.progress = 100;
            
            setAnalysisSteps(prev => 
              prev.map((step, index) => 
                index === stepIndex ? currentStepData : step
              )
            );
            
            clearInterval(progressInterval);
            stepIndex++;
            
            // 更新整体进度
            const newOverallProgress = ((stepIndex) / totalSteps) * 100;
            setOverallProgress(newOverallProgress);
            
            // 延迟后开始下一步
            setTimeout(updateStep, 500);
          } else {
            currentStepData.status = 'process';
            currentStepData.progress = progress;
            
            setAnalysisSteps(prev => 
              prev.map((step, index) => 
                index === stepIndex ? currentStepData : step
              )
            );
          }
        }, 800 + Math.random() * 400); // 随机间隔800-1200ms
      };

      updateStep();
    };

    simulateProgress();
  }, [isAnalyzing, steps, onComplete]);

  // 计算经过时间
  useEffect(() => {
    if (!startTime || !isAnalyzing) return;

    const timer = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, isAnalyzing]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentStepIndex = () => {
    return analysisSteps.findIndex(step => step.status === 'process');
  };

  const getCompletedSteps = () => {
    return analysisSteps.filter(step => step.status === 'finish').length;
  };

  return (
    <Card 
      className="analysis-progress-card"
      title={
        <Space>
          <RobotOutlined className="progress-icon" />
          <div>AI 分析进度</div>
          {isAnalyzing && <Spin indicator={<LoadingOutlined spin />} />}
        </Space>
      }
    >
      {/* 整体进度统计 */}
      <div className="progress-stats">
        <div className="stats-row">
          <Statistic
            title="整体进度"
            value={overallProgress}
            precision={1}
            suffix="%"
            className="overall-progress-stat"
          />
          <Statistic
            title="已完成步骤"
            value={getCompletedSteps()}
            suffix={`/ ${analysisSteps.length}`}
            className="completed-steps-stat"
          />
          <Statistic
            title="用时"
            value={formatTime(elapsedTime)}
            className="elapsed-time-stat"
          />
        </div>
        
        <Progress
          percent={overallProgress}
          strokeColor={{
            '0%': '#21d4fd',
            '100%': '#b721ff',
          }}
          trailColor="rgba(255, 255, 255, 0.1)"
          className="overall-progress-bar"
        />
      </div>

      {/* 详细步骤进度 */}
      <div className="steps-container">
        <Title level={5} className="steps-title">分析步骤</Title>
        
        <div className="steps-list">
          {analysisSteps.map((step, index) => (
            <div 
              key={step.id} 
              className={`step-item ${step.status} ${getCurrentStepIndex() === index ? 'current' : ''}`}
            >
              <div className="step-header">
                <div className="step-icon-wrapper">
                  {step.status === 'finish' ? (
                    <CheckCircleOutlined className="step-icon success" />
                  ) : step.status === 'process' ? (
                    <Spin indicator={<LoadingOutlined spin />} className="step-icon processing" />
                  ) : (
                    <div className="step-icon waiting">{step.icon}</div>
                  )}
                </div>
                
                <div className="step-content">
                  <div className="step-title-row">
                    <Title level={5} className="step-title">{step.title}</Title>
                    <Tag 
                      color={
                        step.status === 'finish' ? 'success' :
                        step.status === 'process' ? 'processing' :
                        'default'
                      }
                      className="step-status-tag"
                    >
                      {step.status === 'finish' ? '已完成' :
                       step.status === 'process' ? '进行中' :
                       '等待中'}
                    </Tag>
                  </div>
                  
                  <Text className="step-description">{step.description}</Text>
                  
                  {step.status === 'process' && (
                    <Progress
                      percent={step.progress}
                      size="small"
                      strokeColor="#21d4fd"
                      trailColor="rgba(255, 255, 255, 0.1)"
                      className="step-progress"
                    />
                  )}
                  
                  {step.details && step.status !== 'waiting' && (
                    <div className="step-details">
                      {step.details.map((detail, detailIndex) => {
                        const detailKey = `${step.id}-detail-${detail.replace(/\s/g, '')}-${detailIndex}`;
                        return (
                          <Tag 
                            key={detailKey}
                            className={`detail-tag ${
                              step.status === 'finish' ? 'completed' :
                              step.status === 'process' && detailIndex <= (step.progress / 100) * step.details!.length ? 'active' :
                              'inactive'
                            }`}
                          >
                            {detail}
                          </Tag>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分析状态信息 */}
      {isAnalyzing && (
        <div className="analysis-status">
          <div className="status-indicator">
            <div className="pulse-dot"></div>
            <Text className="status-text">
              AI 正在深度分析合约安全性...
            </Text>
          </div>
        </div>
      )}
    </Card>
  );
};

export default AnalysisProgress;
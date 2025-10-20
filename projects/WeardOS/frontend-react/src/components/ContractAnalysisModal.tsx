import React, { useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Button,
  Select,
  Card,
  Typography,
  Space,
  Tag,
  Divider,
  Alert,
  Spin,
  Row,
  Col,
  Statistic,
  Progress,
  Descriptions,
  message,
  Tooltip,
  Badge
} from 'antd';
import {
  SecurityScanOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LinkOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CodeOutlined,
  SafetyOutlined,
  SwapOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Text, Paragraph } = Typography;
const { Option } = Select;

interface ContractAnalysisModalProps {
  visible: boolean;
  onClose: () => void;
}

interface AnalysisResult {
  address: string;
  network: string;
  isContract: boolean;
  contractType: string;
  verified: boolean;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  riskScore: number;
  summary: string;
  recommendations: string[];
  chainData: {
    balance: string;
    txCount: number;
    bytecodeLength: number;
    isActive: boolean;
    lastActivity?: string;
  };
  analysis: {
    securityFeatures: string[];
    riskFactors: string[];
    functionalityAnalysis: string;
    codeQuality: string;
  };
  timestamp: string;
}

const ContractAnalysisModal: React.FC<ContractAnalysisModalProps> = ({
  visible,
  onClose
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [quickCheckLoading, setQuickCheckLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [quickCheckResult, setQuickCheckResult] = useState<any>(null);

  // 重置状态
  const resetState = () => {
    setAnalysisResult(null);
    setQuickCheckResult(null);
    form.resetFields();
  };

  // 处理模态框关闭
  const handleCancel = () => {
    resetState();
    onClose();
  };

  // 验证以太坊地址格式
  const validateEthereumAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // 快速风险检查
  const handleQuickCheck = async () => {
    try {
      const values = await form.validateFields(['address', 'network']);
      const { address, network } = values;

      if (!validateEthereumAddress(address)) {
        message.error('请输入有效的以太坊地址格式');
        return;
      }

      setQuickCheckLoading(true);
      const response = await api.quickRiskCheck(address, network);
      
      if (response.success) {
        setQuickCheckResult(response.data);
        message.success('快速风险检查完成');
      } else {
        message.error(response.message || '快速检查失败');
      }
    } catch (error: any) {
      console.error('快速检查失败:', error);
      message.error(error.message || '快速检查失败');
    } finally {
      setQuickCheckLoading(false);
    }
  };

  // 完整合约分析
  const handleAnalyze = async () => {
    try {
      const values = await form.validateFields();
      const { address, network, userRequest } = values;

      if (!validateEthereumAddress(address)) {
        message.error('请输入有效的以太坊地址格式');
        return;
      }

      setLoading(true);
      const response = await api.analyzeContract(address, network, userRequest);
      
      if (response.success) {
        setAnalysisResult(response.data);
        message.success('合约分析完成');
      } else {
        message.error(response.message || '分析失败');
      }
    } catch (error: any) {
      console.error('合约分析失败:', error);
      message.error(error.message || '合约分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取风险等级颜色
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return '#ff4d4f';
      case 'MEDIUM': return '#faad14';
      case 'LOW': return '#52c41a';
      default: return '#d9d9d9';
    }
  };

  // 获取风险等级图标
  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'HIGH': return <ExclamationCircleOutlined />;
      case 'MEDIUM': return <WarningOutlined />;
      case 'LOW': return <CheckCircleOutlined />;
      default: return <InfoCircleOutlined />;
    }
  };

  return (
    <Modal
      title={
        <Space>
          <SecurityScanOutlined />
          智能合约分析
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={1000}
      footer={null}
      destroyOnHidden
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* 输入表单 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form
            form={form}
            layout="vertical"
            initialValues={{ network: 'holesky' }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="address"
                  label="合约地址"
                  rules={[
                    { required: true, message: '请输入合约地址' },
                    {
                      validator: (_, value) => {
                        if (!value || validateEthereumAddress(value)) {
                          return Promise.resolve();
                        }
                        return Promise.reject(new Error('请输入有效的以太坊地址格式'));
                      }
                    }
                  ]}
                >
                  <Input
                    placeholder="0x..."
                    prefix={<LinkOutlined />}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="network"
                  label="网络"
                  rules={[{ required: true, message: '请选择网络' }]}
                >
                  <Select>
                    <Option value="holesky">Holesky 测试网</Option>
                    <Option value="mainnet">以太坊主网</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            
            <Form.Item
              name="userRequest"
              label={
                <Space>
                  特殊需求
                  <Tooltip title="可选：描述您想了解的特定方面，如安全性、功能性等">
                    <InfoCircleOutlined />
                  </Tooltip>
                </Space>
              }
            >
              <Input.TextArea
                placeholder="例如：重点分析安全风险、检查是否为代理合约等..."
                rows={2}
              />
            </Form.Item>

            <Space>
              <Button
                type="default"
                icon={<SafetyOutlined />}
                onClick={handleQuickCheck}
                loading={quickCheckLoading}
              >
                快速检查
              </Button>
              <Button
                type="primary"
                icon={<SecurityScanOutlined />}
                onClick={handleAnalyze}
                loading={loading}
              >
                完整分析
              </Button>
            </Space>
          </Form>
        </Card>

        {/* 快速检查结果 */}
        {quickCheckResult && (
          <Card 
            size="small" 
            title={
              <Space>
                <SafetyOutlined />
                快速风险检查结果
              </Space>
            }
            style={{ marginBottom: 16 }}
          >
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="风险等级"
                  value={quickCheckResult.riskLevel}
                  valueStyle={{ color: getRiskColor(quickCheckResult.riskLevel) }}
                  prefix={getRiskIcon(quickCheckResult.riskLevel)}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="合约类型"
                  value={quickCheckResult.isContract ? quickCheckResult.contractType : '外部账户'}
                  prefix={<CodeOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="验证状态"
                  value={quickCheckResult.verified ? '已验证' : '未验证'}
                  valueStyle={{ 
                    color: quickCheckResult.verified ? '#52c41a' : '#faad14' 
                  }}
                  prefix={quickCheckResult.verified ? <CheckCircleOutlined /> : <WarningOutlined />}
                />
              </Col>
            </Row>

            {quickCheckResult.riskFactors && quickCheckResult.riskFactors.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Text strong>风险因素：</Text>
                <div style={{ marginTop: 8 }}>
                  {quickCheckResult.riskFactors.map((factor: string, index: number) => (
                    <Tag key={index} color="orange" style={{ marginBottom: 4 }}>
                      {factor}
                    </Tag>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* 完整分析结果 */}
        {analysisResult && (
          <div>
            {/* 概览信息 */}
            <Card 
              size="small" 
              title={
                <Space>
                  <SecurityScanOutlined />
                  分析概览
                  <Badge 
                    status={analysisResult.riskLevel === 'LOW' ? 'success' : 
                           analysisResult.riskLevel === 'MEDIUM' ? 'warning' : 'error'} 
                    text={`风险等级: ${analysisResult.riskLevel}`}
                  />
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="风险评分"
                    value={analysisResult.riskScore}
                    suffix="/ 100"
                    valueStyle={{ color: getRiskColor(analysisResult.riskLevel) }}
                  />
                  <Progress 
                    percent={analysisResult.riskScore} 
                    strokeColor={getRiskColor(analysisResult.riskLevel)}
                    size="small"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="交易数量"
                    value={analysisResult.chainData.txCount}
                    prefix={<SwapOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="余额"
                    value={parseFloat(analysisResult.chainData.balance)}
                    precision={4}
                    suffix="ETH"
                    prefix={<DollarOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="代码大小"
                    value={analysisResult.chainData.bytecodeLength}
                    suffix="bytes"
                    prefix={<CodeOutlined />}
                  />
                </Col>
              </Row>

              <Divider />

              <Alert
                message="AI 分析摘要"
                description={analysisResult.summary}
                type={analysisResult.riskLevel === 'LOW' ? 'success' : 
                      analysisResult.riskLevel === 'MEDIUM' ? 'warning' : 'error'}
                showIcon
                style={{ marginBottom: 16 }}
              />
            </Card>

            {/* 详细分析 */}
            <Card 
              size="small" 
              title={
                <Space>
                  <InfoCircleOutlined />
                  详细分析
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="合约地址">
                  <Text code copyable>{analysisResult.address}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="网络">
                  <Tag color="blue">{analysisResult.network}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="合约类型">
                  <Tag color="purple">{analysisResult.contractType}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="验证状态">
                  <Tag color={analysisResult.verified ? 'green' : 'orange'}>
                    {analysisResult.verified ? '已验证' : '未验证'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="活跃状态">
                  <Tag color={analysisResult.chainData.isActive ? 'green' : 'red'}>
                    {analysisResult.chainData.isActive ? '活跃' : '非活跃'}
                  </Tag>
                </Descriptions.Item>
                {analysisResult.chainData.lastActivity && (
                  <Descriptions.Item label="最后活动">
                    <Space>
                      <ClockCircleOutlined />
                      {new Date(analysisResult.chainData.lastActivity).toLocaleString()}
                    </Space>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>

            {/* 安全特性和风险因素 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card 
                  size="small" 
                  title={
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      安全特性
                    </Space>
                  }
                >
                  {analysisResult.analysis.securityFeatures.map((feature, index) => (
                    <Tag key={index} color="green" style={{ marginBottom: 4 }}>
                      {feature}
                    </Tag>
                  ))}
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  size="small" 
                  title={
                    <Space>
                      <WarningOutlined style={{ color: '#faad14' }} />
                      风险因素
                    </Space>
                  }
                >
                  {analysisResult.analysis.riskFactors.map((risk, index) => (
                    <Tag key={index} color="red" style={{ marginBottom: 4 }}>
                      {risk}
                    </Tag>
                  ))}
                </Card>
              </Col>
            </Row>

            {/* 功能分析和代码质量 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card 
                  size="small" 
                  title="功能分析"
                >
                  <Paragraph style={{ fontSize: '14px' }}>
                    {analysisResult.analysis.functionalityAnalysis}
                  </Paragraph>
                </Card>
              </Col>
              <Col span={12}>
                <Card 
                  size="small" 
                  title="代码质量"
                >
                  <Paragraph style={{ fontSize: '14px' }}>
                    {analysisResult.analysis.codeQuality}
                  </Paragraph>
                </Card>
              </Col>
            </Row>

            {/* 建议 */}
            <Card 
              size="small" 
              title={
                <Space>
                  <InfoCircleOutlined />
                  安全建议
                </Space>
              }
            >
              <ul>
                {analysisResult.recommendations.map((recommendation, index) => (
                  <li key={index} style={{ marginBottom: 8 }}>
                    <Text>{recommendation}</Text>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text>正在进行深度分析，请稍候...</Text>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ContractAnalysisModal;
import React, { useState } from 'react';
import { 
  Card, 
  Upload, 
  Input, 
  Button, 
  Tabs, 
  Space, 
  Typography, 
  message,
  Divider,
  Tag
} from 'antd';
import {
  UploadOutlined,
  LinkOutlined,
  FileTextOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import type { UploadProps, UploadFile } from 'antd';
import './ContractUpload.scss';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { TextArea } = Input;

interface ContractUploadProps {
  onContractSubmit: (data: ContractData) => void;
  loading?: boolean;
}

interface ContractData {
  type: 'address' | 'file' | 'code';
  address?: string;
  file?: File;
  code?: string;
  fileName?: string;
}

const ContractUpload: React.FC<ContractUploadProps> = ({ onContractSubmit, loading = false }) => {
  const [activeTab, setActiveTab] = useState<string>('address');
  const [contractAddress, setContractAddress] = useState('');
  const [contractCode, setContractCode] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);

  // 处理地址输入提交
  const handleAddressSubmit = () => {
    if (!contractAddress.trim()) {
      message.error('请输入合约地址');
      return;
    }
    
    if (!contractAddress.startsWith('0x') || contractAddress.length !== 42) {
      message.error('请输入有效的以太坊合约地址');
      return;
    }

    onContractSubmit({
      type: 'address',
      address: contractAddress.trim()
    });
  };

  // 处理代码提交
  const handleCodeSubmit = () => {
    if (!contractCode.trim()) {
      message.error('请输入合约代码');
      return;
    }

    onContractSubmit({
      type: 'code',
      code: contractCode.trim()
    });
  };

  // 处理文件上传
  const handleFileUpload: UploadProps['customRequest'] = (options) => {
    const { file, onSuccess, onError } = options;
    
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onContractSubmit({
          type: 'file',
          file: file as File,
          code: content,
          fileName: (file as File).name
        });
        setUploadedFile(file as UploadFile);
        onSuccess?.(file);
      };
      reader.readAsText(file as File);
    } catch (error) {
      onError?.(error as Error);
      message.error('文件读取失败');
    }
  };

  const uploadProps: UploadProps = {
    name: 'contract',
    accept: '.sol,.txt,.js,.ts',
    showUploadList: false,
    customRequest: handleFileUpload,
    beforeUpload: (file) => {
      const isValidType = file.name.endsWith('.sol') || 
                         file.name.endsWith('.txt') || 
                         file.name.endsWith('.js') || 
                         file.name.endsWith('.ts');
      
      if (!isValidType) {
        message.error('只支持 .sol, .txt, .js, .ts 格式的文件');
        return false;
      }

      const isLt10M = file.size / 1024 / 1024 < 10;
      if (!isLt10M) {
        message.error('文件大小不能超过 10MB');
        return false;
      }

      return true;
    },
  };

  // 示例合约地址
  const exampleAddresses = [
    { name: 'Uniswap V3 Router', address: '0xE592427A0AEce92De3Edee1F18E0157C05861564' },
    { name: 'USDC Token', address: '0xA0b86a33E6441e6e80D0c4C6C7527d72e1d0c4C6' },
    { name: 'Compound cDAI', address: '0x5d3a536E4D6DbD6114cc1Ead35777bAB948E3643' }
  ];

  return (
    <Card className="contract-upload-card" title={
      <Space>
        <CloudUploadOutlined className="upload-icon" />
        <span>合约上传</span>
      </Space>
    }>
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        className="upload-tabs"
      >
        {/* 合约地址输入 */}
        <TabPane 
          tab={
            <Space>
              <LinkOutlined />
              合约地址
            </Space>
          } 
          key="address"
        >
          <div className="upload-content">
            <div className="input-section">
              <Title level={5}>输入合约地址</Title>
              <Text type="secondary">
                输入已部署的智能合约地址，系统将自动获取合约源码进行分析
              </Text>
              
              <div className="address-input-group">
                <Input
                  size="large"
                  placeholder="0x..."
                  value={contractAddress}
                  onChange={(e) => setContractAddress(e.target.value)}
                  prefix={<LinkOutlined />}
                  className="address-input"
                />
                <Button
                  type="primary"
                  size="large"
                  onClick={handleAddressSubmit}
                  loading={loading}
                  disabled={!contractAddress.trim()}
                  className="submit-button"
                >
                  开始分析
                </Button>
              </div>

              <Divider orientation="left">示例地址</Divider>
              <div className="example-addresses">
                {exampleAddresses.map((example, index) => (
                  <Tag
                    key={`example-${example.name}-${index}`}
                    className="example-tag"
                    onClick={() => setContractAddress(example.address)}
                  >
                    {example.name}
                  </Tag>
                ))}
              </div>
            </div>
          </div>
        </TabPane>

        {/* 文件上传 */}
        <TabPane 
          tab={
            <Space>
              <UploadOutlined />
              文件上传
            </Space>
          } 
          key="file"
        >
          <div className="upload-content">
            <div className="file-upload-section">
              <Title level={5}>上传合约文件</Title>
              <Text type="secondary">
                支持 .sol, .txt, .js, .ts 格式的智能合约文件
              </Text>

              <div className="upload-area">
                <Upload.Dragger {...uploadProps} className="contract-uploader">
                  <div className="upload-content-inner">
                    <CloudUploadOutlined className="upload-icon-large" />
                    <Title level={4} className="upload-title">
                      点击或拖拽文件到此区域上传
                    </Title>
                    <Text className="upload-hint">
                      支持单个文件上传，文件大小不超过 10MB
                    </Text>
                    <div className="supported-formats">
                      <Tag>.sol</Tag>
                      <Tag>.txt</Tag>
                      <Tag>.js</Tag>
                      <Tag>.ts</Tag>
                    </div>
                  </div>
                </Upload.Dragger>

                {uploadedFile && (
                  <div className="uploaded-file-info">
                    <CheckCircleOutlined className="success-icon" />
                    <span>已上传: {uploadedFile.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabPane>

        {/* 代码输入 */}
        <TabPane 
          tab={
            <Space>
              <FileTextOutlined />
              代码输入
            </Space>
          } 
          key="code"
        >
          <div className="upload-content">
            <div className="code-input-section">
              <Title level={5}>直接输入合约代码</Title>
              <Text type="secondary">
                粘贴您的智能合约源代码进行分析
              </Text>

              <TextArea
                rows={12}
                placeholder="pragma solidity ^0.8.0;

contract MyContract {
    // 在此输入您的合约代码
}"
                value={contractCode}
                onChange={(e) => setContractCode(e.target.value)}
                className="code-textarea"
              />

              <div className="code-submit-area">
                <Button
                  type="primary"
                  size="large"
                  onClick={handleCodeSubmit}
                  loading={loading}
                  disabled={!contractCode.trim()}
                  className="submit-button"
                >
                  开始分析
                </Button>
              </div>
            </div>
          </div>
        </TabPane>
      </Tabs>
    </Card>
  );
};

export default ContractUpload;
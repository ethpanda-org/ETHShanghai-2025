import React, { useState, useRef, useEffect } from 'react';
import { 
  Input, 
  Button, 
  List, 
  Avatar, 
  Typography, 
  Empty,
  Tooltip,
  App
} from 'antd';
import { useTranslation } from 'react-i18next';
import {
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  CopyOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { api } from '../services/api';
import './ChatWindow.scss';

const { TextArea } = Input;
const { Text, Title } = Typography;

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatConversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: string;
  messages: ChatMessage[];
}

interface ChatWindowProps {
  conversation?: ChatConversation;
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  onContractAnalysis?: (address?: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onSendMessage,
  isConnected
}) => {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [inputValue, setInputValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<any>(null);

  // 以太坊地址检测函数
  const isEthereumAddress = (text: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(text.trim());
  };

  // 合约分析函数
  const analyzeContractAddress = async (address: string): Promise<string> => {
    try {
      const response = await api.analyzeContract(
        address.trim(),
        'holesky',
        '请分析这个地址的安全性和功能'
      );

      if (response.success) {
        const result = response.data;
        
        // 格式化分析结果为自然语言报告
        let report = `🔍 **检测到以太坊地址，已为您完成分析**\n\n`;
        report += `**地址**: \`${result.address}\`\n`;
        report += `**网络**: ${result.network}\n`;
        report += `**类型**: ${result.isContract ? '智能合约' : '外部账户 (EOA)'}\n`;
        report += `**风险等级**: ${result.riskLevel}\n\n`;
        
        if (result.summary) {
          report += `**AI 分析摘要**:\n${result.summary}\n\n`;
        }
        
        if (result.chainData) {
          report += `**链上数据**:\n`;
          report += `- 余额: ${result.chainData.balance} ETH\n`;
          report += `- 交易数量: ${result.chainData.txCount}\n`;
          if (result.isContract) {
            report += `- 字节码长度: ${result.chainData.bytecodeLength} bytes\n`;
          }
          report += `- 活跃状态: ${result.chainData.isActive ? '活跃' : '非活跃'}\n\n`;
        }
        
        if (result.analysis) {
          if (result.analysis.securityFeatures && result.analysis.securityFeatures.length > 0) {
            report += `**安全特性**:\n`;
            result.analysis.securityFeatures.forEach((feature: string) => {
              report += `- ✅ ${feature}\n`;
            });
            report += `\n`;
          }
          
          if (result.analysis.riskFactors && result.analysis.riskFactors.length > 0) {
            report += `**风险因素**:\n`;
            result.analysis.riskFactors.forEach((risk: string) => {
              report += `- ⚠️ ${risk}\n`;
            });
            report += `\n`;
          }
        }
        
        if (result.recommendations && result.recommendations.length > 0) {
          report += `**安全建议**:\n`;
          result.recommendations.forEach((rec: string) => {
            report += `- 💡 ${rec}\n`;
          });
        }
        
        return report;
      } else {
        return `❌ 分析失败: ${response.message || '未知错误'}`;
      }
    } catch (error: any) {
      console.error('合约分析失败:', error);
      return `❌ 分析失败: ${error.response?.data?.message || error.message || '网络错误'}`;
    }
  };

  // 自动滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation?.messages]);

  // 发送消息 - 增强版，支持自动合约分析
  const handleSend = async () => {
    if (!inputValue.trim() || !isConnected) {
      if (!isConnected) {
        message.error(t('chat.messages.connectionFailed'));
      }
      return;
    }

    const userInput = inputValue.trim();
    
    // 检测是否为以太坊地址
    if (isEthereumAddress(userInput)) {
      // 先发送用户输入的地址
      onSendMessage(userInput);
      setInputValue('');
      
      // 显示分析中的提示
      message.loading('正在分析合约地址...', 0);
      
      try {
        // 自动进行合约分析
        const analysisResult = await analyzeContractAddress(userInput);
        
        // 隐藏加载提示
        message.destroy();
        
        // 发送分析结果作为AI回复
        onSendMessage(analysisResult);
      } catch (error) {
        message.destroy();
        message.error('合约分析失败，请稍后重试');
      }
    } else {
      // 普通消息处理
      onSendMessage(userInput);
      setInputValue('');
    }
    
    // 聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  // 复制消息内容
  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content).then(() => {
      message.success(t('chat.messages.copied'));
    }).catch(() => {
      message.error(t('chat.messages.copyFailed'));
    });
  };

  // 重新生成回复
  const regenerateResponse = (messageIndex: number) => {
    if (!conversation) return;
    
    // 找到用户消息
    const userMessage = conversation.messages[messageIndex - 1];
    if (userMessage && userMessage.role === 'user') {
      onSendMessage(userMessage.content);
    }
  };

  // 渲染消息内容
  const renderMessageContent = (message: ChatMessage) => {
    return (
      <div className={`message-text ${message.role === 'assistant' ? 'assistant-message' : ''}`}>
        <ReactMarkdown
          components={{
            code({ className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '');
              const isInline = !match;
              
              return !isInline && match ? (
                <SyntaxHighlighter
                  style={oneDark as any}
                  language={match[1]}
                  PreTag="div"
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {message.content}
        </ReactMarkdown>
        
        {message.isStreaming && (
          <span className="streaming-cursor">▊</span>
        )}
      </div>
    );
  };

  // 渲染消息项
  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    const isLastAssistantMessage = 
      !isUser && 
      index === (conversation?.messages.length || 0) - 1;

    return (
      <div
        key={message.id}
        className={`message-item ${isUser ? 'user' : 'assistant'}`}
      >
        <div className="message-avatar">
          <Avatar
            icon={isUser ? <UserOutlined /> : <RobotOutlined />}
            className={isUser ? 'user-avatar' : 'assistant-avatar'}
          />
        </div>
        
        <div className="message-content">
          <div className="message-header">
            <Text strong className="message-sender">
              {isUser ? t('chat.messages.you') : t('chat.messages.assistant')}
            </Text>
            <Text type="secondary" className="message-time">
              {new Date(message.timestamp).toLocaleTimeString()}
            </Text>
          </div>
          
          {renderMessageContent(message)}
          
          {!isUser && (
            <div className="message-actions">
              <Tooltip title={t('chat.copy')}>
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyMessage(message.content)}
                />
              </Tooltip>
              
              {isLastAssistantMessage && !message.isStreaming && (
                <Tooltip title={t('chat.regenerate')}>
                  <Button
                    type="text"
                    size="small"
                    icon={<ReloadOutlined />}
                    onClick={() => regenerateResponse(index)}
                  />
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  // 如果没有对话
  if (!conversation) {
    return (
      <div className="chat-window">
        <div className="chat-empty">
          <Empty
            image={<RobotOutlined className="empty-icon" />}
            description={
              <div className="empty-description">
                <Title level={4}>{t('chat.welcome')}</Title>
                <Text type="secondary">
                  {t('chat.emptyState.selectConversation')}
                </Text>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <div className="chat-window">
      {/* 聊天头部 */}
      <div className="chat-header">
        <div className="chat-info">
          <Avatar icon={<RobotOutlined />} className="chat-avatar" />
          <div className="chat-details">
            <Title level={5} className="chat-title">
              {conversation?.title || t('chat.title')}
            </Title>
            <Text type="secondary" className="chat-status">
              <div className={`status-dot ${isConnected ? 'online' : 'offline'}`} />
              {isConnected ? t('chat.connectionStatus.online') : t('chat.connectionStatus.offline')}
            </Text>
          </div>
        </div>
      </div>

      {/* 消息列表 */}
      <div className="chat-messages">
        {!conversation || conversation.messages.length === 0 ? (
          <div className="welcome-message">
            <div className="welcome-content">
              <RobotOutlined className="welcome-icon" />
              <Title level={4}>{t('chat.welcome')}</Title>
              <Text type="secondary">
                {t('chat.welcomeMessage')}
              </Text>
              
              {/* 智能提示 */}
              <div className="smart-tips" style={{ marginTop: 24 }}>
                <Text type="secondary" style={{ fontSize: '14px' }}>
                  💡 直接输入以太坊地址 (0x...) 即可自动进行智能合约分析
                </Text>
              </div>
            </div>
          </div>
        ) : (
          <List
            className="messages-list"
            dataSource={conversation.messages}
            renderItem={renderMessage}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="chat-input">
        <div className="input-container">
          <TextArea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder={
              isConnected 
                ? "输入消息或以太坊地址 (0x...) 进行智能分析..."
                : t('chat.inputPlaceholderDisconnected')
            }
            autoSize={{ minRows: 1, maxRows: 6 }}
            className="message-input"
            disabled={!isConnected}
          />
          
          <div className="input-actions">
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleSend}
              disabled={!inputValue.trim() || !isConnected}
              className="send-button"
            >
              {t('chat.send')}
            </Button>
          </div>
        </div>
        
        <div className="input-footer">
          <Text type="secondary" className="input-tip">
            {t('chat.messages.aiWarning')}
          </Text>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;

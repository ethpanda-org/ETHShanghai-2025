import React, { useState, useEffect } from 'react';
import { Layout, App } from 'antd';
import { useLocation } from 'react-router-dom';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import ContractAnalysisModal from './ContractAnalysisModal';
import unifiedSocketService from '../services/socketService';
import './ChatPage.scss';

const { Sider, Content } = Layout;

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

const ChatPage: React.FC = () => {
  const { message } = App.useApp();
  const location = useLocation();
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [initialMessageSent, setInitialMessageSent] = useState(false);
  
  // 合约分析模态框状态
  const [contractAnalysisVisible, setContractAnalysisVisible] = useState(false);

  // 获取当前对话
  const currentConversation = conversations.find(conv => conv.id === currentConversationId);

  // 初始化Socket连接
  useEffect(() => {
    // 初始化时检查连接状态
    const initialConnectionStatus = unifiedSocketService.isConnected();
    console.log('🔍 ChatPage初始化，检查连接状态:', {
      isConnected: initialConnectionStatus,
      connectionDetails: unifiedSocketService.getConnectionStatus()
    });
    setIsConnected(initialConnectionStatus);

    // 订阅聊天服务
    unifiedSocketService.subscribeToChat();

    // 注册事件监听器
    const handleConnected = (data: any) => {
      console.log('✅ ChatPage收到连接成功事件:', data);
      setIsConnected(true);
    };

    const handleDisconnected = (data: any) => {
      console.log('❌ ChatPage收到连接断开事件:', data);
      setIsConnected(false);
    };

    const handleConnectionError = (data: any) => {
      console.error('❌ ChatPage收到连接错误事件:', data);
      setIsConnected(false);
    };

    const handleReconnected = (data: any) => {
      console.log('✅ ChatPage收到重连成功事件:', data);
      setIsConnected(true);
    };

    const handleAIResponseChunk = (data: { chunk: string; messageId: string }) => {
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: conv.messages.map(msg => {
              if (msg.id === data.messageId && msg.role === 'assistant') {
                return {
                  ...msg,
                  content: msg.content + data.chunk,
                  isStreaming: true
                };
              }
              return msg;
            })
          };
        }
        return conv;
      }));
    };

    // 监听AI回复完成
    const handleAIResponseComplete = (data: { messageId: string; fullContent: string }) => {
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          const updatedMessages = conv.messages.map(msg => {
            if (msg.id === data.messageId && msg.role === 'assistant') {
              return {
                ...msg,
                content: data.fullContent,
                isStreaming: false
              };
            }
            return msg;
          });
          
          return {
            ...conv,
            messages: updatedMessages,
            lastMessage: data.fullContent.slice(0, 50) + (data.fullContent.length > 50 ? '...' : ''),
            timestamp: new Date().toISOString()
          };
        }
        return conv;
      }));
    };

    // 监听AI回复错误
    const handleAIResponseError = (data: { messageId: string; error: string }) => {
      setConversations(prev => prev.map(conv => {
        if (conv.id === currentConversationId) {
          return {
            ...conv,
            messages: conv.messages.map(msg => {
              if (msg.id === data.messageId && msg.role === 'assistant') {
                return {
                  ...msg,
                  content: `错误: ${data.error}`,
                  isStreaming: false
                };
              }
              return msg;
            })
          };
        }
        return conv;
      }));
      message.error('AI回复失败: ' + data.error);
    };

    // 注册事件监听器
    unifiedSocketService.on('connected', handleConnected);
    unifiedSocketService.on('disconnected', handleDisconnected);
    unifiedSocketService.on('connection_error', handleConnectionError);
    unifiedSocketService.on('reconnected', handleReconnected);
    unifiedSocketService.on('chat:ai-response-chunk', handleAIResponseChunk);
    unifiedSocketService.on('chat:ai-response-complete', handleAIResponseComplete);
    unifiedSocketService.on('chat:ai-response-error', handleAIResponseError);

    return () => {
      // 清理事件监听器
      unifiedSocketService.off('connected', handleConnected);
      unifiedSocketService.off('disconnected', handleDisconnected);
      unifiedSocketService.off('connection_error', handleConnectionError);
      unifiedSocketService.off('reconnected', handleReconnected);
      unifiedSocketService.off('chat:ai-response-chunk', handleAIResponseChunk);
      unifiedSocketService.off('chat:ai-response-complete', handleAIResponseComplete);
      unifiedSocketService.off('chat:ai-response-error', handleAIResponseError);
      unifiedSocketService.unsubscribeFromChat();
    };
  }, [currentConversationId]);

  // 创建新对话
  const createNewConversation = () => {
    const newConversation: ChatConversation = {
      id: `conv_${Date.now()}`,
      title: '新对话',
      lastMessage: '',
      timestamp: new Date().toISOString(),
      messages: []
    };

    setConversations(prev => [newConversation, ...prev]);
    setCurrentConversationId(newConversation.id);
  };

  // 选择对话
  const selectConversation = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  // 删除对话
  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
    if (currentConversationId === conversationId) {
      const remainingConversations = conversations.filter(conv => conv.id !== conversationId);
      setCurrentConversationId(remainingConversations.length > 0 ? remainingConversations[0].id : null);
    }
  };

  // 检测消息中的合约地址
  const detectContractAddresses = (content: string): string[] => {
    const contractAddressRegex = /0x[a-fA-F0-9]{40}/g;
    const matches = content.match(contractAddressRegex);
    return matches ? [...new Set(matches)] : [];
  };

  // 发送消息
  const sendMessage = (content: string) => {
    if (!currentConversationId || !unifiedSocketService.isConnected()) {
      message.error('请先创建对话或检查连接状态');
      return;
    }

    // 检测合约地址
    const contractAddresses = detectContractAddresses(content);
    let enhancedContent = content;
    
    // 如果检测到合约地址，增强消息内容
    if (contractAddresses.length > 0) {
      enhancedContent = `${content}\n\n[系统检测到合约地址: ${contractAddresses.join(', ')}，将进行智能合约分析]`;
    }

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      content,
      role: 'user',
      timestamp: new Date().toISOString()
    };

    const assistantMessage: ChatMessage = {
      id: `msg_${Date.now()}_assistant`,
      content: '',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      isStreaming: true
    };

    // 更新对话
    setConversations(prev => prev.map(conv => {
      if (conv.id === currentConversationId) {
        const updatedMessages = [...conv.messages, userMessage, assistantMessage];
        
        // 如果是第一条消息，更新对话标题
        const title = conv.messages.length === 0 
          ? content.slice(0, 20) + (content.length > 20 ? '...' : '')
          : conv.title;

        return {
          ...conv,
          title,
          messages: updatedMessages,
          lastMessage: content.slice(0, 50) + (content.length > 50 ? '...' : ''),
          timestamp: new Date().toISOString()
        };
      }
      return conv;
    }));

    // 发送消息到后端，包含合约地址信息
    unifiedSocketService.sendMessage({
      message: enhancedContent,
      conversationId: currentConversationId,
      assistantMessageId: assistantMessage.id,
      contractAddresses: contractAddresses.length > 0 ? contractAddresses : undefined
    });
  };

  // 初始化时创建第一个对话
  useEffect(() => {
    if (conversations.length === 0) {
      createNewConversation();
    }
  }, []);

  // 处理来自首页的初始消息
  useEffect(() => {
    const initialMessage = (location.state as any)?.initialMessage;
    if (initialMessage && !initialMessageSent && currentConversationId && unifiedSocketService.isConnected()) {
      setTimeout(() => {
        sendMessage(initialMessage);
        setInitialMessageSent(true);
      }, 1000); // 等待1秒确保连接稳定
    }
  }, [location.state, initialMessageSent, currentConversationId, isConnected]);

  // 处理合约分析请求
  const handleContractAnalysis = () => {
    setContractAnalysisVisible(true);
  };

  // 关闭合约分析模态框
  const handleCloseContractAnalysis = () => {
    setContractAnalysisVisible(false);
  };

  return (
    <div className="chat-page">
      <Layout className="chat-layout">
        <Sider 
          width={280} 
          className="chat-sidebar"
          collapsed={sidebarCollapsed}
          onCollapse={setSidebarCollapsed}
          collapsible
          theme="dark"
        >
          <ChatSidebar
            conversations={conversations}
            currentConversationId={currentConversationId}
            onNewConversation={createNewConversation}
            onSelectConversation={selectConversation}
            onDeleteConversation={deleteConversation}
            collapsed={sidebarCollapsed}
          />
        </Sider>
        
        <Layout className="chat-main">
          <Content className="chat-content">
            <ChatWindow
              conversation={currentConversation}
              onSendMessage={sendMessage}
              isConnected={isConnected}
              onContractAnalysis={handleContractAnalysis}
            />
          </Content>
        </Layout>
      </Layout>
      
      {/* 合约分析模态框 */}
      <ContractAnalysisModal
        visible={contractAnalysisVisible}
        onClose={handleCloseContractAnalysis}
      />
    </div>
  );
};

export default ChatPage;

import React, { useState, useEffect, useRef } from 'react';
import type { ChatMessage, ChatbotSession } from '../types';
import * as chatbotApi from '../client/chatBotApi';
import './ChatbotContent.css';

// localStorage键名常量
const STORAGE_KEYS = {
  ACTIVE_SESSION: 'chatbot_active_session',
  SESSIONS: 'chatbot_sessions',
  MESSAGES: 'chatbot_session_messages'
};

interface ChatbotContentProps {
  activeTab?: string;
}

// 修改状态定义，为每个会话单独存储消息历史
const ChatbotContent: React.FC<ChatbotContentProps> = ({ activeTab }) => {
  const [activeSession, setActiveSession] = useState<string>('')
  const [sessions, setSessions] = useState<ChatbotSession[]>([])
  // 修改为对象，为每个会话单独存储消息
  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatMessage[]>>({})
  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showSessions] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  // API设置对话框相关状态
  const [dialogVisible, setDialogVisible] = useState(false);
  const [apiSettings, setApiSettings] = useState({
    url: '',
    key: '',
    model: ''
  });

  // 保存状态到localStorage
  const saveStateToStorage = (): void => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, activeSession);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(sessionMessages));
      // 保存API设置
      localStorage.setItem('chatbot_api_settings', JSON.stringify(apiSettings));
    } catch (error) {
      console.error('Failed to save state to localStorage:', error);
    }
  };

  // 从localStorage加载状态
  const loadStateFromStorage = (): void => {
    try {
      // 加载活动会话
      const savedActiveSession = localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
      if (savedActiveSession) {
        setActiveSession(savedActiveSession);
      }

      // 加载会话列表并排序
      const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (savedSessions) {
        const parsedSessions = JSON.parse(savedSessions);
        // 按会话id大小排序（降序，最新的在最上面）
        const sortedSessions = parsedSessions.sort((a: ChatbotSession, b: ChatbotSession) => b.id.localeCompare(a.id));
        setSessions(sortedSessions);
      }

      // 加载消息历史
      const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
      if (savedMessages) {
        setSessionMessages(JSON.parse(savedMessages));
      }
      
      // 加载API设置
      const savedApiSettings = localStorage.getItem('chatbot_api_settings');
      if (savedApiSettings) {
        setApiSettings(JSON.parse(savedApiSettings));
      }
    } catch (error) {
      console.error('Failed to load state from localStorage:', error);
    }
  };

  // 获取当前会话的消息
  const getCurrentMessages = () => {
    return sessionMessages[activeSession] || [];
  }

  // 修改handleDeleteSession函数，当Session不存在时仍然从本地删除会话
  const handleDeleteSession = async (sessionId: string, event: React.MouseEvent): Promise<void> => {
    event.stopPropagation(); // 阻止事件冒泡，避免触发会话切换
    
    // 立即清除任何现有的错误消息
    setError(null);
    
    try {
      // 调用后端API删除会话
      await chatbotApi.deleteChatSession(sessionId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete chat session';
      
      // 如果不是Session不存在的错误，才显示错误
      if (errorMessage !== 'Session does not exist') {
        console.error('Failed to delete chat session:', err);
        // 注意：这里不设置错误消息，因为我们总是要删除本地会话
      }
      
    }
    
    // 无论API调用是否成功，都从本地删除会话
    updateLocalSessionState(sessionId);
  };

  // 提取本地会话状态更新逻辑为单独函数
  const updateLocalSessionState = (sessionId: string): void => {
    // 如果删除的是当前活动会话，需要切换到另一个会话
    if (sessionId === activeSession) {
      const remainingSessions = sessions.filter(s => s.id !== sessionId);
      if (remainingSessions.length > 0) {
        setActiveSession(remainingSessions[0].id);
        // 如果新会话没有消息历史，设置欢迎消息
        if (!sessionMessages[remainingSessions[0].id]) {
          setSessionMessages(prev => ({
            ...prev,
            [remainingSessions[0].id]: [
              {
                id: Date.now().toString(),
                content: 'Hello! I\'m your AI assistant. How can I help you today?',
                sender: 'bot',
                timestamp: new Date().toISOString(),
                type: 'text',
                buttons: [
                  { id: 'btn1', text: 'Show me available tools', action: 'show_tools' },
                  { id: 'btn2', text: 'Help with a task', action: 'help_task' },
                  { id: 'btn3', text: 'Explain features', action: 'explain_features' }
                ]
              }
            ]
          }))
        }
      } else {
        // 如果没有会话了，清空活动会话
        setActiveSession('');
      }
    }
    
    // 从会话列表和消息存储中删除会话
    setSessions(prevSessions => prevSessions.filter(s => s.id !== sessionId));
    
    // 删除会话消息记录
    setSessionMessages(prev => {
      const newMessages = { ...prev };
      delete newMessages[sessionId];
      return newMessages;
    });
  };

  // 修改handleSwitchSession函数，使用当前会话的消息历史
  const handleSwitchSession = async (sessionId: string): Promise<void> => {
    if (sessionId === activeSession || isTyping || !isInitialized) return;
    
    setActiveSession(sessionId);
    setError(null);
    
    try {
      // 验证会话是否存在
      await chatbotApi.getChatSession(sessionId);
      
      // 如果会话没有消息历史，设置欢迎消息
      if (!sessionMessages[sessionId]) {
        setSessionMessages(prev => ({
          ...prev,
          [sessionId]: [
            {
              id: Date.now().toString(),
              content: 'Hello! I\'m your AI assistant. How can I help you today?',
              sender: 'bot',
              timestamp: new Date().toISOString(),
              type: 'text',
              buttons: [
                { id: 'btn1', text: 'Show me available tools', action: 'show_tools' },
                { id: 'btn2', text: 'Help with a task', action: 'help_task' },
                { id: 'btn3', text: 'Explain features', action: 'explain_features' }
              ]
            }
          ]
        }))
      }
    } catch (err) {
      console.error('Failed to load chat session:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load chat session';
      setError(errorMessage);
      
      // 出错时也尝试显示欢迎消息
      if (!sessionMessages[sessionId]) {
        setSessionMessages(prev => ({
          ...prev,
          [sessionId]: [
            {
              id: Date.now().toString(),
              content: 'Hello! I\'m your AI assistant. How can I help you today?',
              sender: 'bot',
              timestamp: new Date().toISOString(),
              type: 'text',
              buttons: [
                { id: 'btn1', text: 'Show me available tools', action: 'show_tools' },
                { id: 'btn2', text: 'Help with a task', action: 'help_task' },
                { id: 'btn3', text: 'Explain features', action: 'explain_features' }
              ]
            }
          ]
        }))
      }
    }
  };

  // 显示API设置对话框
  const handleApiSettingsClick = () => {
    // 每次打开对话框时，确保使用最新的API设置
    const savedApiSettings = localStorage.getItem('chatbot_api_settings');
    if (savedApiSettings) {
      try {
        setApiSettings(JSON.parse(savedApiSettings));
      } catch (error) {
        console.error('Failed to parse saved API settings:', error);
        // 如果解析失败，重置为初始状态
        setApiSettings({
          url: '',
          key: '',
          model: ''
        });
      }
    } else {
      // 如果没有保存的设置，重置为初始状态
      setApiSettings({
        url: '',
        key: '',
        model: ''
      });
    }
    setDialogVisible(true);
  };

  // 关闭对话框
  const closeDialog = () => {
    setDialogVisible(false);
  };

  // 保存API设置
  const saveApiSettings = async () => {
    try {
      await chatbotApi.saveParametersToFile(
        {
          ai_api_url: apiSettings.url,
          ai_api_key: apiSettings.key,
          ai_model: apiSettings.model,
        }
      );
    } catch (error) {
      console.error('Failed to save API settings:', error);
      setError('Failed to save API settings');
      return;
    }
    
    console.log('API Settings saved:', apiSettings);
    setDialogVisible(false);
  };

  // 修改handleSendMessage函数，使用当前会话的消息历史
  const handleSendMessage = async (): Promise<void> => {
    if (!inputMessage.trim() || !activeSession || !isInitialized) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text'
    };

    // 更新当前会话的消息
    setSessionMessages(prev => ({
      ...prev,
      [activeSession]: [...(prev[activeSession] || []), newUserMessage]
    }));
    
    setInputMessage('');

    // 更新会话的最后消息
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === activeSession 
          ? { ...session, lastMessage: inputMessage.substring(0, 50) + (inputMessage.length > 50 ? '...' : '') }
          : session
      )
    );

    // 发送消息到API
    await sendMessageToApi(activeSession, inputMessage.trim());
  };

  // 修改handleMessageResponse函数，使用当前会话的消息历史
  const handleMessageResponse = async (sessionId: string, userMessage: string): Promise<void> => {
    setIsTyping(true);
    
    // 根据用户输入决定调用哪个后端接口
    let botResponse = '';
    let responseButtons: { id: string; text: string; action: string }[] = [];
    
    try {
      // 检测用户提问类型并调用相应后端接口
      const lowerMessage = userMessage.toLowerCase();
      
      if (lowerMessage.includes('tool') || 
          lowerMessage.includes('available') || 
          lowerMessage.includes('工具') ||
          lowerMessage.includes('show me available tools')) {
        // 调用获取可用工具接口
        const tools = await chatbotApi.refreshAvailableTools();
        if (tools && tools.length > 0) {
          botResponse = 'Here are the available tools:';
          responseButtons = tools.map((tool, index) => ({
            id: `tool_${index}`,
            text: tool.name,
            action: `tool_${tool.name.toLowerCase().replace(/\s+/g, '_')}`
          }));
        } else {
          botResponse = 'No tools are currently available.';
        }
      } else if (lowerMessage.includes('session') || 
                 lowerMessage.includes('history') ||
                 lowerMessage.includes('会话') ||
                 lowerMessage.includes('历史')) {
        // 调用获取会话信息接口
        const sessionIds = await chatbotApi.listChatSessions();
        if (sessionIds && sessionIds.length > 0) {
          botResponse = `You have ${sessionIds.length} active sessions. You can see them in the sidebar.`;
          responseButtons = [
            { id: 'create_new', text: 'Create new session', action: 'create_session' },
            { id: 'switch_session', text: 'Switch sessions', action: 'show_sessions' }
          ];
        } else {
          botResponse = 'You currently don\'t have any other sessions.';
        }
      } else {
        // 默认调用聊天接口发送消息
        const response = await chatbotApi.sendChatMessage(sessionId, userMessage);
        
        if (response.success && response.message) {
          botResponse = response.message;
        } else {
          throw new Error(response.error || 'Failed to send message');
        }
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      const message = `'Sorry, I'm unable to connect to the backend service at the moment. Please try again later.' ${error}`;
      botResponse = message;
    }
    
    // 模拟一点延迟，让用户体验更自然
    setTimeout(() => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'text',
        buttons: responseButtons
      };
      
      // 更新当前会话的消息
      setSessionMessages(prev => ({
        ...prev,
        [sessionId]: [...(prev[sessionId] || []), newMessage]
      }));
      
      setIsTyping(false);
      
      // 更新会话的最后消息
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === sessionId 
            ? { ...session, lastMessage: botResponse.substring(0, 50) + (botResponse.length > 50 ? '...' : '') }
            : session
        )
      );
    }, 500);
  };

  // 添加缺失的sendMessageToApi函数
  const sendMessageToApi = async (sessionId: string, message: string): Promise<void> => {
    try {
      await handleMessageResponse(sessionId, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsTyping(false);
      // 发送失败时显示错误消息
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: 'Failed to send message. Please try again later.',
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'text'
      };
      setSessionMessages(prev => ({
        ...prev,
        [sessionId]: [...(prev[sessionId] || []), errorMessage]
      }));
    }
  };

  // 修改handleNewSession函数，确保新会话添加到列表最上方并保持排序
  const handleNewSession = async (): Promise<void> => {
    if (isTyping || !isInitialized) return;
    
    try {
      setError(null);
      
      // 调用后端API创建新会话
      const newSessionId = await chatbotApi.createChatSession();
      
      // 创建新会话对象
      const newSession: ChatbotSession = {
        id: newSessionId,
        title: 'Conversation',
        createdAt: new Date().toISOString(),
        lastMessage: ''
      };
      
      // 更新会话列表，添加到最前面并保持按id排序
      setSessions(prevSessions => {
        const updatedSessions = [newSession, ...prevSessions];
        // 按会话id大小排序（降序，最新的在最上面）
        updatedSessions.sort((a: ChatbotSession, b: ChatbotSession) => b.id.localeCompare(a.id));
        return updatedSessions;
      });
      
      // 切换到新会话
      setActiveSession(newSessionId);
      
      // 为新会话设置欢迎消息
      setSessionMessages(prev => ({
        ...prev,
        [newSessionId]: [
          {
            id: Date.now().toString(),
            content: 'Hello! I\'m your AI assistant. How can I help you today?',
            sender: 'bot',
            timestamp: new Date().toISOString(),
            type: 'text',
            buttons: [
              { id: 'btn1', text: 'Show me available tools', action: 'show_tools' },
              { id: 'btn2', text: 'Help with a task', action: 'help_task' },
              { id: 'btn3', text: 'Explain features', action: 'explain_features' }
            ]
          }
        ]
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create new session';
      setError(errorMessage);
      console.error('Failed to create new session:', err);
    }
  };

  // 实现handleButtonClick函数，根据按钮action调用不同的API接口
  const handleButtonClick = async (action: string, buttonText: string): Promise<void> => {
    if (!activeSession || isTyping || !isInitialized) return;
    
    // 将按钮文本作为用户消息添加到聊天记录
    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      content: buttonText,
      sender: 'user',
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    // 更新当前会话的消息
    setSessionMessages(prev => ({
      ...prev,
      [activeSession]: [...(prev[activeSession] || []), newUserMessage]
    }));
    
    // 更新会话的最后消息
    setSessions(prevSessions => 
      prevSessions.map(session => 
        session.id === activeSession 
          ? { ...session, lastMessage: buttonText.substring(0, 50) + (buttonText.length > 50 ? '...' : '') }
          : session
      )
    );
    
    // 根据按钮action调用不同的API接口
    if (action === 'show_tools') {
      await handleShowTools();
    } else {
      // 对于其他按钮，调用sendChatMessage接口
      if (buttonText === 'get weather mock') {
        await sendMessageToApi(activeSession, "What's the weather like in New York");
      } else if (buttonText === 'simple calculate mock') {
        await sendMessageToApi(activeSession, "What is 9.11 plus 9.8?");
      } else {
        await sendMessageToApi(activeSession, buttonText);
      }
    }

  };
  
  // 处理显示可用工具的函数
  const handleShowTools = async (): Promise<void> => {
    setIsTyping(true);
    
    let botResponse = '';
    let responseButtons: { id: string; text: string; action: string }[] = [];
    
    try {
      // 刷新并获取最新的工具列表
      const tools = await chatbotApi.refreshAvailableTools();
      if (tools && tools.length > 0) {
        botResponse = 'Here are the available tools:';
        responseButtons = tools.map((tool, index) => ({
          id: `tool_${index}`,
          text: tool.name,
          action: `tool_${tool.name.toLowerCase().replace(/\s+/g, '_')}`
        }));
      } else {
        botResponse = 'No tools are currently available.';
      }
    } catch (error) {
      console.error('Failed to get available tools:', error);
      botResponse = 'Sorry, I couldn\'t retrieve the available tools at the moment. Please try again later.';
    }
    
    // 模拟一点延迟，让用户体验更自然
    setTimeout(() => {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        content: botResponse,
        sender: 'bot',
        timestamp: new Date().toISOString(),
        type: 'text',
        buttons: responseButtons
      };
      
      // 更新当前会话的消息
      setSessionMessages(prev => ({
        ...prev,
        [activeSession]: [...(prev[activeSession] || []), newMessage]
      }));
      
      setIsTyping(false);
      
      // 更新会话的最后消息
      setSessions(prevSessions => 
        prevSessions.map(session => 
          session.id === activeSession 
            ? { ...session, lastMessage: botResponse.substring(0, 50) + (botResponse.length > 50 ? '...' : '') }
            : session
        )
      );
    }, 500);
  };

  // 添加缺失的formatTimestamp函数
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // 添加useEffect钩子来滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [sessionMessages, activeSession]);

  // 添加useEffect钩子来初始化聊天机器人
  useEffect(() => {
    const initChatbot = async () => {
      try {
        console.log('Initializing chatbot useEffect...');
        // 先从localStorage加载状态
        loadStateFromStorage();
        
        // 初始化聊天机器人
        await chatbotApi.initChatbot();
        
        // 从localStorage加载会话后进行排序
        if (sessions.length > 0) {
          // 按会话id大小排序（降序，最新的在最上面）
          const sortedSessions = [...sessions].sort((a: ChatbotSession, b: ChatbotSession) => b.id.localeCompare(a.id));
          setSessions(sortedSessions);
          
          // 如果activeSession不存在于sessions列表中或不存在，选择第一个会话
          if (!activeSession || !sortedSessions.some(s => s.id === activeSession)) {
            setActiveSession(sortedSessions[0].id);
          }
        } else {
          // 如果没有会话，不自动加载，等待用户手动创建
        }
        
        // 标记初始化完成
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize chatbot:', err);
        setError('Failed to initialize chatbot');
        setIsInitialized(true); // 即使失败也标记为初始化完成，允许用户操作
      }
    };
    
    // 只在组件首次挂载时执行初始化
    if (activeTab === 'chatbot' && !isInitialized) {
      initChatbot();
    }
}, [activeTab]);

  // 添加useEffect钩子来监听状态变化并保存到localStorage
  useEffect(() => {
    // 组件初始化完成后，只要有任何状态变化就保存
    // if (isInitialized) {
      saveStateToStorage();
    // }
  }, [activeSession, sessions, sessionMessages, isInitialized, apiSettings]);

  // 添加额外的useEffect来确保消息变化时立即保存
  useEffect(() => {
    // 当消息变化时，立即保存到localStorage，只要sessionMessages有数据就保存
    if (Object.keys(sessionMessages).length > 0) {
      try {
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(sessionMessages));
      } catch (error) {
        console.error('Failed to save messages to localStorage:', error);
      }
    }
  }, [sessionMessages]);

  // 在组件返回的JSX中，需要修改消息渲染部分，使用getCurrentMessages()获取当前会话的消息
  return (
    <div className="chatbot-content">
      {/* 错误提示 - 保持功能但样式与老版本兼容 */}
      {error && (
        <div className="error-message">
          <span>❌ {error}</span>
          <button onClick={() => setError(null)}>关闭</button>
        </div>
      )}

      {/* 自定义对话框组件 */}
      {dialogVisible && (
        <div 
          className="custom-dialog-overlay"
          onClick={closeDialog}
          style={{ cursor: 'pointer' }}
        >
          <div className="custom-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="custom-dialog-header">
              <h3 className="custom-dialog-title">API Settings</h3>
            </div>
            <div className="custom-dialog-body">
              {/* API设置表单 */}
              <div className="api-settings-form">
                <div className="form-group">
                  <label>AI API URL</label>
                  <input
                    type="text"
                    className="form-input"
                    value={apiSettings.url}
                    onChange={(e) => setApiSettings({...apiSettings, url: e.target.value})}
                    placeholder="https://api.openai.com/v1"
                  />
                </div>
                <div className="form-group">
                  <label>AI API Key</label>
                  <input
                    type="password"
                    className="form-input"
                    value={apiSettings.key}
                    onChange={(e) => setApiSettings({...apiSettings, key: e.target.value})}
                    placeholder="sk-00000000000000000000000000000000"
                  />
                </div>
                <div className="form-group">
                  <label>AI Model</label>
                  <input
                    type="text"
                    className="form-input"
                    value={apiSettings.model}
                    onChange={(e) => setApiSettings({...apiSettings, model: e.target.value})}
                    placeholder="gpt-3.5-turbo"
                  />
                </div>
              </div>
            </div>
            <div className="custom-dialog-footer" style={{ justifyContent: 'right', gap: '16px' }}>
              {/* 取消按钮 */}
              <button 
                className="custom-dialog-button"
                onClick={closeDialog}
                style={{ backgroundColor: '#6b7280' }} /* 中性色 */
              >
                Cancel
              </button>
              {/* 确认按钮 */}
              <button 
                className="custom-dialog-button"
                onClick={saveApiSettings}
                disabled={!apiSettings.url || !apiSettings.key || !apiSettings.model}
                style={!apiSettings.url || !apiSettings.key || !apiSettings.model ? 
                  { backgroundColor: '#cccccc', cursor: 'not-allowed' } : {}}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 加载状态 - 保持功能但样式与老版本兼容 */}
      {!isInitialized && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Initializing chatbot...</p>
        </div>
      )}
      
      {/* Chat Container */}
      <div className="chat-container">
        {/* Sessions Sidebar */}
        {showSessions && (
          <div className="sessions-sidebar">
            <div className="session-list">
              {sessions.map(session => (
                <div
                  key={session.id}
                  className={`session-item ${activeSession === session.id ? 'active' : ''}`}
                  onClick={() => handleSwitchSession(session.id)}
                >
                  <div className="session-header">
                    <div className="session-title">{session.title}</div>
                    <button 
                      className="session-delete-btn"
                      onClick={(e) => handleDeleteSession(session.id, e)}
                      title="Delete session"
                    >
                      ×
                    </button>
                  </div>
                  {session.lastMessage && (
                    <div className="session-last-message">{session.lastMessage}</div>
                  )}
                </div>
              ))}
            </div>
            
            {/* New Session Button at the bottom - outside of scrollable list */}
            <div className="session-list-bottom">
              <button 
                className="new-session-btn-bottom"
                onClick={handleNewSession}
                disabled={isTyping || !isInitialized}
              >
                New Session
              </button>
            </div>
          </div>
        )}

        {/* Chat Messages */}
        <div className="chat-messages">
          {getCurrentMessages().map(message => (
            <div key={message.id} className={`chat-message ${message.sender}`}>
              {message.sender === 'bot' && (
                <div className="message-avatar">AI</div>
              )}
              <div className="message-bubble">
                {message.content}
                <div className="message-timestamp">{formatTimestamp(message.timestamp)}</div>
                
                {/* Display buttons if available */}
                {message.buttons && message.buttons.length > 0 && (
                  <div className="buttons-container">
                    {message.buttons.map(button => (
                      <button
                        key={button.id}
                        className="chat-button"
                        onClick={() => handleButtonClick(button.action, button.text)}
                        disabled={isTyping || !isInitialized}
                      >
                        {button.text}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {message.sender === 'user' && (
                <div className="message-avatar">U</div>
              )}
            </div>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="chat-message bot">
              <div className="message-avatar">AI</div>
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          )}
          
          {/* Scroll reference */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="input-controls">
          <button className="api-settings-btn" onClick={handleApiSettingsClick}>
            API Settings
          </button>
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Type your message..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isTyping || !isInitialized}
            />
            <button
              className="send-btn"
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isTyping || !isInitialized}
            >
              ➤
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatbotContent
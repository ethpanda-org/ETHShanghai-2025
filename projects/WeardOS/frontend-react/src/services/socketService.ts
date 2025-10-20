import { io, Socket } from 'socket.io-client';

interface ConnectionStatus {
  isConnected: boolean;
  socketId: string | null;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
}

class UnifiedSocketService {
  private socket: Socket | null = null;
  private _isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // 事件监听器
  private eventListeners: Map<string, Function[]> = new Map();
  
  // 订阅状态管理
  private subscriptions: Set<string> = new Set();

  // 内部事件（不转发到服务器）
  private internalEvents = new Set([
    'connected',
    'disconnected',
    'connection_error',
    'reconnect_attempt',
    'reconnected',
    'socket-error'
  ]);

  constructor() {
    this.initializeSocket();
  }

  /**
   * 初始化Socket连接
   */
  private initializeSocket() {
    try {
      // 优先使用环境变量配置的WS地址，其次回退到API地址，最后本地默认
      const WS_URL = (import.meta.env.VITE_WS_URL as string) 
        || (import.meta.env.VITE_API_URL as string) 
        || 'http://localhost:3001';

      console.log('🔄 初始化Socket连接:', WS_URL);

      this.socket = io(WS_URL, {
        // 使用WebSocket和轮询传输，优先轮询以提高兼容性
        transports: ['polling', 'websocket'],
        // 显式设置路径，确保与服务端默认 '/socket.io' 对齐
        path: '/socket.io',
        // 允许跨域携带凭据，与服务端 credentials: true 一致
        withCredentials: true,
        timeout: 20000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        // 添加更多配置选项，与后端保持一致
        forceNew: false, // 改为false，允许重用连接
        upgrade: true,
        rememberUpgrade: false,
      });

      this.setupEventListeners();
      
      // 立即检查连接状态
      console.log('📊 Socket初始化完成，当前状态:', {
        socketExists: !!this.socket,
        socketConnected: this.socket?.connected,
        internalConnected: this._isConnected
      });
      
    } catch (error) {
      console.error('❌ Socket初始化失败:', error);
      this._isConnected = false;
    }
  }

  /**
   * 设置Socket事件监听器
   */
  private setupEventListeners() {
    if (!this.socket) return;

    // 连接成功
    this.socket.on('connect', () => {
      console.log('✅ Socket连接成功:', this.socket?.id);
      this._isConnected = true;
      this.reconnectAttempts = 0;
      this.emit('connected', { socketId: this.socket?.id });
      
      // 重新订阅之前的服务
      this.resubscribeServices();
    });

    // 连接断开
    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket连接断开:', reason);
      this._isConnected = false;
      this.emit('disconnected', { reason });
    });

    // 连接错误
    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket连接错误:', error);
      this.reconnectAttempts++;
      this.emit('connection_error', { error, attempts: this.reconnectAttempts });
    });

    // 重连尝试
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Socket重连尝试 ${attemptNumber}/${this.maxReconnectAttempts}`);
      this.emit('reconnect_attempt', { attemptNumber });
    });

    // 重连成功
    this.socket.on('reconnect', (attemptNumber) => {
      console.log('✅ Socket重连成功:', attemptNumber);
      this._isConnected = true;
      this.emit('reconnected', { attemptNumber });
    });

    // 通用错误
    this.socket.on('error', (data) => {
      console.error('❌ Socket错误:', data);
      this.emit('socket-error', data);
    });

    // 设置所有业务事件监听器
    this.setupBusinessEventListeners();
  }

  /**
   * 设置业务事件监听器
   */
  private setupBusinessEventListeners() {
    if (!this.socket) return;

    // 聊天功能事件
    this.socket.on('chat:ai-response-chunk', (data) => this.emit('chat:ai-response-chunk', data));
    this.socket.on('chat:ai-response-complete', (data) => this.emit('chat:ai-response-complete', data));
    this.socket.on('chat:ai-response-error', (data) => this.emit('chat:ai-response-error', data));

    // 兼容无前缀的后端事件：同时转发为 chat:* 与无前缀
    this.socket.on('ai-response-chunk', (data) => {
      this.emit('ai-response-chunk', data);
      this.emit('chat:ai-response-chunk', data);
    });
    this.socket.on('ai-response-complete', (data) => {
      this.emit('ai-response-complete', data);
      this.emit('chat:ai-response-complete', data);
    });
    this.socket.on('ai-response-error', (data) => {
      this.emit('ai-response-error', data);
      this.emit('chat:ai-response-error', data);
    });
    this.socket.on('ai-response-chunk', (data) => this.emit('ai-response-chunk', data));
    this.socket.on('ai-response-complete', (data) => this.emit('ai-response-complete', data));
    this.socket.on('ai-response-error', (data) => this.emit('ai-response-error', data));

    // 钱包监控事件
    this.socket.on('wallet-monitoring:initial-data', (data) => this.emit('wallet-monitoring:initial-data', data));
    this.socket.on('wallet-monitoring:update', (data) => this.emit('wallet-monitoring:update', data));
    this.socket.on('wallet-monitoring:wallet-added', (data) => this.emit('wallet-monitoring:wallet-added', data));
    this.socket.on('wallet-monitoring:error', (data) => this.emit('wallet-monitoring:error', data));

    // 实时交易监控事件
    this.socket.on('realtime-transaction:initial-data', (data) => this.emit('realtime-transaction:initial-data', data));
    this.socket.on('realtime-transaction:update', (data) => this.emit('realtime-transaction:update', data));
    this.socket.on('realtime-transaction:address-added', (data) => this.emit('realtime-transaction:address-added', data));
    this.socket.on('realtime-transaction:listening-started', (data) => this.emit('realtime-transaction:listening-started', data));
    this.socket.on('realtime-transaction:error', (data) => this.emit('realtime-transaction:error', data));

    // AI监控事件
    this.socket.on('ai-monitoring:risk-alert', (data) => this.emit('ai-monitoring:risk-alert', data));
    this.socket.on('ai-monitoring:analysis-complete', (data) => this.emit('ai-monitoring:analysis-complete', data));
    this.socket.on('ai-monitoring:monitoring-update', (data) => this.emit('ai-monitoring:monitoring-update', data));

    // 连接测试事件
    this.socket.on('connection-test', (data) => this.emit('connection-test', data));
  }

  /**
   * 重新订阅服务
   */
  private resubscribeServices() {
    this.subscriptions.forEach(service => {
      this.subscribeToService(service);
    });
  }

  // ==================== 聊天功能 ====================
  
  /**
   * 订阅聊天服务
   */
  subscribeToChat() {
    this.subscribeToService('chat');
  }

  /**
   * 取消订阅聊天服务
   */
  unsubscribeFromChat() {
    this.unsubscribeFromService('chat');
  }

  /**
   * 发送用户消息
   */
  sendMessage(data: { 
    message: string; 
    conversationId: string; 
    assistantMessageId: string;
    contractAddresses?: string[];
  }) {
    if (!this.socket || !this._isConnected) {
      console.warn('Socket未连接，无法发送消息');
      return;
    }
    const payload = {
      message: data.message,
      conversationId: data.conversationId,
      // 后端兼容字段：统一使用 messageId
      messageId: data.assistantMessageId,
      contractAddresses: data.contractAddresses
    };
    this.socket.emit('send-message', payload);
  }

  /**
   * 订阅指定服务
   */
  subscribeToService(service: string) {
    if (!this.subscriptions.has(service)) {
      this.subscriptions.add(service);
      if (this.socket && this._isConnected) {
        switch (service) {
          case 'chat':
            this.socket.emit('join-conversation', { conversationId: 'default' });
            break;
          default:
            break;
        }
      }
    }
  }

  /**
   * 取消订阅指定服务
   */
  unsubscribeFromService(service: string) {
    if (this.subscriptions.has(service)) {
      this.subscriptions.delete(service);
      if (this.socket && this._isConnected) {
        switch (service) {
          case 'chat':
            this.socket.emit('leave-conversation', { conversationId: 'default' });
            break;
          default:
            break;
        }
      }
    }
  }

  /**
   * 发送Socket.IO事件到服务器（直接）
   */
  emitToServer(event: string, data?: any) {
    if (this.socket) {
      this.socket.emit(event, data);
    } else {
      console.warn('Socket未连接，无法发送事件:', event);
    }
  }

  /**
   * 检查连接状态 (公共方法)
   */
  isConnected(): boolean {
    return this._isConnected && this.socket?.connected === true;
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): ConnectionStatus {
    return {
      isConnected: this._isConnected,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts
    };
  }



  /**
   * 事件总线：注册监听
   */
  on(event: string, callback: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)?.push(callback);
  }

  /**
   * 事件总线：移除监听
   */
  off(event: string, callback?: Function) {
    if (!this.eventListeners.has(event)) return;
    const listeners = this.eventListeners.get(event)!;
    if (callback) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    } else {
      this.eventListeners.set(event, []);
    }
  }

  /**
   * 事件总线：触发事件（并将非内部事件转发到服务器）
   */
  emit(event: string, data?: any) {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error('事件处理错误:', error);
      }
    }

    // 将非内部事件转发到服务器，兼容现有调用方式
    if (!this.internalEvents.has(event) && this.socket && this._isConnected) {
      this.socket.emit(event, data);
    }
  }

  /**
   * 主动建立连接（外部调用）
   */
  connect() {
    if (!this.socket) {
      this.initializeSocket();
      return;
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  /**
   * 主动断开连接
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this._isConnected = false;
    }
  }

  // ==================== 钱包监控功能 ====================
  
  /**
   * 订阅钱包监控
   */
  subscribeToWalletMonitoring(walletAddress: string) {
    if (!this.socket || !this._isConnected) {
      console.warn('Socket未连接，无法订阅钱包监控');
      return;
    }
    this.socket.emit('subscribe-wallet-monitoring', { walletAddress });
  }

  /**
   * 取消订阅钱包监控
   */
  unsubscribeFromWalletMonitoring(walletAddress: string) {
    if (!this.socket || !this._isConnected) {
      console.warn('Socket未连接，无法取消订阅钱包监控');
      return;
    }
    this.socket.emit('unsubscribe-wallet-monitoring', { walletAddress });
  }

  // ==================== 实时交易监控功能 ====================
  
  /**
   * 订阅实时交易监控
   */
  subscribeToRealtimeTransaction(address: string) {
    if (!this.socket || !this._isConnected) {
      console.warn('Socket未连接，无法订阅实时交易监控');
      return;
    }
    this.socket.emit('realtime-transaction:subscribe', { address });
  }

  /**
   * 取消订阅实时交易监控
   */
  unsubscribeFromRealtimeTransaction(address: string) {
    if (!this.socket || !this._isConnected) {
      console.warn('Socket未连接，无法取消订阅实时交易监控');
      return;
    }
    this.socket.emit('realtime-transaction:unsubscribe', { address });
  }

  // ==================== 调试功能 ====================
  
  /**
   * 获取Socket连接调试信息
   */
  getDebugInfo() {
    return {
      socketExists: !!this.socket,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id || null,
      internalConnected: this._isConnected,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.maxReconnectAttempts,
      subscriptions: Array.from(this.subscriptions),
      eventListeners: Array.from(this.eventListeners.keys()),
      socketUrl: this.socket?.io?.opts?.hostname || 'unknown'
    };
  }

  /**
   * 强制重新连接Socket
   */
  forceReconnect() {
    console.log('🔄 强制重新连接Socket...');
    if (this.socket) {
      this.socket.disconnect();
      setTimeout(() => {
        this.socket?.connect();
      }, 1000);
    } else {
      this.initializeSocket();
    }
  }
}

const unifiedSocketService = new UnifiedSocketService();
export default unifiedSocketService;
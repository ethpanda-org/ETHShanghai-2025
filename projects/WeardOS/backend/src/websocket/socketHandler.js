const qwenService = require('../services/qwenService');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.walletMonitoringService = null;
    this.realtimeTransactionService = null;
    this.aiMonitoringRoutes = null;
    
    this.setupEventHandlers();
  }

  setWalletMonitoringService(service) {
    this.walletMonitoringService = service;
    if (service && service.setSocketIO) {
      service.setSocketIO(this.io);
    }
  }

  setRealtimeTransactionService(service) {
    this.realtimeTransactionService = service;
    if (service && service.setSocketIO) {
      service.setSocketIO(this.io);
    }
  }

  setAIMonitoringRoutes(routes) {
    this.aiMonitoringRoutes = routes;
    if (routes && routes.setupSocketIO) {
      routes.setupSocketIO(this.io);
    }
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log('用户连接:', socket.id);

      // 聊天相关事件
      socket.on('join-conversation', (data) => {
        const { conversationId } = data;
        socket.join(conversationId);
        console.log(`用户 ${socket.id} 加入对话 ${conversationId}`);
      });

      socket.on('leave-conversation', (data) => {
        const { conversationId } = data;
        socket.leave(conversationId);
        console.log(`用户 ${socket.id} 离开对话 ${conversationId}`);
      });

      socket.on('send-message', async (data) => {
        const { message, conversationId, messageId } = data;
        console.log('收到消息:', message);
        
        try {
          // 调用Qwen API获取AI回复
          const aiResponse = await qwenService.generateResponse(message, conversationId);
          
          // 模拟流式输出
          const chunks = aiResponse.split('');
          let fullContent = '';
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            fullContent += chunk;
            
            // 发送流式数据块
            socket.emit('ai-response-chunk', {
              chunk: chunk,
              messageId: messageId
            });
            
            // 添加延迟以模拟打字效果
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          // 发送完成信号
          socket.emit('ai-response-complete', {
            messageId: messageId,
            fullContent: fullContent
          });
          
        } catch (error) {
          console.error('AI回复生成失败:', error);
          socket.emit('ai-response-error', {
            messageId: messageId,
            error: '抱歉，AI服务暂时不可用，请稍后再试。'
          });
        }
      });

      // 钱包监控相关事件
      socket.on('wallet-monitoring:subscribe', () => {
        console.log(`用户 ${socket.id} 订阅钱包监控`);
      });

      socket.on('wallet-monitoring:unsubscribe', () => {
        console.log(`用户 ${socket.id} 取消订阅钱包监控`);
      });

      socket.on('wallet-monitoring:add-wallet', (data) => {
        console.log(`用户 ${socket.id} 添加钱包:`, data);
        if (this.walletMonitoringService) {
          // 处理添加钱包逻辑
        }
      });

      // 实时交易监控相关事件
      socket.on('realtime-transaction:subscribe', (data) => {
        console.log(`用户 ${socket.id} 订阅实时交易监控:`, data);
      });

      socket.on('realtime-transaction:unsubscribe', () => {
        console.log(`用户 ${socket.id} 取消订阅实时交易监控`);
      });

      socket.on('realtime-transaction:add-address', (data) => {
        console.log(`用户 ${socket.id} 添加监控地址:`, data);
        if (this.realtimeTransactionService) {
          // 处理添加地址逻辑
        }
      });

      socket.on('realtime-transaction:start-listening', (data) => {
        console.log(`用户 ${socket.id} 开始监听实时交易:`, data);
      });

      // AI监控相关事件
      socket.on('ai-monitoring:subscribe', () => {
        console.log(`用户 ${socket.id} 订阅AI监控`);
      });

      socket.on('ai-monitoring:unsubscribe', () => {
        console.log(`用户 ${socket.id} 取消订阅AI监控`);
      });

      // 测试连接
      socket.on('test-connection', () => {
        socket.emit('connection-test', {
          status: 'success',
          message: 'Socket.IO连接正常',
          timestamp: new Date().toISOString()
        });
      });

      // 断开连接
      socket.on('disconnect', () => {
        console.log('用户断开连接:', socket.id);
      });

      // 错误处理
      socket.on('error', (error) => {
        console.error('Socket错误:', error);
      });
    });
  }
}

module.exports = SocketHandler;
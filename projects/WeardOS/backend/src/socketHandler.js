const qwenService = require('./services/qwenService');
const WalletMonitoringService = require('./services/walletMonitoringService');
const RealtimeTransactionService = require('./services/realtimeTransactionService');
const aiMonitoringRoutes = require('./routes/aiMonitoringRoutes');
const contractParsingService = require('./services/contractParsingService');
const logger = require('./utils/logger');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.walletService = new WalletMonitoringService();
    this.transactionService = new RealtimeTransactionService();
    
    // 设置服务的Socket.IO实例
    this.walletService.setSocketIO(io);
    this.transactionService.setSocketIO(io);
    
    // 设置AI监控路由的Socket.IO
    if (aiMonitoringRoutes.setupSocketIO) {
      aiMonitoringRoutes.setupSocketIO(io);
    }
    
    this.setupSocketHandlers();
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info(`✅ 用户连接成功: ${socket.id}, 传输方式: ${socket.conn.transport.name}`);

      // 聊天功能 - 加入对话房间
      socket.on('join-conversation', (conversationId) => {
        socket.join(conversationId);
        logger.info(`用户 ${socket.id} 加入对话 ${conversationId}`);
      });

      // 聊天功能 - 离开对话房间
      socket.on('leave-conversation', (conversationId) => {
        socket.leave(conversationId);
        logger.info(`用户 ${socket.id} 离开对话 ${conversationId}`);
      });

      // 聊天功能 - 发送消息
      socket.on('send-message', async (data) => {
        try {
          const { conversationId, message, messageId, contractAddresses } = data;
          
          logger.info(`收到消息: ${message.slice(0, 100)}...`);

          let processedMessage = message;

          // 如果检测到合约地址，进行合约解析
          if (contractAddresses && contractAddresses.length > 0) {
            logger.info(`检测到合约地址: ${contractAddresses.join(', ')}`);
            try {
              processedMessage = await contractParsingService.enhanceMessageWithContractAnalysis(
                message, 
                contractAddresses
              );
              logger.info('合约解析完成，消息已增强');
            } catch (contractError) {
              logger.error('合约解析失败:', contractError);
              processedMessage = message + '\n\n⚠️ 合约解析服务暂时不可用，请稍后再试。';
            }
          }

          // 获取AI回复（流式）
          try {
            const response = await qwenService.chatStream(processedMessage, {
              onChunk: (chunk) => {
                // 实时发送AI回复片段
                socket.emit('ai-response-chunk', {
                  conversationId,
                  messageId,
                  chunk
                });
              }
            });

            // 发送完整回复
            socket.emit('ai-response-complete', {
              conversationId,
              messageId,
              fullContent: response.content
            });

          } catch (aiError) {
            logger.error('AI回复错误:', aiError);
            socket.emit('ai-response-error', {
              conversationId,
              messageId,
              error: aiError.message
            });
          }

        } catch (error) {
          logger.error('发送消息错误:', error);
          socket.emit('error', {
            message: '发送消息失败',
            error: error.message
          });
        }
      });

      // 钱包监控功能
      socket.on('wallet-monitoring:subscribe', () => {
        socket.join('wallet-monitoring');
        // 发送当前监控数据
        socket.emit('wallet-monitoring:initial-data', this.walletService.getMonitoringData());
        logger.info(`用户 ${socket.id} 订阅钱包监控`);
      });

      socket.on('wallet-monitoring:unsubscribe', () => {
        socket.leave('wallet-monitoring');
        logger.info(`用户 ${socket.id} 取消订阅钱包监控`);
      });

      socket.on('wallet-monitoring:add-wallet', async (walletData) => {
        try {
          await this.walletService.addWallet(walletData);
          socket.emit('wallet-monitoring:wallet-added', { success: true });
        } catch (error) {
          socket.emit('wallet-monitoring:error', { message: error.message });
        }
      });

      // 实时交易监控功能
      socket.on('realtime-transaction:subscribe', () => {
        socket.join('realtime-transaction');
        // 发送当前状态和最近交易
        socket.emit('realtime-transaction:initial-data', {
          status: this.transactionService.getStatus(),
          recentTransactions: this.transactionService.getRecentTransactions(20)
        });
        logger.info(`用户 ${socket.id} 订阅实时交易监控`);
      });

      socket.on('realtime-transaction:unsubscribe', () => {
        socket.leave('realtime-transaction');
        logger.info(`用户 ${socket.id} 取消订阅实时交易监控`);
      });

      socket.on('realtime-transaction:add-address', (address) => {
        try {
          this.transactionService.addMonitoredAddress(address);
          socket.emit('realtime-transaction:address-added', { success: true });
        } catch (error) {
          socket.emit('realtime-transaction:error', { message: error.message });
        }
      });

      socket.on('realtime-transaction:start-listening', async () => {
        try {
          await this.transactionService.startListening();
          socket.emit('realtime-transaction:listening-started', { success: true });
        } catch (error) {
          socket.emit('realtime-transaction:error', { message: error.message });
        }
      });

      // AI监控功能订阅
      socket.on('ai-monitoring:subscribe', () => {
        socket.join('ai-monitoring');
        logger.info(`用户 ${socket.id} 订阅AI监控`);
      });

      socket.on('ai-monitoring:unsubscribe', () => {
        socket.leave('ai-monitoring');
        logger.info(`用户 ${socket.id} 取消订阅AI监控`);
      });

      // 测试连接
      socket.on('test-connection', () => {
        socket.emit('connection-test', {
          success: true,
          message: '连接正常',
          timestamp: new Date().toISOString()
        });
      });

      // 断开连接
      socket.on('disconnect', (reason) => {
        logger.info(`❌ 用户断开连接: ${socket.id}, 原因: ${reason}`);
      });

      // 连接错误处理
      socket.on('error', (error) => {
        logger.error(`Socket错误 ${socket.id}:`, error);
      });
    });
  }
}

module.exports = SocketHandler;
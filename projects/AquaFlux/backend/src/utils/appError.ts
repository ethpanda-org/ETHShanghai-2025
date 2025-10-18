/**
 * 自定义应用程序错误类
 * 用于创建可预期的、操作性的错误，这些错误将被全局错误处理器捕获并以标准格式响应给客户端。
 */
class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  /**
   * @param message 错误信息，将发送给客户端
   * @param statusCode HTTP状态码 (例如: 404, 400)
   */
  constructor(message: string, statusCode: number, isOperational = true) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    // 捕获堆栈跟踪，不包括构造函数调用
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import AppError from '@/utils/appError';
import logger from '@/lib/logger';
import { config } from '@/config';

// --- Specific Error Handlers ---

const handleZodError = (err: ZodError): AppError => {
  const errors = err.issues.map(issue => `${issue.path.join('.')} - ${issue.message}`).join('; ');
  const message = `输入验证失败: ${errors}`;
  return new AppError(message, 400);
};

const handleJWTError = (): AppError => new AppError('无效的令牌，请重新登录。', 401);

const handleJWTExpiredError = (): AppError => new AppError('您的会话已过期，请重新登录。', 401);

const handlePrismaDuplicateFieldsError = (err: Prisma.PrismaClientKnownRequestError): AppError => {
  const fields = (err.meta?.target as string[])?.join(', ');
  const message = `数据库中已存在相同的字段值: ${fields}。请使用不同的值。`;
  return new AppError(message, 409); // 409 Conflict
};

const handlePrismaRecordNotFoundError = (err: Prisma.PrismaClientKnownRequestError): AppError => {
  const message = `未找到相关记录: ${err.meta?.cause || '请检查您的输入'}`;
  return new AppError(message, 404);
};

// --- Main Error Handling Logic ---

export const globalErrorHandler = (err: any, _req: Request, res: Response, _next: NextFunction) => {
  // Attach the error to the response object so pino-http can log it
  res.err = err;

  let error = err;

  // Convert non-AppError errors into AppError
  if (!(error instanceof AppError)) {
    if (error instanceof ZodError) {
      error = handleZodError(error);
    } else if (error.name === 'JsonWebTokenError') {
      error = handleJWTError();
    } else if (error.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        error = handlePrismaDuplicateFieldsError(error);
      } else if (error.code === 'P2025') {
        error = handlePrismaRecordNotFoundError(error);
      } else {
        // For other known Prisma errors, treat as a server error
        logger.error(error, 'Unhandled Prisma Known Request Error');
        error = new AppError('数据库操作失败，请稍后再试。', 500, false);
      }
    } else {
      // For all other unknown errors, log them and create a generic server error
      logger.error(error, 'An unexpected error occurred');
      error = new AppError('服务器发生未知错误，请稍后再试。', 500, false);
    }
  }

  // At this point, 'error' is always an AppError
  const { statusCode, status, message, isOperational } = error as AppError;

  // For production, if the error is not operational, we don't leak the message
  const responseMessage = config.nodeEnv === 'production' && !isOperational 
    ? '服务器发生未知错误，请稍后再试。' 
    : message;

  const responseBody: { status: string; message: string; stack?: string; errors?: any } = {
    status: status,
    message: responseMessage,
  };

  // Add stack trace in development for all errors
  if (config.nodeEnv === 'development') {
    responseBody.stack = err.stack;
    // Optionally add the original error object for deeper debugging
    // responseBody.errors = err;
  }

  res.status(statusCode).json(responseBody);
};

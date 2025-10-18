import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { Role, User } from '@prisma/client';

/**
 * 带有用户信息的请求类型。
 * 
 * 我们使用交叉类型（Intersection Type）将自定义的 `user` 属性添加到 Express 的 `Request` 类型上。
 * 这种方法比使用接口继承（extends）或全局声明合并（declaration merging）更明确、更不容易出错，
 * 它可以确保我们不会意外丢失原始 `Request` 类型中的任何属性（如 `body`、`params` 等）。
 */
export type RequestWithUser = ExpressRequest & {
  user: Omit<User, 'password'>; // 包含除密码外的所有用户信息
};

// 控制器方法类型定义
export type ControllerMethod = (
  req: ExpressRequest,
  res: ExpressResponse,
  next?: NextFunction
) => Promise<void> | void;

// 中间件类型定义
export type Middleware = (
  req: ExpressRequest, 
  res: ExpressResponse, 
  next: NextFunction
) => void | Promise<void>;

// 错误处理中间件类型定义
export type ErrorMiddleware = (
  err: any, 
  req: ExpressRequest, 
  res: ExpressResponse, 
  next: NextFunction
) => void | Promise<void>;

// 错误接口
export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

// JWT相关类型
export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

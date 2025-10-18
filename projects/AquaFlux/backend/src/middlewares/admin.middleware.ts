import { Request, Response, NextFunction } from 'express';
import { RequestWithUser } from '@/types/express';
import AppError from '@/utils/appError';

export const adminMiddleware = (
  req: Request, // 接收标准的 Request
  _res: Response,
  next: NextFunction
) => {
  const user = (req as RequestWithUser).user;

  // 检查用户是否存在且为管理员
  if (!user || user.role !== 'ADMIN') {
    return next(new AppError('您没有权限执行此操作', 403));
  }

  // 如果是管理员，继续执行后续操作
  next();
};

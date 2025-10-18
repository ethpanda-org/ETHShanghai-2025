import { Request, Response, NextFunction } from 'express';
import { verify as verifyJwt } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { config } from '@/config';
import { RequestWithUser, JwtPayload } from '@/types/express';
import AppError from '@/utils/appError';

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('您未登录，请先登录', 401));
    }
    const token = authHeader.split(' ')[1];

    const decoded = verifyJwt(token, config.jwt.secret) as JwtPayload;

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!currentUser) {
      return next(new AppError('此token关联的用户不存在', 401));
    }

    // 使用类型断言来扩展请求对象
    (req as RequestWithUser).user = currentUser;
    next();
  } catch (error) {
    return next(new AppError('Token无效或已过期', 401));
  }
};

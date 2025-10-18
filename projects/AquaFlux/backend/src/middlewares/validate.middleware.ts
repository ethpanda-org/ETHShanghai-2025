import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import AppError from '@/utils/appError';

export const validate = (schema: AnyZodObject) => (req: Request, _res: Response, next: NextFunction) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    return next();
  } catch (error) {
    if (error instanceof ZodError) {
      return next(error);
    }
    // 处理其他意外错误
    return next(new AppError('内部服务器错误', 500));
  }
};

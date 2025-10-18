import { NextFunction, Request, Response, RequestHandler } from 'express';

/**
 * 定义一个通用的异步控制器方法类型。
 * 它接受一个泛型 T，该泛型约束为 Express 的 Request 类型。
 * 这使得控制器方法可以明确指定它们期望的请求类型（例如，RequestWithUser）。
 */
type GenericControllerMethod<T extends Request> = (
  req: T,
  res: Response,
) => Promise<void>;

/**
 * 包装异步控制器方法，以捕获任何可能发生的错误，并将其传递给 Express 的 next() 函数。
 * 这样，错误就可以被全局错误处理中间件统一处理。
 *
 * @param fn - 要包装的异步控制器方法。该方法可以是通用的，以处理自定义的 Request 类型。
 * @returns - 返回一个标准的 Express RequestHandler。
 */
export const catchAsync = <T extends Request>(
    fn: GenericControllerMethod<T>
  ): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 我们在这里将 req 断言为 T 类型。这是类型安全的，
    // 因为我们期望像 authMiddleware 这样的前置中间件已经验证并附加了必要的属性（例如 user）。
    Promise.resolve(fn(req as T, res)).catch((err) => next(err));
  };
};

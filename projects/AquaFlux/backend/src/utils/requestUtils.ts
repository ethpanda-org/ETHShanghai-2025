import { RequestWithUser } from '@/types/express';
import AppError from '@/utils/appError';

/**
 * 从请求对象中安全地提取用户ID。
 * 如果在请求中找不到用户或用户ID，则抛出401未授权错误。
 * @param req Express请求对象，应包含user属性。
 * @param errorMessage 可选的自定义错误消息。
 * @returns 经过验证的当前登录用户的ID。
 */
export function getUserIdFromRequest(req: RequestWithUser, errorMessage?: string): string {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError(errorMessage ?? 'Unauthorized. Please log in to continue.', 401);
  }
  return userId;
}

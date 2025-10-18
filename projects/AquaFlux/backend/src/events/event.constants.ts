/**
 * @file 事件常量
 * @description 定义系统中所有领域事件的名称，以常量形式管理，避免魔法字符串。
 */

export const EventConstants = {
  // 支付相关事件
  PAYMENT_COMPLETED: 'payment.completed',
  PAYMENT_FAILED: 'payment.failed',

  // 用户相关事件
  USER_REGISTERED: 'user.registered',
};

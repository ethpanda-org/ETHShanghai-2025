/**
 * @notice 格式化截止时间
 * @param deadline 截止时间（秒）
 * @returns 格式化的日期时间字符串
 */
export const formatDeadline = (deadline: string) => {
  const date = new Date(Number(deadline) * 1000);
  return date.toLocaleString();
};

/**
 * @notice 格式化创建时间
 * @param createdAt 创建时间（秒）
 * @returns 格式化的日期时间字符串
 */
export const formatCreatedAt = (createdAt: string) => {
  const date = new Date(Number(createdAt) * 1000);
  return date.toLocaleString();
};

/**
 * @notice 获取任务奖励
 * @param reward 任务奖励（wei）
 * @returns 任务奖励（ether）
 */
export const formatReward = (reward: string) => {
  // 检查reward是否有效
  if (!reward) return "0";

  // 将reward从wei转换为ether（除以1e18）
  try {
    const rewardInEther = BigInt(reward) / BigInt(1e18);
    return rewardInEther.toString();
  } catch (e) {
    console.error("Error formatting reward:", e);
    return "0";
  }
};

/**
 * @notice 获取固定支付任务状态的颜色类
 * @param status 任务状态字符串
 * @returns 对应的Tailwind CSS颜色类
 */
export const getTaskStatusColor = (status: string) => {
  switch (status) {
    case "Open": // Open
      return "badge-success";
    case "InProgress": // InProgress
      return "badge-warning";
    case "Completed": // Completed
      return "badge-info";
    case "Paid": // Paid
      return "badge-primary";
    case "Cancelled": // Cancelled
      return "badge-error";
    default:
      return "badge-ghost";
  }
};

// 获取纠纷状态的显示颜色
export const getDisputeStatusColor = (status: string) => {
  switch (status) {
    case "Filed":
      return "badge-info";
    case "Resolved":
      return "badge-warning";
    case "Distributed":
      return "badge-success";
    default:
      return "badge-ghost";
  }
};

/**
 * 获取状态显示文本
 */
export const getStatusText = (status: string) => {
  switch (status) {
    case "Filed":
      return "已提交";
    case "Resolved":
      return "已解决";
    case "Distributed":
      return "已分配";
    default:
      return "未知";
  }
};

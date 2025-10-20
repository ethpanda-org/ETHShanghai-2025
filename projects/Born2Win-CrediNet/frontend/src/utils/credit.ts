export interface CreditDimensions {
  keystone: number
  ability: number
  finance: number
  health: number
  behavior: number
}

/**
 * 计算信用总分（加权）
 * 统一所有使用场景，避免链上/链下数据不一致
 */
export const calculateCreditTotal = (dimensions: CreditDimensions): number => {
  const total =
    dimensions.keystone * 2.5 + // 25% 权重
    dimensions.ability * 3.0 + // 30% 权重
    dimensions.finance * 2.0 + // 20% 权重
    dimensions.health * 1.5 + // 15% 权重
    dimensions.behavior * 1.0 // 10% 权重

  return Math.round(total)
}

/**
 * 判断链上返回的维度数据是否有效
 * 若全部为 0 则视为未初始化
 */
export const hasValidCreditDimensions = (dimensions: CreditDimensions): boolean => {
  return (
    dimensions.keystone > 0 ||
    dimensions.ability > 0 ||
    dimensions.finance > 0 ||
    dimensions.health > 0 ||
    dimensions.behavior > 0
  )
}

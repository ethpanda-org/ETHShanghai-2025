package reputation

// ScoreTier 评分等级
type ScoreTier string

const (
	TierPoor      ScoreTier = "差" // 0-60
	TierGood      ScoreTier = "良" // 60-80
	TierExcellent ScoreTier = "优" // 80-100
)

// 敏感区间定义
const (
	ThresholdPoorGood      = 60.0 // 差->良 阈值
	ThresholdGoodExcellent = 80.0 // 良->优 阈值

	// 敏感区间范围 (±5分)
	SensitiveRange = 5.0

	// 敏感区间: 55-65 和 75-85
	SensitiveLowerBound1 = ThresholdPoorGood - SensitiveRange      // 55
	SensitiveUpperBound1 = ThresholdPoorGood + SensitiveRange      // 65
	SensitiveLowerBound2 = ThresholdGoodExcellent - SensitiveRange // 75
	SensitiveUpperBound2 = ThresholdGoodExcellent + SensitiveRange // 85
)

// GetScoreTier 获取分数对应的等级
func GetScoreTier(score float64) ScoreTier {
	if score >= ThresholdGoodExcellent {
		return TierExcellent
	}
	if score >= ThresholdPoorGood {
		return TierGood
	}
	return TierPoor
}

// IsInSensitiveZone 判断分数是否在敏感区间
func IsInSensitiveZone(score float64) bool {
	// 第一个敏感区间: 55-65
	if score >= SensitiveLowerBound1 && score <= SensitiveUpperBound1 {
		return true
	}
	// 第二个敏感区间: 75-85
	if score >= SensitiveLowerBound2 && score <= SensitiveUpperBound2 {
		return true
	}
	return false
}

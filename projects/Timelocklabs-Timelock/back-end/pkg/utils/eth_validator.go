package utils

import "regexp"

var (
	txHashRegex = regexp.MustCompile(`^0x[0-9a-fA-F]{64}$`)
)

// IsValidTxHash 验证交易哈希
func IsValidTxHash(hash string) bool {
	return txHashRegex.MatchString(hash)
}

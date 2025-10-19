package utils

import (
	"regexp"
)

var (
	emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	codeRegex  = regexp.MustCompile(`^\d{6}$`)
)

// IsValidEmail 验证邮箱
func IsValidEmail(email string) bool {
	if len(email) == 0 || len(email) > 200 {
		return false
	}
	return emailRegex.MatchString(email)
}

// IsValidVerificationCode 验证验证码
func IsValidVerificationCode(code string) bool {
	return codeRegex.MatchString(code)
}

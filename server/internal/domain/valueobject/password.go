package valueobject

import (
	"unicode"

	"xoberon-server/internal/domain/errs"

	"golang.org/x/crypto/bcrypt"
)

const (
	minPasswordLen    = 8
	maxPasswordLen    = 72 // bcrypt 上限
	defaultBcryptCost = 12
)

var bcryptCost = defaultBcryptCost

// SetBcryptCost 允许在应用启动时配置 bcrypt cost，范围 [10, 31]
func SetBcryptCost(cost int) {
	if cost >= 10 && cost <= 31 {
		bcryptCost = cost
	}
}

// Password 密码值对象，内部永远存储 bcrypt hash，明文不可能泄漏
type Password struct {
	hash string
}

// NewPassword 从明文创建，自动哈希
func NewPassword(raw string) (Password, error) {
	if len(raw) < minPasswordLen {
		return Password{}, errs.Validationf("密码至少 %d 位", minPasswordLen)
	}
	if len(raw) > maxPasswordLen {
		return Password{}, errs.Validationf("密码不能超过 %d 位", maxPasswordLen)
	}

	var hasUpper, hasLower, hasDigit bool
	for _, r := range raw {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}
	if !hasUpper || !hasLower || !hasDigit {
		return Password{}, errs.Validation("密码必须包含大写字母、小写字母和数字")
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(raw), bcryptCost)
	if err != nil {
		return Password{}, errs.Wrap(errs.CodeInternal, "密码哈希失败", err)
	}
	return Password{hash: string(hash)}, nil
}

// LoadPassword 从数据库加载已有 hash
func LoadPassword(hash string) Password {
	return Password{hash: hash}
}

// Verify 校验明文是否匹配
func (p Password) Verify(raw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(p.hash), []byte(raw)) == nil
}

// Hash 返回 bcrypt hash（仅供持久化使用）
func (p Password) Hash() string { return p.hash }

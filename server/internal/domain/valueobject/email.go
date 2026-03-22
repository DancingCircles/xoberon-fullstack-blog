package valueobject

import (
	"regexp"
	"strings"

	"xoberon-server/internal/domain/errs"
)

var emailRegex = regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)

// Email 邮箱值对象，构造即合法
type Email struct {
	value string
}

func NewEmail(raw string) (Email, error) {
	raw = strings.TrimSpace(strings.ToLower(raw))
	if raw == "" {
		return Email{}, errs.Validation("邮箱不能为空")
	}
	if !emailRegex.MatchString(raw) {
		return Email{}, errs.Validation("邮箱格式不合法")
	}
	return Email{value: raw}, nil
}

// LoadEmail 从数据库加载时使用，跳过校验（信任已存储数据）
func LoadEmail(raw string) Email {
	return Email{value: raw}
}

func (e Email) String() string { return e.value }
func (e Email) IsZero() bool   { return e.value == "" }

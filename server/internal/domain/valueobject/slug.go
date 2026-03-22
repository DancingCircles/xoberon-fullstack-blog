package valueobject

import (
	"crypto/rand"
	"encoding/hex"
	"regexp"
	"strings"
	"unicode"

	"xoberon-server/internal/domain/errs"
)

var (
	// 保留 Unicode 字母、数字，其余替换为 -
	nonSlugChar = regexp.MustCompile(`[^\p{L}\p{N}]+`)
	trimDash    = regexp.MustCompile(`(^-|-$)`)
)

// Slug URL 友好的短标识，自动从标题生成
type Slug struct {
	value string
}

func NewSlug(title string) (Slug, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		return Slug{}, errs.Validation("无法从空标题生成 slug")
	}

	s := strings.Map(func(r rune) rune {
		if unicode.IsUpper(r) {
			return unicode.ToLower(r)
		}
		return r
	}, title)
	s = nonSlugChar.ReplaceAllString(s, "-")
	s = trimDash.ReplaceAllString(s, "")

	if s == "" {
		return Slug{}, errs.Validation("标题无法生成有效的 slug")
	}

	// 附加 4 字节随机后缀防止碰撞
	suffix, err := randomHex(4)
	if err != nil {
		return Slug{}, errs.Wrap(errs.CodeInternal, "生成 slug 后缀失败", err)
	}
	s = s + "-" + suffix

	return Slug{value: s}, nil
}

// LoadSlug 从数据库加载
func LoadSlug(raw string) Slug {
	return Slug{value: raw}
}

func (s Slug) String() string { return s.value }
func (s Slug) IsZero() bool   { return s.value == "" }

func randomHex(n int) (string, error) {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

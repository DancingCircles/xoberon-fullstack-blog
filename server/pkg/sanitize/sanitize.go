package sanitize

import (
	"sync"

	"github.com/microcosm-cc/bluemonday"
)

var (
	policy *bluemonday.Policy
	once   sync.Once
)

func ugcPolicy() *bluemonday.Policy {
	once.Do(func() {
		policy = bluemonday.UGCPolicy()
	})
	return policy
}

// HTML 使用 bluemonday UGC 策略过滤不安全的 HTML 标签和属性，
// 保留安全的格式化标签（p/b/i/a/img/code/pre 等）。
func HTML(input string) string {
	return ugcPolicy().Sanitize(input)
}

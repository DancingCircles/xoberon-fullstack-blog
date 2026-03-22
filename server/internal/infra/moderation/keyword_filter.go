package moderation

import (
	"context"
	"strings"
	"unicode"

	"xoberon-server/internal/domain/service"
)

// trieNode DFA 前缀树节点
type trieNode struct {
	children map[rune]*trieNode
	fail     *trieNode // Aho-Corasick 失败指针
	label    string    // 叶子节点携带的风险标签
	end      bool
}

// KeywordFilter 基于 DFA（Aho-Corasick 自动机）的关键词过滤器。
// 同步匹配，延迟 <1ms，零外部依赖。
type KeywordFilter struct {
	root *trieNode
}

// NewKeywordFilter 构建关键词过滤器，keywords key 为敏感词，value 为标签。
func NewKeywordFilter(keywords map[string]string) *KeywordFilter {
	kf := &KeywordFilter{root: &trieNode{children: make(map[rune]*trieNode)}}
	for word, label := range keywords {
		kf.insert(strings.ToLower(word), label)
	}
	kf.buildFail()
	return kf
}

func (kf *KeywordFilter) insert(word, label string) {
	cur := kf.root
	for _, r := range word {
		if cur.children[r] == nil {
			cur.children[r] = &trieNode{children: make(map[rune]*trieNode)}
		}
		cur = cur.children[r]
	}
	cur.end = true
	cur.label = label
}

// buildFail 构建 Aho-Corasick 失败指针（BFS）
func (kf *KeywordFilter) buildFail() {
	queue := make([]*trieNode, 0)
	for _, child := range kf.root.children {
		child.fail = kf.root
		queue = append(queue, child)
	}
	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		for r, child := range cur.children {
			fail := cur.fail
			for fail != nil && fail.children[r] == nil {
				fail = fail.fail
			}
			if fail == nil {
				child.fail = kf.root
			} else {
				child.fail = fail.children[r]
			}
			if child.fail.end && !child.end {
				child.end = true
				child.label = child.fail.label
			}
			queue = append(queue, child)
		}
	}
}

// Check 实现 ContentModerator 接口
func (kf *KeywordFilter) Check(_ context.Context, text string) (*service.ModerationResult, error) {
	text = normalize(text)
	cur := kf.root
	labels := make(map[string]bool)

	for _, r := range text {
		for cur != kf.root && cur.children[r] == nil {
			cur = cur.fail
		}
		if next := cur.children[r]; next != nil {
			cur = next
		}
		if cur.end {
			labels[cur.label] = true
		}
	}

	if len(labels) > 0 {
		unique := make([]string, 0, len(labels))
		for l := range labels {
			unique = append(unique, l)
		}
		return &service.ModerationResult{
			Decision: service.DecisionReject,
			Reason:   "内容包含违规关键词",
			Labels:   unique,
		}, nil
	}
	return &service.ModerationResult{Decision: service.DecisionApprove}, nil
}

// normalize 将文本统一为小写并去除空白/标点干扰
func normalize(s string) string {
	s = strings.ToLower(s)
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}

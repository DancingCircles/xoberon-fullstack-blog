package moderation

import (
	"context"

	"go.uber.org/zap"

	"xoberon-server/internal/domain/service"
	"xoberon-server/pkg/logger"
)

// CompositeModerator 组合审核策略：
//  1. DFA 关键词命中 → 直接拒绝
//  2. DFA 未命中 + 通义千问可用 → 调用 AI 审核
//  3. AI 失败/超时 → 降级放行（仅依赖 DFA 结果）
type CompositeModerator struct {
	keyword *KeywordFilter
	ai      *QwenModerator // nil 表示 AI 审核未配置
}

func NewCompositeModerator(keyword *KeywordFilter, ai *QwenModerator) *CompositeModerator {
	return &CompositeModerator{keyword: keyword, ai: ai}
}

func (c *CompositeModerator) Check(ctx context.Context, text string) (*service.ModerationResult, error) {
	result, err := c.keyword.Check(ctx, text)
	if err != nil {
		return nil, err
	}
	if result.IsReject() {
		return result, nil
	}

	if c.ai == nil {
		return result, nil
	}

	aiResult, err := c.ai.Check(ctx, text)
	if err != nil {
		logger.L().Warn("qwen_moderation_fallback",
			zap.Error(err),
			zap.String("action", "降级放行"),
		)
		return result, nil
	}

	return aiResult, nil
}

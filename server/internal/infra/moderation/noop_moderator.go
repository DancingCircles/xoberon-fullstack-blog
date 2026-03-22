package moderation

import (
	"context"

	"xoberon-server/internal/domain/service"
)

// NoopModerator 空实现，开发环境跳过审核。
type NoopModerator struct{}

func NewNoopModerator() *NoopModerator {
	return &NoopModerator{}
}

func (n *NoopModerator) Check(_ context.Context, _ string) (*service.ModerationResult, error) {
	return &service.ModerationResult{Decision: service.DecisionApprove}, nil
}

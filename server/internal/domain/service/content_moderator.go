package service

import "context"

// Decision 三态审核决策
const (
	DecisionApprove = "approve" // AI 确定合规，自动通过
	DecisionReview  = "review"  // AI 拿不准，交人工审核
	DecisionReject  = "reject"  // AI 确定违规，自动删除
)

// ModerationResult 审核结果
type ModerationResult struct {
	Decision string   // "approve" / "review" / "reject"
	Reason   string   // 原因说明（approve 时通常为空）
	Labels   []string // 风险标签，如 ["politics", "porn"]
}

// IsReject 判断是否为确定违规
func (r *ModerationResult) IsReject() bool {
	return r.Decision == DecisionReject
}

// ContentModerator 内容审核接口，定义在 Domain 层，实现在 Infra 层。
type ContentModerator interface {
	Check(ctx context.Context, text string) (*ModerationResult, error)
}

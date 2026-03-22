package repository

import (
	"context"

	"github.com/google/uuid"
)

// ViewRepository 用户阅读记录
type ViewRepository interface {
	// Upsert 记录或更新阅读时间（幂等）
	Upsert(ctx context.Context, userID, postID uuid.UUID) error
	// ListRecentPostIDs 获取用户最近阅读的文章 ID
	ListRecentPostIDs(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error)
}

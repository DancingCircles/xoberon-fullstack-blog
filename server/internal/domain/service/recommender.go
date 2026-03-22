package service

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

// RecommendRequest 推荐请求参数
type RecommendRequest struct {
	UserID         *uuid.UUID  // nil 表示匿名用户
	Limit          int         // 推荐数量，默认 5
	ExcludePostIDs []uuid.UUID // 排除的文章 ID（如当前正在阅读的文章）
}

// Recommender 文章推荐接口，定义在 Domain 层，实现在 Infra 层。
type Recommender interface {
	Recommend(ctx context.Context, req RecommendRequest) ([]*entity.Post, error)
}

package repository

import (
	"context"

	"github.com/google/uuid"
)

type TargetType string

const (
	TargetPost  TargetType = "post"
	TargetEssay TargetType = "essay"
)

type LikeRepository interface {
	// Toggle 切换点赞状态，在事务内原子更新并返回最新 like_count
	Toggle(ctx context.Context, userID, targetID uuid.UUID, targetType TargetType) (liked bool, likeCount int, err error)
	// Exists 查询是否已点赞
	Exists(ctx context.Context, userID, targetID uuid.UUID, targetType TargetType) (bool, error)
	// ListByUser 获取用户点赞过的目标 ID 列表
	ListByUser(ctx context.Context, userID uuid.UUID, targetType TargetType) ([]uuid.UUID, error)
}

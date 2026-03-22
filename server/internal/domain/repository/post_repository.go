package repository

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

type PostFilter struct {
	Category *string
	AuthorID *uuid.UUID
	Tag      *string
	Keyword  *string
}

type PostRepository interface {
	Save(ctx context.Context, post *entity.Post) error
	Update(ctx context.Context, post *entity.Post) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Post, error)
	FindBySlug(ctx context.Context, slug string) (*entity.Post, error)
	List(ctx context.Context, filter PostFilter, page, size int) ([]*entity.Post, int64, error)
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateLikeCount(ctx context.Context, id uuid.UUID, delta int) error
	UpdateReviewStatus(ctx context.Context, id uuid.UUID, status string) error
	ListAllSlugs(ctx context.Context) ([]string, error)
	// ListForRecommendation 获取候选推荐文章（按创建时间倒序，排除指定 ID）
	ListForRecommendation(ctx context.Context, excludeIDs []uuid.UUID, limit int) ([]*entity.Post, error)
}

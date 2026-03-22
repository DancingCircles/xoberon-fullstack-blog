package repository

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

type CommentRepository interface {
	Save(ctx context.Context, comment *entity.Comment) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Comment, error)
	ListByPost(ctx context.Context, postID uuid.UUID, page, size int) ([]*entity.Comment, error)
	Delete(ctx context.Context, id uuid.UUID) error
	CountByPost(ctx context.Context, postID uuid.UUID) (int64, error)
}

package repository

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

type EssayFilter struct {
	Keyword  *string
	AuthorID *uuid.UUID
}

type EssayRepository interface {
	Save(ctx context.Context, essay *entity.Essay) error
	Update(ctx context.Context, essay *entity.Essay) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Essay, error)
	List(ctx context.Context, filter EssayFilter, page, size int) ([]*entity.Essay, int64, error)
	Delete(ctx context.Context, id uuid.UUID) error
	UpdateLikeCount(ctx context.Context, id uuid.UUID, delta int) error
}

package repository

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

type ContactRepository interface {
	Save(ctx context.Context, contact *entity.Contact) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.Contact, error)
	List(ctx context.Context, page, size int) ([]*entity.Contact, int64, error)
	MarkRead(ctx context.Context, id uuid.UUID) error
}

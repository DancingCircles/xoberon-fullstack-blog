package command

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/repository"
)

type RecordViewCommand struct {
	UserID uuid.UUID
	PostID uuid.UUID
}

type RecordViewHandler struct {
	views repository.ViewRepository
	posts repository.PostRepository
}

func NewRecordViewHandler(views repository.ViewRepository, posts repository.PostRepository) *RecordViewHandler {
	return &RecordViewHandler{views: views, posts: posts}
}

func (h *RecordViewHandler) Handle(ctx context.Context, cmd RecordViewCommand) error {
	if _, err := h.posts.FindByID(ctx, cmd.PostID); err != nil {
		return err
	}
	return h.views.Upsert(ctx, cmd.UserID, cmd.PostID)
}

package query

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type ListCommentsByPostQuery struct {
	PostID   uuid.UUID
	Page     int
	PageSize int
}

type ListCommentsByPostHandler struct {
	comments repository.CommentRepository
}

func NewListCommentsByPostHandler(comments repository.CommentRepository) *ListCommentsByPostHandler {
	return &ListCommentsByPostHandler{comments: comments}
}

func (h *ListCommentsByPostHandler) Handle(ctx context.Context, q ListCommentsByPostQuery) ([]*entity.Comment, int64, error) {
	items, err := h.comments.ListByPost(ctx, q.PostID, q.Page, q.PageSize)
	if err != nil {
		return nil, 0, err
	}
	total, err := h.comments.CountByPost(ctx, q.PostID)
	if err != nil {
		return nil, 0, err
	}
	return items, total, nil
}

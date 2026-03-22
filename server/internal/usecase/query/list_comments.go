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

func (h *ListCommentsByPostHandler) Handle(ctx context.Context, q ListCommentsByPostQuery) ([]*entity.Comment, error) {
	return h.comments.ListByPost(ctx, q.PostID, q.Page, q.PageSize)
}

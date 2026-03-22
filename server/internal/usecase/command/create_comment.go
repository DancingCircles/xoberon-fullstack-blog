package command

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/service"
	"xoberon-server/pkg/logger"
)

type CreateCommentCommand struct {
	PostID   uuid.UUID
	AuthorID uuid.UUID
	Content  string
}

type CreateCommentHandler struct {
	comments  repository.CommentRepository
	posts     repository.PostRepository
	cache     repository.PostCachePort
	moderator service.ContentModerator
}

func NewCreateCommentHandler(comments repository.CommentRepository, posts repository.PostRepository, cache repository.PostCachePort, moderator service.ContentModerator) *CreateCommentHandler {
	return &CreateCommentHandler{comments: comments, posts: posts, cache: cache, moderator: moderator}
}

func (h *CreateCommentHandler) Handle(ctx context.Context, cmd CreateCommentCommand) (*entity.Comment, error) {
	post, err := h.posts.FindByID(ctx, cmd.PostID)
	if err != nil {
		return nil, err
	}

	result, err := h.moderator.Check(ctx, cmd.Content)
	if err != nil {
		return nil, fmt.Errorf("内容审核服务异常: %w", err)
	}
	if result.IsReject() {
		return nil, errs.Validationf("内容不合规: %s", result.Reason)
	}

	comment, err := entity.NewComment(cmd.PostID, cmd.AuthorID, cmd.Content)
	if err != nil {
		return nil, err
	}

	if err := h.comments.Save(ctx, comment); err != nil {
		return nil, err
	}

	if err := h.cache.InvalidatePost(ctx, post.Slug()); err != nil {
		logger.L().Warn("cache_invalidate_failed", zap.String("op", "create_comment"), zap.Error(err))
	}

	return h.comments.FindByID(ctx, comment.ID())
}

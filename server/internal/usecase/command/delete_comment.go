package command

import (
	"context"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/pkg/logger"
)

type DeleteCommentCommand struct {
	CommentID uuid.UUID
	UserID    uuid.UUID
	Role      valueobject.Role
}

type DeleteCommentHandler struct {
	comments  repository.CommentRepository
	posts     repository.PostRepository
	postCache repository.PostCachePort
}

func NewDeleteCommentHandler(
	comments repository.CommentRepository,
	posts repository.PostRepository,
	postCache repository.PostCachePort,
) *DeleteCommentHandler {
	return &DeleteCommentHandler{comments: comments, posts: posts, postCache: postCache}
}

func (h *DeleteCommentHandler) Handle(ctx context.Context, cmd DeleteCommentCommand) error {
	comment, err := h.comments.FindByID(ctx, cmd.CommentID)
	if err != nil {
		return err
	}

	if !comment.CanDelete(cmd.UserID, cmd.Role) {
		return errs.Forbidden("只有评论作者或管理员可以删除评论")
	}

	if err := h.comments.Delete(ctx, cmd.CommentID); err != nil {
		return err
	}

	post, err := h.posts.FindByID(ctx, comment.PostID())
	if err == nil {
		if cacheErr := h.postCache.InvalidatePost(ctx, post.Slug()); cacheErr != nil {
			logger.L().Warn("cache_invalidate_failed", zap.String("op", "delete_comment"), zap.Error(cacheErr))
		}
	}

	return nil
}

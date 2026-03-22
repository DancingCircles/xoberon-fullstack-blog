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
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/pkg/logger"
)

type UpdatePostCommand struct {
	PostID   uuid.UUID
	EditorID uuid.UUID
	Role     valueobject.Role
	Title    string
	Content  string
	Category string
	Tags     []string
}

type UpdatePostHandler struct {
	posts     repository.PostRepository
	cache     repository.PostCachePort
	moderator service.ContentModerator
}

func NewUpdatePostHandler(posts repository.PostRepository, cache repository.PostCachePort, moderator service.ContentModerator) *UpdatePostHandler {
	return &UpdatePostHandler{posts: posts, cache: cache, moderator: moderator}
}

func (h *UpdatePostHandler) Handle(ctx context.Context, cmd UpdatePostCommand) (*entity.Post, error) {
	result, err := h.moderator.Check(ctx, cmd.Title+" "+cmd.Content)
	if err != nil {
		return nil, fmt.Errorf("内容审核服务异常: %w", err)
	}
	if result.IsReject() {
		return nil, errs.Validationf("内容不合规: %s", result.Reason)
	}

	post, err := h.posts.FindByID(ctx, cmd.PostID)
	if err != nil {
		return nil, err
	}

	if err := post.Edit(cmd.EditorID, cmd.Role, cmd.Title, cmd.Content, cmd.Category, cmd.Tags); err != nil {
		return nil, err
	}

	if err := h.posts.Update(ctx, post); err != nil {
		return nil, err
	}

	if err := h.cache.InvalidatePost(ctx, post.Slug()); err != nil {
		logger.L().Warn("cache_invalidate_failed", zap.String("op", "update_post"), zap.Error(err))
	}

	return post, nil
}

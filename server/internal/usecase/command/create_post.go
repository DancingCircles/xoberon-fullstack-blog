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
	"xoberon-server/pkg/bloom"
	"xoberon-server/pkg/logger"
)

type CreatePostCommand struct {
	AuthorID uuid.UUID
	Title    string
	Content  string
	Category string
	Tags     []string
}

type CreatePostHandler struct {
	posts     repository.PostRepository
	cache     repository.PostCachePort
	bloom     *bloom.SlugFilter
	moderator service.ContentModerator
}

func NewCreatePostHandler(posts repository.PostRepository, cache repository.PostCachePort, bf *bloom.SlugFilter, moderator service.ContentModerator) *CreatePostHandler {
	return &CreatePostHandler{posts: posts, cache: cache, bloom: bf, moderator: moderator}
}

func (h *CreatePostHandler) Handle(ctx context.Context, cmd CreatePostCommand) (*entity.Post, error) {
	result, err := h.moderator.Check(ctx, cmd.Title+" "+cmd.Content)
	if err != nil {
		return nil, fmt.Errorf("内容审核服务异常: %w", err)
	}
	if result.IsReject() {
		return nil, errs.Validationf("内容不合规: %s", result.Reason)
	}

	post, err := entity.NewPost(cmd.AuthorID, cmd.Title, cmd.Content, cmd.Category, cmd.Tags)
	if err != nil {
		return nil, err
	}

	if err := h.posts.Save(ctx, post); err != nil {
		return nil, err
	}

	h.bloom.Add(post.Slug())
	if err := h.cache.InvalidateAll(ctx); err != nil {
		logger.L().Warn("cache_invalidate_failed", zap.String("op", "create_post"), zap.Error(err))
	}

	full, err := h.posts.FindByID(ctx, post.ID())
	if err != nil {
		logger.L().Warn("refetch_after_create_failed", zap.String("post_id", post.ID().String()), zap.Error(err))
		return post, nil
	}
	return full, nil
}

package command

import (
	"context"
	"time"

	"github.com/google/uuid"
	"go.uber.org/zap"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/pkg/bloom"
	"xoberon-server/pkg/logger"
)

type DeletePostCommand struct {
	PostID uuid.UUID
	UserID uuid.UUID
	Role   valueobject.Role
}

type DeletePostHandler struct {
	posts repository.PostRepository
	cache repository.PostCachePort
	bloom *bloom.SlugFilter
}

func NewDeletePostHandler(posts repository.PostRepository, cache repository.PostCachePort, bf *bloom.SlugFilter) *DeletePostHandler {
	return &DeletePostHandler{posts: posts, cache: cache, bloom: bf}
}

func (h *DeletePostHandler) Handle(ctx context.Context, cmd DeletePostCommand) error {
	post, err := h.posts.FindByID(ctx, cmd.PostID)
	if err != nil {
		return err
	}

	if !post.CanDelete(cmd.UserID, cmd.Role) {
		return errs.Forbidden("无权删除此文章")
	}

	slug := post.Slug()
	if err := h.posts.Delete(ctx, cmd.PostID); err != nil {
		return err
	}

	if err := h.cache.InvalidatePost(ctx, slug); err != nil {
		logger.L().Warn("cache_invalidate_failed", zap.String("op", "delete_post"), zap.Error(err))
	}

	// 布隆过滤器不支持删除，异步重建整个过滤器
	go func() {
		rebuildCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()
		slugs, err := h.posts.ListAllSlugs(rebuildCtx)
		if err != nil {
			logger.L().Warn("bloom_rebuild_failed", zap.Error(err))
			return
		}
		h.bloom.Rebuild(slugs)
	}()

	return nil
}

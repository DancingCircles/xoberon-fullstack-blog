package query

import (
	"bytes"
	"context"
	"encoding/json"
	"time"

	"golang.org/x/sync/singleflight"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/pkg/bloom"
)

var nullMarker = []byte("null")

type GetPostResult struct {
	Post     *entity.Post
	Comments []*entity.Comment
}

type GetPostHandler struct {
	posts    repository.PostRepository
	comments repository.CommentRepository
	cache    repository.PostCachePort
	bloom    *bloom.SlugFilter
	sf       singleflight.Group
}

func NewGetPostHandler(
	posts repository.PostRepository,
	comments repository.CommentRepository,
	cache repository.PostCachePort,
	bf *bloom.SlugFilter,
) *GetPostHandler {
	return &GetPostHandler{
		posts:    posts,
		comments: comments,
		cache:    cache,
		bloom:    bf,
	}
}

func (h *GetPostHandler) Handle(ctx context.Context, slug string) (*GetPostResult, error) {
	// 1. 布隆过滤器快速排除不存在的 slug
	if !h.bloom.MightExist(slug) {
		return nil, errs.NotFound("文章不存在")
	}

	// 2. 查缓存（反序列化缓存 DTO 后重建实体）
	cached, err := h.cache.GetDetail(ctx, slug)
	if err == nil && cached != nil {
		if bytes.Equal(cached, nullMarker) {
			return nil, errs.NotFound("文章不存在")
		}
		var dto cachedPostDetail
		if json.Unmarshal(cached, &dto) == nil {
			post := dto.Post.toEntity()
			comments := make([]*entity.Comment, len(dto.Comments))
			for i := range dto.Comments {
				comments[i] = dto.Comments[i].toEntity()
			}
			return &GetPostResult{Post: post, Comments: comments}, nil
		}
	}

	// 3. singleflight 去重并发请求，防止缓存击穿；内部加超时防止 DB 阻塞扩散
	val, err, _ := h.sf.Do("post:"+slug, func() (interface{}, error) {
		sfCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		post, dbErr := h.posts.FindBySlug(sfCtx, slug)
		if dbErr != nil {
			if appErr, ok := dbErr.(*errs.AppError); ok && appErr.Code() == errs.CodeNotFound {
				_ = h.cache.SetNullMarker(sfCtx, slug)
			}
			return nil, dbErr
		}

		comments, dbErr := h.comments.ListByPost(sfCtx, post.ID(), 1, 50)
		if dbErr != nil {
			return nil, dbErr
		}

		// 存缓存时用导出字段的 DTO
		postDTO := toCachedPost(post)
		commentDTOs := make([]CachedComment, len(comments))
		for i, c := range comments {
			commentDTOs[i] = toCachedComment(c)
		}
		_ = h.cache.SetDetail(sfCtx, slug, &cachedPostDetail{Post: postDTO, Comments: commentDTOs})

		return &GetPostResult{Post: post, Comments: comments}, nil
	})

	if err != nil {
		return nil, err
	}
	return val.(*GetPostResult), nil
}

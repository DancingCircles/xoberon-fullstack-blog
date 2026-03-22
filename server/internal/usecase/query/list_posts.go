package query

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"golang.org/x/sync/singleflight"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type ListPostsQuery struct {
	Category *string
	Tag      *string
	Keyword  *string
	Page     int
	PageSize int
}

type ListPostsHandler struct {
	posts repository.PostRepository
	cache repository.PostCachePort
	sf    singleflight.Group
}

func NewListPostsHandler(posts repository.PostRepository, cache repository.PostCachePort) *ListPostsHandler {
	return &ListPostsHandler{posts: posts, cache: cache}
}

func truncate(s string, maxLen int) string {
	if len(s) > maxLen {
		return s[:maxLen]
	}
	return s
}

func (h *ListPostsHandler) buildCacheKey(q ListPostsQuery) string {
	key := fmt.Sprintf("page=%d&size=%d", q.Page, q.PageSize)
	if q.Category != nil {
		key += "&cat=" + truncate(*q.Category, 50)
	}
	if q.Tag != nil {
		key += "&tag=" + truncate(*q.Tag, 100)
	}
	if q.Keyword != nil {
		key += "&kw=" + truncate(*q.Keyword, 100)
	}
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

func (h *ListPostsHandler) Handle(ctx context.Context, q ListPostsQuery) ([]*entity.Post, int64, error) {
	cacheKey := h.buildCacheKey(q)

	// 1. 查 Redis 缓存（反序列化缓存 DTO 后重建实体）
	cached, err := h.cache.GetList(ctx, cacheKey)
	if err == nil && cached != nil {
		var r cachedListResult
		if json.Unmarshal(cached, &r) == nil {
			posts := make([]*entity.Post, len(r.Posts))
			for i := range r.Posts {
				posts[i] = r.Posts[i].toEntity()
			}
			return posts, r.Total, nil
		}
	}

	// 2. singleflight 去重并发请求
	type listResult struct {
		posts []*entity.Post
		total int64
	}

	val, err, _ := h.sf.Do("list:"+cacheKey, func() (interface{}, error) {
		sfCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		filter := repository.PostFilter{
			Category: q.Category,
			Tag:      q.Tag,
			Keyword:  q.Keyword,
		}
		posts, total, dbErr := h.posts.List(sfCtx, filter, q.Page, q.PageSize)
		if dbErr != nil {
			return nil, dbErr
		}

		// 存缓存时用导出字段的 DTO
		dtos := make([]CachedPost, len(posts))
		for i, p := range posts {
			dtos[i] = toCachedPost(p)
		}
		_ = h.cache.SetList(sfCtx, cacheKey, &cachedListResult{Posts: dtos, Total: total})

		return &listResult{posts: posts, total: total}, nil
	})

	if err != nil {
		return nil, 0, err
	}

	r := val.(*listResult)
	return r.posts, r.total, nil
}

package query

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"golang.org/x/sync/singleflight"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type ListEssaysQuery struct {
	Keyword  *string
	Page     int
	PageSize int
}

type ListEssaysHandler struct {
	essays repository.EssayRepository
	cache  repository.EssayCachePort
	sf     singleflight.Group
}

func NewListEssaysHandler(essays repository.EssayRepository, cache repository.EssayCachePort) *ListEssaysHandler {
	return &ListEssaysHandler{essays: essays, cache: cache}
}

func (h *ListEssaysHandler) buildCacheKey(q ListEssaysQuery) string {
	key := fmt.Sprintf("page=%d&size=%d", q.Page, q.PageSize)
	if q.Keyword != nil {
		kw := *q.Keyword
		if len(kw) > 100 {
			kw = kw[:100]
		}
		key += "&kw=" + kw
	}
	return key
}

func (h *ListEssaysHandler) Handle(ctx context.Context, q ListEssaysQuery) ([]*entity.Essay, int64, error) {
	cacheKey := h.buildCacheKey(q)

	cached, err := h.cache.GetList(ctx, cacheKey)
	if err == nil && cached != nil {
		var r cachedEssayListResult
		if json.Unmarshal(cached, &r) == nil {
			essays := make([]*entity.Essay, len(r.Essays))
			for i := range r.Essays {
				essays[i] = r.Essays[i].toEntity()
			}
			return essays, r.Total, nil
		}
	}

	type listResult struct {
		essays []*entity.Essay
		total  int64
	}

	val, err, _ := h.sf.Do("essay_list:"+cacheKey, func() (interface{}, error) {
		sfCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		filter := repository.EssayFilter{
			Keyword: q.Keyword,
		}
		essays, total, dbErr := h.essays.List(sfCtx, filter, q.Page, q.PageSize)
		if dbErr != nil {
			return nil, dbErr
		}

		dtos := make([]CachedEssay, len(essays))
		for i, e := range essays {
			dtos[i] = toCachedEssay(e)
		}
		_ = h.cache.SetList(sfCtx, cacheKey, &cachedEssayListResult{Essays: dtos, Total: total})

		return &listResult{essays: essays, total: total}, nil
	})

	if err != nil {
		return nil, 0, err
	}

	r := val.(*listResult)
	return r.essays, r.total, nil
}

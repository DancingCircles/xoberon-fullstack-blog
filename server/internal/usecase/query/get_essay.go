package query

import (
	"bytes"
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"golang.org/x/sync/singleflight"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
)

type GetEssayHandler struct {
	essays repository.EssayRepository
	cache  repository.EssayCachePort
	sf     singleflight.Group
}

func NewGetEssayHandler(essays repository.EssayRepository, cache repository.EssayCachePort) *GetEssayHandler {
	return &GetEssayHandler{essays: essays, cache: cache}
}

func (h *GetEssayHandler) Handle(ctx context.Context, id uuid.UUID) (*entity.Essay, error) {
	idStr := id.String()

	cached, err := h.cache.GetDetail(ctx, idStr)
	if err == nil && cached != nil {
		if bytes.Equal(cached, nullMarker) {
			return nil, errs.NotFound("随笔不存在")
		}
		var dto CachedEssay
		if json.Unmarshal(cached, &dto) == nil {
			return dto.toEntity(), nil
		}
	}

	val, err, _ := h.sf.Do("essay:"+idStr, func() (interface{}, error) {
		sfCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
		defer cancel()

		essay, dbErr := h.essays.FindByID(sfCtx, id)
		if dbErr != nil {
			if appErr, ok := dbErr.(*errs.AppError); ok && appErr.Code() == errs.CodeNotFound {
				_ = h.cache.SetNullMarker(sfCtx, idStr)
			}
			return nil, dbErr
		}

		_ = h.cache.SetDetail(sfCtx, idStr, toCachedEssay(essay))
		return essay, nil
	})

	if err != nil {
		return nil, err
	}
	return val.(*entity.Essay), nil
}

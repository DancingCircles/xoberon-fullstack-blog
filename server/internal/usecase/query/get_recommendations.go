package query

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/service"
)

type GetRecommendationsQuery struct {
	UserID     *uuid.UUID
	Limit      int
	ExcludeIDs []uuid.UUID
}

type GetRecommendationsHandler struct {
	recommender service.Recommender
}

func NewGetRecommendationsHandler(recommender service.Recommender) *GetRecommendationsHandler {
	return &GetRecommendationsHandler{recommender: recommender}
}

func (h *GetRecommendationsHandler) Handle(ctx context.Context, q GetRecommendationsQuery) ([]*entity.Post, error) {
	limit := q.Limit
	if limit <= 0 {
		limit = 5
	}
	if limit > 20 {
		limit = 20
	}

	return h.recommender.Recommend(ctx, service.RecommendRequest{
		UserID:         q.UserID,
		Limit:          limit,
		ExcludePostIDs: q.ExcludeIDs,
	})
}

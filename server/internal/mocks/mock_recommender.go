package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/service"
)

type MockRecommender struct{ mock.Mock }

func (m *MockRecommender) Recommend(ctx context.Context, req service.RecommendRequest) ([]*entity.Post, error) {
	args := m.Called(ctx, req)
	if v := args.Get(0); v != nil {
		return v.([]*entity.Post), args.Error(1)
	}
	return nil, args.Error(1)
}

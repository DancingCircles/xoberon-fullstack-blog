package query

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/mocks"
)

func TestGetRecommendations_Success(t *testing.T) {
	mockRec := new(mocks.MockRecommender)

	post, _ := entity.NewPost(uuid.New(), "Recommended", strings.Repeat("content ", 10), "Tech", nil)

	mockRec.On("Recommend", mock.Anything, mock.MatchedBy(func(req service.RecommendRequest) bool {
		return req.Limit == 5
	})).Return([]*entity.Post{post}, nil)

	h := NewGetRecommendationsHandler(mockRec)
	posts, err := h.Handle(context.Background(), GetRecommendationsQuery{Limit: 5})

	assert.NoError(t, err)
	assert.Len(t, posts, 1)
	assert.Equal(t, "Recommended", posts[0].Title())
}

func TestGetRecommendations_LimitClamped(t *testing.T) {
	mockRec := new(mocks.MockRecommender)

	mockRec.On("Recommend", mock.Anything, mock.MatchedBy(func(req service.RecommendRequest) bool {
		return req.Limit == 20
	})).Return([]*entity.Post{}, nil)

	h := NewGetRecommendationsHandler(mockRec)
	_, err := h.Handle(context.Background(), GetRecommendationsQuery{Limit: 999})

	assert.NoError(t, err)
	mockRec.AssertExpectations(t)
}

func TestGetRecommendations_DefaultLimit(t *testing.T) {
	mockRec := new(mocks.MockRecommender)

	mockRec.On("Recommend", mock.Anything, mock.MatchedBy(func(req service.RecommendRequest) bool {
		return req.Limit == 5
	})).Return([]*entity.Post{}, nil)

	h := NewGetRecommendationsHandler(mockRec)
	_, err := h.Handle(context.Background(), GetRecommendationsQuery{Limit: 0})

	assert.NoError(t, err)
	mockRec.AssertExpectations(t)
}

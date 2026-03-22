package handler_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/adapter/http/handler"
	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
)

func newRecommendationTestDeps() (
	*mocks.MockRecommender,
	*mocks.MockViewRepository,
	*mocks.MockPostRepository,
	*handler.RecommendationHandler,
) {
	recommender := new(mocks.MockRecommender)
	viewRepo := new(mocks.MockViewRepository)
	postRepo := new(mocks.MockPostRepository)

	getRecs := query.NewGetRecommendationsHandler(recommender)
	recordView := command.NewRecordViewHandler(viewRepo, postRepo)

	recHandler := handler.NewRecommendationHandler(getRecs, recordView)
	return recommender, viewRepo, postRepo, recHandler
}

func TestRecommendations_Success(t *testing.T) {
	recommender, _, _, h := newRecommendationTestDeps()

	now := time.Now()
	post := entity.ReconstructPost(
		uuid.New(), uuid.New(), "Title", "slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)

	recommender.On("Recommend", mock.Anything, mock.Anything).Return([]*entity.Post{post}, nil)

	r := setupRouter()
	r.GET("/api/v1/posts/recommendations", h.Recommendations)

	w := performRequest(r, http.MethodGet, "/api/v1/posts/recommendations", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotNil(t, resp["data"])
	assert.NotNil(t, resp["meta"])
}

func TestRecommendations_WithAuth(t *testing.T) {
	recommender, _, _, h := newRecommendationTestDeps()

	now := time.Now()
	post := entity.ReconstructPost(
		uuid.New(), uuid.New(), "Title", "slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)

	recommender.On("Recommend", mock.Anything, mock.Anything).Return([]*entity.Post{post}, nil)

	userID := uuid.New()
	r := setupRouter()
	r.GET("/api/v1/posts/recommendations", authMiddleware(userID, "testuser", "user"), h.Recommendations)

	w := performAuthRequest(r, http.MethodGet, "/api/v1/posts/recommendations", nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
}

func TestRecordView_Success(t *testing.T) {
	_, viewRepo, postRepo, h := newRecommendationTestDeps()

	postID := uuid.New()
	userID := uuid.New()
	now := time.Now()
	post := entity.ReconstructPost(
		postID, userID, "Title", "slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)

	postRepo.On("FindByID", mock.Anything, postID).Return(post, nil)
	viewRepo.On("Upsert", mock.Anything, userID, postID).Return(nil)

	r := setupRouter()
	r.POST("/api/v1/posts/:id/view", authMiddleware(userID, "testuser", "user"), h.RecordView)

	w := performAuthRequest(r, http.MethodPost, "/api/v1/posts/"+postID.String()+"/view", nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
}

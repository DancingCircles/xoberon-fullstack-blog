package handler_test

import (
	"fmt"
	"net/http"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/adapter/http/handler"
	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
)

func newEssayTestDeps() (
	*mocks.MockEssayRepository,
	*mocks.MockEssayCache,
	*mocks.MockLikeRepository,
	*mocks.MockContentModerator,
	*handler.EssayHandler,
) {
	essayRepo := new(mocks.MockEssayRepository)
	cache := new(mocks.MockEssayCache)
	likeRepo := new(mocks.MockLikeRepository)
	moderator := new(mocks.MockContentModerator)

	cache.On("GetList", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("miss"))
	cache.On("GetDetail", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("miss"))
	cache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	cache.On("SetDetail", mock.Anything, mock.Anything, mock.Anything).Return(nil)
	cache.On("SetNullMarker", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidateAll", mock.Anything).Return(nil)
	cache.On("InvalidateEssay", mock.Anything, mock.Anything).Return(nil)
	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)

	listEssays := query.NewListEssaysHandler(essayRepo, cache)
	getEssay := query.NewGetEssayHandler(essayRepo, cache)
	createEssay := command.NewCreateEssayHandler(essayRepo, cache, moderator)
	updateEssay := command.NewUpdateEssayHandler(essayRepo, cache, moderator)
	deleteEssay := command.NewDeleteEssayHandler(essayRepo, cache)
	toggleLike := command.NewToggleLikeHandler(likeRepo)

	essayHandler := handler.NewEssayHandler(listEssays, getEssay, createEssay, updateEssay, deleteEssay, toggleLike, cache)
	return essayRepo, cache, likeRepo, moderator, essayHandler
}

func TestEssayList_Success(t *testing.T) {
	essayRepo, _, _, _, h := newEssayTestDeps()

	now := time.Now()
	essay := entity.ReconstructEssay(
		uuid.New(), uuid.New(), "Title", "Excerpt", "Content content content content content content content",
		0, "X", "", "x", "published", now, now,
	)
	essayRepo.On("List", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return([]*entity.Essay{essay}, int64(1), nil)

	r := setupRouter()
	r.GET("/api/v1/essays", h.List)

	w := performRequest(r, http.MethodGet, "/api/v1/essays", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Items    []interface{} `json:"items"`
		Total    int64         `json:"total"`
		Page     int           `json:"page"`
		PageSize int           `json:"page_size"`
	}
	parseJSON(w, &resp)
	assert.Equal(t, int64(1), resp.Total)
	assert.Len(t, resp.Items, 1)
}

func TestEssayGetByID_Success(t *testing.T) {
	essayRepo, _, _, _, h := newEssayTestDeps()

	essayID := uuid.New()
	now := time.Now()
	essay := entity.ReconstructEssay(
		essayID, uuid.New(), "Title", "Excerpt", "Content content content content content content content",
		0, "X", "", "x", "published", now, now,
	)
	essayRepo.On("FindByID", mock.Anything, essayID).Return(essay, nil)

	r := setupRouter()
	r.GET("/api/v1/essays/:id", h.GetByID)

	w := performRequest(r, http.MethodGet, "/api/v1/essays/"+essayID.String(), nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "Title", resp["title"])
}

func TestEssayGetByID_NotFound(t *testing.T) {
	essayRepo, _, _, _, h := newEssayTestDeps()

	essayID := uuid.New()
	essayRepo.On("FindByID", mock.Anything, essayID).Return(nil, errs.NotFound("随笔不存在"))

	r := setupRouter()
	r.GET("/api/v1/essays/:id", h.GetByID)

	w := performRequest(r, http.MethodGet, "/api/v1/essays/"+essayID.String(), nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "NOT_FOUND", resp["error"])
}

func TestEssayCreate_Success(t *testing.T) {
	essayRepo, _, _, _, h := newEssayTestDeps()

	now := time.Now()
	essay := entity.ReconstructEssay(
		uuid.New(), uuid.New(), "My Test Title", "Excerpt", "Content content content content content content content",
		0, "X", "", "x", "published", now, now,
	)
	essayRepo.On("Save", mock.Anything, mock.Anything).Return(nil)
	essayRepo.On("FindByID", mock.Anything, mock.Anything).Return(essay, nil)

	userID := uuid.New()
	r := setupRouter()
	r.POST("/api/v1/essays", authMiddleware(userID, "testuser", "user"), h.Create)

	body := map[string]interface{}{
		"title":   "My Test Title",
		"excerpt": "Excerpt",
		"content": "Content content content content content content content",
	}
	w := performAuthRequest(r, http.MethodPost, "/api/v1/essays", body, "dummy-token")

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["id"])
	assert.Equal(t, "My Test Title", resp["title"])
}

func TestEssayCreate_MissingTitle(t *testing.T) {
	_, _, _, _, h := newEssayTestDeps()

	userID := uuid.New()
	r := setupRouter()
	r.POST("/api/v1/essays", authMiddleware(userID, "testuser", "user"), h.Create)

	body := map[string]interface{}{
		"title":   "",
		"excerpt": "Excerpt",
		"content": "Content content content content content content content",
	}
	w := performAuthRequest(r, http.MethodPost, "/api/v1/essays", body, "dummy-token")

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "VALIDATION_ERROR", resp["error"])
}

func TestEssayUpdate_Success(t *testing.T) {
	essayRepo, _, _, _, h := newEssayTestDeps()

	authorID := uuid.New()
	essayID := uuid.New()
	now := time.Now()
	essay := entity.ReconstructEssay(
		essayID, authorID, "Old Title", "Excerpt", "Content content content content content content content",
		0, "X", "", "x", "published", now, now,
	)
	essayRepo.On("FindByID", mock.Anything, essayID).Return(essay, nil)
	essayRepo.On("Update", mock.Anything, mock.Anything).Return(nil)

	r := setupRouter()
	r.PUT("/api/v1/essays/:id", authMiddleware(authorID, "testuser", "user"), h.Update)

	body := map[string]interface{}{
		"title":   "Updated Title",
		"excerpt": "Updated Excerpt",
		"content": "Content content content content content content content",
	}
	w := performAuthRequest(r, http.MethodPut, "/api/v1/essays/"+essayID.String(), body, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "Updated Title", resp["title"])
}

func TestEssayDelete_Success(t *testing.T) {
	essayRepo, _, _, _, h := newEssayTestDeps()

	authorID := uuid.New()
	essayID := uuid.New()
	now := time.Now()
	essay := entity.ReconstructEssay(
		essayID, authorID, "Title", "Excerpt", "Content content content content content content content",
		0, "X", "", "x", "published", now, now,
	)
	essayRepo.On("FindByID", mock.Anything, essayID).Return(essay, nil)
	essayRepo.On("Delete", mock.Anything, essayID).Return(nil)

	r := setupRouter()
	r.DELETE("/api/v1/essays/:id", authMiddleware(authorID, "testuser", "user"), h.Delete)

	w := performAuthRequest(r, http.MethodDelete, "/api/v1/essays/"+essayID.String(), nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["message"])
}

func TestEssayLike_Success(t *testing.T) {
	_, cache, likeRepo, _, h := newEssayTestDeps()

	userID := uuid.New()
	essayID := uuid.New()
	likeRepo.On("Toggle", mock.Anything, userID, essayID, repository.TargetEssay).Return(true, 5, nil)
	cache.On("InvalidateEssay", mock.Anything, essayID.String()).Return(nil)

	r := setupRouter()
	r.POST("/api/v1/essays/:id/like", authMiddleware(userID, "testuser", "user"), h.Like)

	w := performAuthRequest(r, http.MethodPost, "/api/v1/essays/"+essayID.String()+"/like", nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotNil(t, resp["liked"])
	assert.Equal(t, float64(5), resp["like_count"])
}

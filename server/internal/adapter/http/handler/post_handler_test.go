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
	"xoberon-server/pkg/bloom"
)

func newPostTestDeps() (
	*mocks.MockPostRepository,
	*mocks.MockPostCache,
	*mocks.MockCommentRepository,
	*mocks.MockLikeRepository,
	*mocks.MockContentModerator,
	*bloom.SlugFilter,
	*handler.PostHandler,
) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	commentRepo := new(mocks.MockCommentRepository)
	likeRepo := new(mocks.MockLikeRepository)
	moderator := new(mocks.MockContentModerator)
	bf := bloom.New(100_000, 0.0001)

	listPosts := query.NewListPostsHandler(postRepo, cache)
	getPost := query.NewGetPostHandler(postRepo, commentRepo, cache, bf)
	createPost := command.NewCreatePostHandler(postRepo, cache, bf, moderator)
	updatePost := command.NewUpdatePostHandler(postRepo, cache, moderator)
	deletePost := command.NewDeletePostHandler(postRepo, cache, bf)
	toggleLike := command.NewToggleLikeHandler(likeRepo)

	postHandler := handler.NewPostHandler(nil, listPosts, getPost, createPost, updatePost, deletePost, toggleLike, cache)
	return postRepo, cache, commentRepo, likeRepo, moderator, bf, postHandler
}

func TestPostList_Success(t *testing.T) {
	postRepo, cache, _, _, _, _, h := newPostTestDeps()

	now := time.Now()
	post := entity.ReconstructPost(
		uuid.New(), uuid.New(), "Title", "test-slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)

	cache.On("GetList", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("cache miss"))
	postRepo.On("List", mock.Anything, mock.Anything, mock.Anything, mock.Anything).Return([]*entity.Post{post}, int64(1), nil)
	cache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	r := setupRouter()
	r.GET("/api/v1/posts", h.List)

	w := performRequest(r, http.MethodGet, "/api/v1/posts", nil)

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

func TestPostList_WithCategory(t *testing.T) {
	postRepo, cache, _, _, _, _, h := newPostTestDeps()

	now := time.Now()
	post := entity.ReconstructPost(
		uuid.New(), uuid.New(), "Tech Post", "tech-post", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"tech"}, 0, 1, "X", "", "x", "published", now, now,
	)

	cache.On("GetList", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("cache miss"))
	postRepo.On("List", mock.Anything, mock.MatchedBy(func(f repository.PostFilter) bool {
		return f.Category != nil && *f.Category == "Tech"
	}), mock.Anything, mock.Anything).Return([]*entity.Post{post}, int64(1), nil)
	cache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	r := setupRouter()
	r.GET("/api/v1/posts", h.List)

	w := performRequest(r, http.MethodGet, "/api/v1/posts?category=Tech", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp struct {
		Items    []interface{} `json:"items"`
		Total    int64         `json:"total"`
		Page     int           `json:"page"`
		PageSize int           `json:"page_size"`
	}
	parseJSON(w, &resp)
	assert.Equal(t, int64(1), resp.Total)
}

func TestPostGetBySlug_Success(t *testing.T) {
	postRepo, cache, commentRepo, _, _, bf, h := newPostTestDeps()

	bf.Add("test-slug")
	now := time.Now()
	post := entity.ReconstructPost(
		uuid.New(), uuid.New(), "Title", "test-slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)

	cache.On("GetDetail", mock.Anything, "test-slug").Return(nil, fmt.Errorf("cache miss"))
	postRepo.On("FindBySlug", mock.Anything, "test-slug").Return(post, nil)
	commentRepo.On("ListByPost", mock.Anything, post.ID(), 1, 50).Return([]*entity.Comment{}, nil)
	cache.On("SetDetail", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	r := setupRouter()
	r.GET("/api/v1/posts/:id", h.GetBySlug)

	w := performRequest(r, http.MethodGet, "/api/v1/posts/test-slug", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "Title", resp["title"])
	assert.Equal(t, "test-slug", resp["slug"])
}

func TestPostGetBySlug_NotFound(t *testing.T) {
	_, _, _, _, _, _, h := newPostTestDeps()

	r := setupRouter()
	r.GET("/api/v1/posts/:id", h.GetBySlug)

	w := performRequest(r, http.MethodGet, "/api/v1/posts/not-exist", nil)

	assert.Equal(t, http.StatusNotFound, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "NOT_FOUND", resp["error"])
}

func TestPostCreate_Success(t *testing.T) {
	postRepo, cache, _, _, moderator, _, h := newPostTestDeps()

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	postRepo.On("Save", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidateAll", mock.Anything).Return(nil)
	postRepo.On("FindByID", mock.Anything, mock.Anything).Return(nil, errs.NotFound(""))
	cache.On("GetDetail", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("cache miss"))
	postRepo.On("FindBySlug", mock.Anything, mock.Anything).Return(nil, errs.NotFound("文章不存在"))
	cache.On("SetNullMarker", mock.Anything, mock.Anything).Return(nil)

	userID := uuid.New()
	r := setupRouter()
	r.POST("/api/v1/posts", authMiddleware(userID, "testuser", "user"), h.Create)

	body := map[string]interface{}{
		"title":    "My Test Title",
		"content":  "This is the content content content content content content content content content content content content content content content content content content content content",
		"category": "Tech",
		"tags":     []string{"go", "test"},
	}
	w := performAuthRequest(r, http.MethodPost, "/api/v1/posts", body, "dummy-token")

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["id"])
	assert.Equal(t, "My Test Title", resp["title"])
	assert.Equal(t, "Tech", resp["category"])
}

func TestPostCreate_MissingTitle(t *testing.T) {
	_, _, _, _, _, _, h := newPostTestDeps()

	userID := uuid.New()
	r := setupRouter()
	r.POST("/api/v1/posts", authMiddleware(userID, "testuser", "user"), h.Create)

	body := map[string]interface{}{
		"title":    "",
		"content":  "This is the content content content content content content content content content content content content content content content content content content content content",
		"category": "Tech",
		"tags":     []string{},
	}
	w := performAuthRequest(r, http.MethodPost, "/api/v1/posts", body, "dummy-token")

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "VALIDATION_ERROR", resp["error"])
}

func TestPostUpdate_Success(t *testing.T) {
	postRepo, cache, _, _, moderator, _, h := newPostTestDeps()

	authorID := uuid.New()
	postID := uuid.New()
	now := time.Now()
	post := entity.ReconstructPost(
		postID, authorID, "Old Title", "old-slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	postRepo.On("FindByID", mock.Anything, postID).Return(post, nil)
	postRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidatePost", mock.Anything, mock.Anything).Return(nil)

	r := setupRouter()
	r.PUT("/api/v1/posts/:id", authMiddleware(authorID, "testuser", "user"), h.Update)

	body := map[string]interface{}{
		"title":    "Updated Title",
		"content":  "Updated content content content content content content content content content content content content content content content content content content content content",
		"category": "Tech",
		"tags":     []string{"go", "updated"},
	}
	w := performAuthRequest(r, http.MethodPut, "/api/v1/posts/"+postID.String(), body, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "Updated Title", resp["title"])
}

func TestPostUpdate_NotAuthor(t *testing.T) {
	postRepo, _, _, _, moderator, _, h := newPostTestDeps()

	authorID := uuid.New()
	otherUserID := uuid.New()
	postID := uuid.New()
	now := time.Now()
	post := entity.ReconstructPost(
		postID, authorID, "Title", "slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	postRepo.On("FindByID", mock.Anything, postID).Return(post, nil)

	r := setupRouter()
	r.PUT("/api/v1/posts/:id", authMiddleware(otherUserID, "other", "user"), h.Update)

	body := map[string]interface{}{
		"title":    "Hacked Title",
		"content":  "Hacked content content content content content content content content content content content content content content content content content content content content",
		"category": "Tech",
		"tags":     []string{},
	}
	w := performAuthRequest(r, http.MethodPut, "/api/v1/posts/"+postID.String(), body, "dummy-token")

	assert.Equal(t, http.StatusForbidden, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "FORBIDDEN", resp["error"])
}

func TestPostDelete_Success(t *testing.T) {
	postRepo, cache, _, _, _, _, h := newPostTestDeps()

	authorID := uuid.New()
	postID := uuid.New()
	now := time.Now()
	post := entity.ReconstructPost(
		postID, authorID, "Title", "to-delete", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{}, 0, 1, "X", "", "x", "published", now, now,
	)

	postRepo.On("FindByID", mock.Anything, postID).Return(post, nil)
	postRepo.On("Delete", mock.Anything, postID).Return(nil)
	cache.On("InvalidatePost", mock.Anything, "to-delete").Return(nil)
	postRepo.On("ListAllSlugs", mock.Anything).Return([]string{}, nil)

	r := setupRouter()
	r.DELETE("/api/v1/posts/:id", authMiddleware(authorID, "testuser", "user"), h.Delete)

	w := performAuthRequest(r, http.MethodDelete, "/api/v1/posts/"+postID.String(), nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotEmpty(t, resp["message"])
}

func TestPostLike_Success(t *testing.T) {
	_, cache, _, likeRepo, _, _, h := newPostTestDeps()

	userID := uuid.New()
	postID := uuid.New()

	likeRepo.On("Toggle", mock.Anything, userID, postID, repository.TargetPost).Return(true, 5, nil)
	cache.On("InvalidateAll", mock.Anything).Return(nil)

	r := setupRouter()
	r.POST("/api/v1/posts/:id/like", authMiddleware(userID, "testuser", "user"), h.Like)

	w := performAuthRequest(r, http.MethodPost, "/api/v1/posts/"+postID.String()+"/like", nil, "dummy-token")

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.NotNil(t, resp["liked"])
	assert.Equal(t, float64(5), resp["like_count"])
}

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
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
)

func newCommentTestDeps() (
	*mocks.MockCommentRepository,
	*mocks.MockPostRepository,
	*mocks.MockPostCache,
	*mocks.MockContentModerator,
	*handler.CommentHandler,
) {
	commentRepo := new(mocks.MockCommentRepository)
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)

	listByPost := query.NewListCommentsByPostHandler(commentRepo)
	createComment := command.NewCreateCommentHandler(commentRepo, postRepo, cache, moderator)
	deleteComment := command.NewDeleteCommentHandler(commentRepo, postRepo, cache)

	commentHandler := handler.NewCommentHandler(listByPost, createComment, deleteComment)
	return commentRepo, postRepo, cache, moderator, commentHandler
}

func TestCommentList_Success(t *testing.T) {
	commentRepo, _, _, _, h := newCommentTestDeps()

	postID := uuid.New()
	now := time.Now()
	comment := entity.ReconstructComment(
		uuid.New(), postID, uuid.New(), "Great post!", "X", "", "published", now,
	)
	commentRepo.On("ListByPost", mock.Anything, postID, 1, 10).Return([]*entity.Comment{comment}, nil)

	r := setupRouter()
	r.GET("/api/v1/posts/:id/comments", h.ListByPost)

	w := performRequest(r, http.MethodGet, "/api/v1/posts/"+postID.String()+"/comments", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []map[string]interface{}
	parseJSON(w, &resp)
	assert.Len(t, resp, 1)
	assert.Equal(t, "Great post!", resp[0]["content"])
}

func TestCommentCreate_Success(t *testing.T) {
	commentRepo, postRepo, cache, _, h := newCommentTestDeps()

	postID := uuid.New()
	now := time.Now()
	post := entity.ReconstructPost(
		postID, uuid.New(), "Post Title", "post-slug", "Excerpt",
		"Content content content content content content content content content content content content content content content content content content content content",
		"Tech", []string{"go"}, 0, 1, "X", "", "x", "published", now, now,
	)
	comment := entity.ReconstructComment(
		uuid.New(), postID, uuid.New(), "Nice!", "X", "", "published", now,
	)

	postRepo.On("FindByID", mock.Anything, postID).Return(post, nil)
	commentRepo.On("Save", mock.Anything, mock.Anything).Return(nil)
	commentRepo.On("FindByID", mock.Anything, mock.Anything).Return(comment, nil)
	cache.On("InvalidatePost", mock.Anything, "post-slug").Return(nil)

	userID := uuid.New()
	r := setupRouter()
	r.POST("/api/v1/posts/:id/comments", authMiddleware(userID, "testuser", "user"), h.Create)

	body := map[string]interface{}{"content": "Nice!"}
	w := performAuthRequest(r, http.MethodPost, "/api/v1/posts/"+postID.String()+"/comments", body, "dummy-token")

	assert.Equal(t, http.StatusCreated, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "Nice!", resp["content"])
}

func TestCommentCreate_EmptyContent(t *testing.T) {
	_, _, _, _, h := newCommentTestDeps()

	postID := uuid.New()
	userID := uuid.New()
	r := setupRouter()
	r.POST("/api/v1/posts/:id/comments", authMiddleware(userID, "testuser", "user"), h.Create)

	body := map[string]interface{}{"content": ""}
	w := performAuthRequest(r, http.MethodPost, "/api/v1/posts/"+postID.String()+"/comments", body, "dummy-token")

	assert.Equal(t, http.StatusBadRequest, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "VALIDATION_ERROR", resp["error"])
}

func TestCommentCreate_PostNotFound(t *testing.T) {
	_, postRepo, _, _, h := newCommentTestDeps()

	postID := uuid.New()
	postRepo.On("FindByID", mock.Anything, postID).Return(nil, errs.NotFound("文章不存在"))

	userID := uuid.New()
	r := setupRouter()
	r.POST("/api/v1/posts/:id/comments", authMiddleware(userID, "testuser", "user"), h.Create)

	body := map[string]interface{}{"content": "Nice comment"}
	w := performAuthRequest(r, http.MethodPost, "/api/v1/posts/"+postID.String()+"/comments", body, "dummy-token")

	assert.Equal(t, http.StatusNotFound, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "NOT_FOUND", resp["error"])
}

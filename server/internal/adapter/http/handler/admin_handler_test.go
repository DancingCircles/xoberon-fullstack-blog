package handler_test

import (
	"net/http"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/adapter/http/handler"
	"xoberon-server/internal/mocks"
)

func newAdminHandler(t *testing.T) (*handler.AdminHandler, sqlmock.Sqlmock, *mocks.MockPostCache, *mocks.MockEssayCache) {
	db, smock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock.New: %v", err)
	}
	t.Cleanup(func() { db.Close() })

	sqlxDB := sqlx.NewDb(db, "sqlmock")
	postCache := new(mocks.MockPostCache)
	essayCache := new(mocks.MockEssayCache)
	h := handler.NewAdminHandler(sqlxDB, postCache, essayCache, nil)
	return h, smock, postCache, essayCache
}

func TestAdminGetStats_Success(t *testing.T) {
	h, smock, _, _ := newAdminHandler(t)

	smock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM users").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(10))
	smock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM posts").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(20))
	smock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM essays").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))
	smock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM contacts").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))
	smock.ExpectQuery("SELECT COUNT\\(\\*\\) FROM reviews").WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))

	r := setupRouter()
	r.GET("/admin/stats", h.GetStats)
	w := performRequest(r, http.MethodGet, "/admin/stats", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, float64(10), resp["totalUsers"])
	assert.Equal(t, float64(20), resp["totalPosts"])
	assert.Equal(t, float64(5), resp["totalEssays"])
	assert.Equal(t, float64(3), resp["unreadContacts"])
	assert.Equal(t, float64(2), resp["pendingReviews"])
	assert.NoError(t, smock.ExpectationsWereMet())
}

func TestAdminGetActivities_Success(t *testing.T) {
	h, smock, _, _ := newAdminHandler(t)

	now := time.Now()
	rows := sqlmock.NewRows([]string{"id", "type", "description", "operator", "created_at"}).
		AddRow("id-1", "new_user", "新用户 X 注册", "X", now).
		AddRow("id-2", "new_post", "发布文章「测试」", "X", now)

	smock.ExpectQuery("SELECT").WillReturnRows(rows)

	r := setupRouter()
	r.GET("/admin/activities", h.GetActivities)
	w := performRequest(r, http.MethodGet, "/admin/activities", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []map[string]interface{}
	parseJSON(w, &resp)
	assert.Len(t, resp, 2)
	assert.Equal(t, "new_user", resp[0]["type"])
	assert.NoError(t, smock.ExpectationsWereMet())
}

func TestAdminGetReviews_Success(t *testing.T) {
	h, smock, _, _ := newAdminHandler(t)

	reviewID := uuid.New()
	contentID := uuid.New()
	now := time.Now()
	rows := sqlmock.NewRows([]string{
		"id", "content_type", "content_id", "title", "excerpt",
		"author_name", "author_avatar", "status", "reject_reason",
		"ai_decision", "reviewed_by", "reviewed_at", "created_at", "full_content",
	}).AddRow(
		reviewID, "post", contentID, "测试文章", "摘要",
		"X", "https://example.com/avatar.jpg", "pending", "",
		"approve", "", nil, now, "全文内容",
	)

	smock.ExpectQuery("SELECT").WillReturnRows(rows)

	r := setupRouter()
	r.GET("/admin/reviews", h.GetReviews)
	w := performRequest(r, http.MethodGet, "/admin/reviews", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp []map[string]interface{}
	parseJSON(w, &resp)
	assert.Len(t, resp, 1)
	assert.Equal(t, "post", resp[0]["contentType"])
	assert.NoError(t, smock.ExpectationsWereMet())
}

func TestAdminApproveReview_Success(t *testing.T) {
	h, smock, postCache, _ := newAdminHandler(t)

	reviewID := uuid.New()
	contentID := uuid.New()

	smock.ExpectQuery("UPDATE reviews SET").
		WithArgs(reviewID).
		WillReturnRows(sqlmock.NewRows([]string{"content_type", "content_id"}).AddRow("post", contentID))

	smock.ExpectExec("UPDATE posts SET").
		WithArgs(contentID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	postCache.On("InvalidateAll", mock.Anything).Return(nil)

	r := setupRouter()
	r.PUT("/admin/reviews/:id/approve", h.ApproveReview)
	w := performRequest(r, http.MethodPut, "/admin/reviews/"+reviewID.String()+"/approve", nil)

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "审核通过", resp["message"])
	assert.NoError(t, smock.ExpectationsWereMet())
	postCache.AssertExpectations(t)
}

func TestAdminApproveReview_InvalidID(t *testing.T) {
	h, _, _, _ := newAdminHandler(t)

	r := setupRouter()
	r.PUT("/admin/reviews/:id/approve", h.ApproveReview)
	w := performRequest(r, http.MethodPut, "/admin/reviews/not-a-uuid/approve", nil)

	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestAdminRejectReview_Success(t *testing.T) {
	h, smock, postCache, _ := newAdminHandler(t)

	reviewID := uuid.New()
	contentID := uuid.New()

	smock.ExpectQuery("SELECT content_type, content_id FROM reviews").
		WithArgs(reviewID).
		WillReturnRows(sqlmock.NewRows([]string{"content_type", "content_id"}).AddRow("post", contentID))

	smock.ExpectExec("DELETE FROM posts").
		WithArgs(contentID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	postCache.On("InvalidateAll", mock.Anything).Return(nil)

	smock.ExpectExec("UPDATE reviews SET").
		WithArgs(reviewID, "违规内容").
		WillReturnResult(sqlmock.NewResult(0, 1))

	r := setupRouter()
	r.PUT("/admin/reviews/:id/reject", h.RejectReview)
	w := performRequest(r, http.MethodPut, "/admin/reviews/"+reviewID.String()+"/reject", gin.H{"reason": "违规内容"})

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "已删除", resp["message"])
	assert.NoError(t, smock.ExpectationsWereMet())
	postCache.AssertExpectations(t)
}

func TestAdminDeleteComment_Success(t *testing.T) {
	h, smock, postCache, _ := newAdminHandler(t)

	commentID := uuid.New()
	reviewID := uuid.New()

	smock.ExpectQuery("SELECT c.content").
		WithArgs(commentID).
		WillReturnRows(sqlmock.NewRows([]string{"content", "author_name", "author_avatar"}).
			AddRow("测试评论", "X", "https://example.com/avatar.jpg"))

	smock.ExpectExec("DELETE FROM comments").
		WithArgs(commentID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	smock.ExpectQuery("SELECT id FROM reviews").
		WithArgs(commentID).
		WillReturnRows(sqlmock.NewRows([]string{"id"}).AddRow(reviewID))

	smock.ExpectExec("UPDATE reviews SET").
		WithArgs(reviewID, "测试原因").
		WillReturnResult(sqlmock.NewResult(0, 1))

	postCache.On("InvalidateAll", mock.Anything).Return(nil)

	r := setupRouter()
	r.DELETE("/admin/comments/:id", h.DeleteComment)
	w := performRequest(r, http.MethodDelete, "/admin/comments/"+commentID.String(), gin.H{"reason": "测试原因"})

	assert.Equal(t, http.StatusOK, w.Code)
	var resp map[string]interface{}
	parseJSON(w, &resp)
	assert.Equal(t, "评论已删除", resp["message"])
	assert.NoError(t, smock.ExpectationsWereMet())
	postCache.AssertExpectations(t)
}

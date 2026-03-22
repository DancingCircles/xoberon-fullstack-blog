package handler

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/adapter/http/middleware"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/internal/usecase/query"
)

type RecommendationHandler struct {
	getRecommendations *query.GetRecommendationsHandler
	recordView         *command.RecordViewHandler
}

func NewRecommendationHandler(
	getRecommendations *query.GetRecommendationsHandler,
	recordView *command.RecordViewHandler,
) *RecommendationHandler {
	return &RecommendationHandler{
		getRecommendations: getRecommendations,
		recordView:         recordView,
	}
}

// Recommendations 获取推荐文章（公开接口，匿名/登录均可）
func (h *RecommendationHandler) Recommendations(c *gin.Context) {
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "5"))

	var excludeIDs []uuid.UUID
	if raw := c.Query("exclude"); raw != "" {
		for _, s := range strings.Split(raw, ",") {
			if id, err := uuid.Parse(strings.TrimSpace(s)); err == nil {
				excludeIDs = append(excludeIDs, id)
			}
		}
	}

	// 尝试从 token 获取用户 ID（可选鉴权，不强制）
	var userID *uuid.UUID
	if uid := middleware.GetUserID(c); uid != uuid.Nil {
		userID = &uid
	}

	posts, err := h.getRecommendations.Handle(c.Request.Context(), query.GetRecommendationsQuery{
		UserID:     userID,
		Limit:      limit,
		ExcludeIDs: excludeIDs,
	})
	if err != nil {
		mapError(c, err)
		return
	}

	items := make([]dto.PostResp, 0, len(posts))
	for _, p := range posts {
		items = append(items, dto.ToPostListResp(p))
	}

	c.JSON(http.StatusOK, gin.H{
		"data": items,
		"meta": gin.H{
			"algorithm": "score_based",
		},
	})
}

// RecordView 记录阅读事件（需登录）
func (h *RecommendationHandler) RecordView(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "无效的文章 ID"})
		return
	}

	userID := middleware.GetUserID(c)
	if err := h.recordView.Handle(c.Request.Context(), command.RecordViewCommand{
		UserID: userID,
		PostID: postID,
	}); err != nil {
		mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, dto.MessageResp{Message: "ok"})
}

package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	goredis "github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"xoberon-server/internal/adapter/http/dto"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/pkg/logger"
)

type AdminHandler struct {
	db         *sqlx.DB
	cache      repository.PostCachePort
	essayCache repository.EssayCachePort
	rdb        *goredis.Client
}

func NewAdminHandler(db *sqlx.DB, cache repository.PostCachePort, essayCache repository.EssayCachePort, rdb *goredis.Client) *AdminHandler {
	return &AdminHandler{db: db, cache: cache, essayCache: essayCache, rdb: rdb}
}

const adminStatsCacheKey = "admin:stats"
const adminStatsTTL = 30 * time.Second

func (h *AdminHandler) GetStats(c *gin.Context) {
	ctx := c.Request.Context()

	if h.rdb != nil {
		cached, err := h.rdb.Get(ctx, adminStatsCacheKey).Bytes()
		if err == nil && cached != nil {
			c.Data(http.StatusOK, "application/json; charset=utf-8", cached)
			return
		}
	}

	var totalUsers, totalPosts, totalEssays, unreadContacts, pendingReviews int
	queries := []struct {
		dest  *int
		query string
	}{
		{&totalUsers, "SELECT COUNT(*) FROM users"},
		{&totalPosts, "SELECT COUNT(*) FROM posts"},
		{&totalEssays, "SELECT COUNT(*) FROM essays"},
		{&unreadContacts, "SELECT COUNT(*) FROM contacts WHERE is_read = false"},
		{&pendingReviews, "SELECT COUNT(*) FROM reviews WHERE status = 'pending'"},
	}
	for _, q := range queries {
		if err := h.db.GetContext(ctx, q.dest, q.query); err != nil {
			logger.L().Error("admin_stats_query_failed", zap.String("query", q.query), zap.Error(err))
			c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "查询统计数据失败"})
			return
		}
	}

	resp := gin.H{
		"totalUsers":     totalUsers,
		"totalPosts":     totalPosts,
		"totalEssays":    totalEssays,
		"pendingReviews": pendingReviews,
		"unreadContacts": unreadContacts,
	}

	if h.rdb != nil {
		if b, err := json.Marshal(resp); err == nil {
			_ = h.rdb.Set(ctx, adminStatsCacheKey, b, adminStatsTTL).Err()
		}
	}

	c.JSON(http.StatusOK, resp)
}

type activityRow struct {
	ID          string    `db:"id"`
	Type        string    `db:"type"`
	Description string    `db:"description"`
	Operator    string    `db:"operator"`
	CreatedAt   time.Time `db:"created_at"`
}

func (h *AdminHandler) GetActivities(c *gin.Context) {
	ctx := c.Request.Context()

	var rows []activityRow
	err := h.db.SelectContext(ctx, &rows, `
		(SELECT id::text, 'new_user' AS type, '新用户 ' || name || ' 注册' AS description, name AS operator, created_at FROM users ORDER BY created_at DESC LIMIT 5)
		UNION ALL
		(SELECT p.id::text, 'new_post' AS type, '发布文章「' || p.title || '」' AS description, u.name AS operator, p.created_at FROM posts p JOIN users u ON u.id = p.author_id ORDER BY p.created_at DESC LIMIT 5)
		UNION ALL
		(SELECT e.id::text, 'new_essay' AS type, '发布随笔「' || e.title || '」' AS description, u.name AS operator, e.created_at FROM essays e JOIN users u ON u.id = e.author_id ORDER BY e.created_at DESC LIMIT 5)
		UNION ALL
		(SELECT id::text, 'new_contact' AS type, name || ' 发送了联系消息' AS description, name AS operator, created_at FROM contacts ORDER BY created_at DESC LIMIT 5)
		ORDER BY created_at DESC LIMIT 20`)
	if err != nil {
		logger.L().Error("admin_activities_query_failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "查询活动记录失败"})
		return
	}

	items := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		items = append(items, gin.H{
			"id":          r.ID,
			"type":        r.Type,
			"description": r.Description,
			"operator":    r.Operator,
			"createdAt":   r.CreatedAt.Format(time.RFC3339),
		})
	}
	c.JSON(http.StatusOK, items)
}

type reviewRow struct {
	ID           uuid.UUID  `db:"id"`
	ContentType  string     `db:"content_type"`
	ContentID    uuid.UUID  `db:"content_id"`
	Title        string     `db:"title"`
	Excerpt      string     `db:"excerpt"`
	AuthorName   string     `db:"author_name"`
	AuthorAvatar string     `db:"author_avatar"`
	Status       string     `db:"status"`
	RejectReason string     `db:"reject_reason"`
	AIDecision   string     `db:"ai_decision"`
	ReviewedBy   string     `db:"reviewed_by"`
	ReviewedAt   *time.Time `db:"reviewed_at"`
	CreatedAt    time.Time  `db:"created_at"`
}

func (h *AdminHandler) GetReviews(c *gin.Context) {
	ctx := c.Request.Context()

	type reviewJoinRow struct {
		reviewRow
		FullContent string `db:"full_content"`
	}

	var rows []reviewJoinRow
	err := h.db.SelectContext(ctx, &rows,
		`SELECT r.id, r.content_type, r.content_id, r.title, r.excerpt,
		        r.author_name, r.author_avatar, r.status,
		        COALESCE(r.reject_reason, '') AS reject_reason,
		        r.ai_decision, r.reviewed_by, r.reviewed_at, r.created_at,
		        COALESCE(p.content, cm.content, e.content, '') AS full_content
		 FROM reviews r
		 LEFT JOIN posts p ON r.content_type = 'post' AND r.content_id = p.id
		 LEFT JOIN comments cm ON r.content_type = 'comment' AND r.content_id = cm.id
		 LEFT JOIN essays e ON r.content_type = 'essay' AND r.content_id = e.id
		 ORDER BY r.created_at DESC LIMIT 50`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "查询审核列表失败"})
		return
	}

	items := make([]gin.H, 0, len(rows))
	for _, r := range rows {
		title := r.Title
		if r.ContentType == "comment" && title == "" {
			title = r.Excerpt
		}
		reviewedAt := ""
		if r.ReviewedAt != nil {
			reviewedAt = r.ReviewedAt.Format(time.RFC3339)
		}
		items = append(items, gin.H{
			"id":           r.ID.String(),
			"contentType":  r.ContentType,
			"contentId":    r.ContentID.String(),
			"title":        title,
			"excerpt":      r.Excerpt,
			"fullContent":  r.FullContent,
			"authorName":   r.AuthorName,
			"authorAvatar": r.AuthorAvatar,
			"createdAt":    r.CreatedAt.Format(time.RFC3339),
			"status":       r.Status,
			"aiDecision":   r.AIDecision,
			"rejectReason": r.RejectReason,
			"reviewedBy":   r.ReviewedBy,
			"reviewedAt":   reviewedAt,
		})
	}
	c.JSON(http.StatusOK, items)
}

func (h *AdminHandler) ApproveReview(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "无效的审核 ID"})
		return
	}

	ctx := c.Request.Context()

	var rev struct {
		ContentType string    `db:"content_type"`
		ContentID   uuid.UUID `db:"content_id"`
	}
	if err := h.db.GetContext(ctx, &rev,
		`UPDATE reviews SET status = 'approved', reject_reason = NULL,
		        reviewed_by = 'admin', reviewed_at = NOW()
		 WHERE id = $1
		 RETURNING content_type, content_id`, id); err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResp{Error: "NOT_FOUND", Message: "审核记录不存在"})
		return
	}

	switch rev.ContentType {
	case "post":
		if _, err := h.db.ExecContext(ctx,
			`UPDATE posts SET review_status = 'published' WHERE id = $1`, rev.ContentID); err != nil {
			c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "更新文章状态失败"})
			return
		}
		warnCacheInvalidate(h.cache.InvalidateAll(ctx))
	case "comment":
		if _, err := h.db.ExecContext(ctx,
			`UPDATE comments SET review_status = 'published' WHERE id = $1`, rev.ContentID); err != nil {
			c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "更新评论状态失败"})
			return
		}
		warnCacheInvalidate(h.cache.InvalidateAll(ctx))
	case "essay":
		if _, err := h.db.ExecContext(ctx,
			`UPDATE essays SET review_status = 'published' WHERE id = $1`, rev.ContentID); err != nil {
			c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "更新随笔状态失败"})
			return
		}
		warnCacheInvalidate(h.essayCache.InvalidateAll(ctx))
	}

	c.JSON(http.StatusOK, dto.MessageResp{Message: "审核通过"})
}

func (h *AdminHandler) DeleteComment(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "无效的评论 ID"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if c.Request.Body != nil && c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&req); err != nil && err != io.EOF {
			c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "请求体格式错误"})
			return
		}
	}

	ctx := c.Request.Context()

	var comment struct {
		Content      string `db:"content"`
		AuthorName   string `db:"author_name"`
		AuthorAvatar string `db:"author_avatar"`
	}
	err = h.db.GetContext(ctx, &comment,
		`SELECT c.content, u.name AS author_name, u.avatar AS author_avatar
		 FROM comments c JOIN users u ON u.id = c.author_id
		 WHERE c.id = $1`, id)
	if err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResp{Error: "NOT_FOUND", Message: "评论不存在"})
		return
	}

	_, err = h.db.ExecContext(ctx, `DELETE FROM comments WHERE id = $1`, id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "删除评论失败"})
		return
	}

	var existingReviewID uuid.UUID
	existErr := h.db.GetContext(ctx, &existingReviewID,
		`SELECT id FROM reviews WHERE content_type = 'comment' AND content_id = $1`, id)
	if existErr == nil {
		_, _ = h.db.ExecContext(ctx,
			`UPDATE reviews SET status = 'rejected', reject_reason = $2,
			        reviewed_by = 'admin', reviewed_at = NOW()
			 WHERE id = $1`, existingReviewID, req.Reason)
	} else {
		excerpt := comment.Content
		if runes := []rune(excerpt); len(runes) > 100 {
			excerpt = string(runes[:100]) + "…"
		}
		_, _ = h.db.ExecContext(ctx,
			`INSERT INTO reviews (content_type, content_id, title, excerpt, author_name, author_avatar, status, reject_reason, reviewed_by, reviewed_at)
			 VALUES ('comment', $1, '', $2, $3, $4, 'rejected', $5, 'admin', NOW())`,
			id, excerpt, comment.AuthorName, comment.AuthorAvatar, req.Reason)
	}

	warnCacheInvalidate(h.cache.InvalidateAll(ctx))
	c.JSON(http.StatusOK, dto.MessageResp{Message: "评论已删除"})
}

func (h *AdminHandler) RejectReview(c *gin.Context) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "无效的审核 ID"})
		return
	}

	var req struct {
		Reason string `json:"reason"`
	}
	if c.Request.Body != nil && c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&req); err != nil && err != io.EOF {
			c.JSON(http.StatusBadRequest, dto.ErrorResp{Error: "VALIDATION_ERROR", Message: "请求体格式错误"})
			return
		}
	}

	ctx := c.Request.Context()

	var rev struct {
		ContentType string    `db:"content_type"`
		ContentID   uuid.UUID `db:"content_id"`
	}
	if err := h.db.GetContext(ctx, &rev,
		`SELECT content_type, content_id FROM reviews WHERE id = $1`, id); err != nil {
		c.JSON(http.StatusNotFound, dto.ErrorResp{Error: "NOT_FOUND", Message: "审核记录不存在"})
		return
	}

	switch rev.ContentType {
	case "post":
		if _, err := h.db.ExecContext(ctx, `DELETE FROM posts WHERE id = $1`, rev.ContentID); err != nil {
			c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "删除文章失败"})
			return
		}
		warnCacheInvalidate(h.cache.InvalidateAll(ctx))
	case "comment":
		if _, err := h.db.ExecContext(ctx, `DELETE FROM comments WHERE id = $1`, rev.ContentID); err != nil {
			c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "删除评论失败"})
			return
		}
		warnCacheInvalidate(h.cache.InvalidateAll(ctx))
	case "essay":
		if _, err := h.db.ExecContext(ctx, `DELETE FROM essays WHERE id = $1`, rev.ContentID); err != nil {
			c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "删除随笔失败"})
			return
		}
		warnCacheInvalidate(h.essayCache.InvalidateAll(ctx))
	}

	if _, err := h.db.ExecContext(ctx,
		`UPDATE reviews SET status = 'rejected', reject_reason = $2,
		        reviewed_by = 'admin', reviewed_at = NOW()
		 WHERE id = $1`, id, req.Reason); err != nil {
		c.JSON(http.StatusInternalServerError, dto.ErrorResp{Error: "INTERNAL_ERROR", Message: "更新审核记录失败"})
		return
	}

	c.JSON(http.StatusOK, dto.MessageResp{Message: "已删除"})
}

func warnCacheInvalidate(err error) {
	if err != nil {
		logger.L().Warn("cache_invalidation_failed", zap.Error(err))
	}
}

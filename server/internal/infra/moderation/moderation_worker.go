package moderation

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"go.uber.org/zap"

	"xoberon-server/internal/domain/repository"
	"xoberon-server/pkg/logger"
)

const (
	requestInterval     = 2 * time.Second
	maxConsecutiveFails = 3
)

// cacheInvalidator 缓存失效通用接口
type cacheInvalidator interface {
	InvalidateAll(ctx context.Context) error
}

// reviewMeta 统一的审核元数据，供 checkItem 使用
type reviewMeta struct {
	contentType  string
	contentID    uuid.UUID
	title        string
	excerpt      string
	authorName   string
	authorAvatar string
	checkText    string
	hideSQL      string
	deleteSQL    string
	cache        cacheInvalidator
}

// reviewable 由各待审核类型实现
type reviewable interface {
	meta(w *ModerationWorker) reviewMeta
}

// ---- 待审核类型定义 ----

type pendingPost struct {
	ID           uuid.UUID `db:"id"`
	Title        string    `db:"title"`
	Content      string    `db:"content"`
	Excerpt      string    `db:"excerpt"`
	AuthorName   string    `db:"author_name"`
	AuthorAvatar string    `db:"author_avatar"`
}

func (p pendingPost) meta(w *ModerationWorker) reviewMeta {
	return reviewMeta{
		contentType:  "post",
		contentID:    p.ID,
		title:        p.Title,
		excerpt:      p.Excerpt,
		authorName:   p.AuthorName,
		authorAvatar: p.AuthorAvatar,
		checkText:    p.Title + " " + p.Content,
		hideSQL:      `UPDATE posts SET review_status = 'hidden' WHERE id = $1 AND review_status = 'published'`,
		deleteSQL:    `DELETE FROM posts WHERE id = $1`,
		cache:        w.cache,
	}
}

type pendingEssay struct {
	ID           uuid.UUID `db:"id"`
	Title        string    `db:"title"`
	Content      string    `db:"content"`
	Excerpt      string    `db:"excerpt"`
	AuthorName   string    `db:"author_name"`
	AuthorAvatar string    `db:"author_avatar"`
}

func (e pendingEssay) meta(w *ModerationWorker) reviewMeta {
	return reviewMeta{
		contentType:  "essay",
		contentID:    e.ID,
		title:        e.Title,
		excerpt:      e.Excerpt,
		authorName:   e.AuthorName,
		authorAvatar: e.AuthorAvatar,
		checkText:    e.Title + " " + e.Content,
		hideSQL:      `UPDATE essays SET review_status = 'hidden' WHERE id = $1 AND review_status = 'published'`,
		deleteSQL:    `DELETE FROM essays WHERE id = $1`,
		cache:        w.essayCache,
	}
}

type pendingComment struct {
	ID           uuid.UUID `db:"id"`
	PostID       uuid.UUID `db:"post_id"`
	Content      string    `db:"content"`
	AuthorName   string    `db:"author_name"`
	AuthorAvatar string    `db:"author_avatar"`
}

func (c pendingComment) meta(w *ModerationWorker) reviewMeta {
	return reviewMeta{
		contentType:  "comment",
		contentID:    c.ID,
		title:        "",
		excerpt:      truncateStr(c.Content, 100),
		authorName:   c.AuthorName,
		authorAvatar: c.AuthorAvatar,
		checkText:    c.Content,
		hideSQL:      `UPDATE comments SET review_status = 'hidden' WHERE id = $1 AND review_status = 'published'`,
		deleteSQL:    `DELETE FROM comments WHERE id = $1`,
		cache:        w.cache,
	}
}

// ---- Worker ----

type ModerationWorker struct {
	ai         *QwenModerator
	db         *sqlx.DB
	cache      repository.PostCachePort
	essayCache repository.EssayCachePort
	interval   time.Duration
}

func NewModerationWorker(ai *QwenModerator, db *sqlx.DB, cache repository.PostCachePort, essayCache repository.EssayCachePort, interval time.Duration) *ModerationWorker {
	return &ModerationWorker{ai: ai, db: db, cache: cache, essayCache: essayCache, interval: interval}
}

func (w *ModerationWorker) Run(ctx context.Context) {
	logger.L().Info("moderation_worker_started", zap.Duration("interval", w.interval))
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logger.L().Info("moderation_worker_stopped")
			return
		case <-ticker.C:
			w.scan(ctx)
		}
	}
}

func (w *ModerationWorker) scan(ctx context.Context) {
	scanAndCheck(ctx, w, scanPostQuery, "post")
	scanAndCheck(ctx, w, scanEssayQuery, "essay")
	scanAndCheck(ctx, w, scanCommentQuery, "comment")
}

// ---- 查询语句 ----

const scanPostQuery = `
	SELECT p.id, p.title, p.content, p.excerpt,
	       u.name AS author_name, u.avatar AS author_avatar
	FROM posts p
	JOIN users u ON u.id = p.author_id
	WHERE p.review_status = 'published'
	  AND (
	    NOT EXISTS (
	      SELECT 1 FROM reviews r
	      WHERE r.content_id = p.id AND r.content_type = 'post'
	    )
	    OR p.updated_at > (
	      SELECT MAX(r.created_at) FROM reviews r
	      WHERE r.content_id = p.id AND r.content_type = 'post'
	    )
	  )
	ORDER BY p.created_at ASC
	LIMIT 20`

const scanEssayQuery = `
	SELECT e.id, e.title, e.content, e.excerpt,
	       u.name AS author_name, u.avatar AS author_avatar
	FROM essays e
	JOIN users u ON u.id = e.author_id
	WHERE e.review_status = 'published'
	  AND (
	    NOT EXISTS (
	      SELECT 1 FROM reviews r
	      WHERE r.content_id = e.id AND r.content_type = 'essay'
	    )
	    OR e.updated_at > (
	      SELECT MAX(r.created_at) FROM reviews r
	      WHERE r.content_id = e.id AND r.content_type = 'essay'
	    )
	  )
	ORDER BY e.created_at ASC
	LIMIT 20`

const scanCommentQuery = `
	SELECT c.id, c.post_id, c.content,
	       u.name AS author_name, u.avatar AS author_avatar
	FROM comments c
	JOIN users u ON u.id = c.author_id
	WHERE c.review_status = 'published'
	  AND NOT EXISTS (
	    SELECT 1 FROM reviews r
	    WHERE r.content_id = c.id AND r.content_type = 'comment'
	  )
	ORDER BY c.created_at ASC
	LIMIT 20`

// ---- 通用扫描+审核 ----

// scanAndCheck 按 typeName 选择具体类型进行扫描
func scanAndCheck(ctx context.Context, w *ModerationWorker, query string, typeName string) {
	switch typeName {
	case "post":
		scanAndCheckTyped[pendingPost](ctx, w, query, typeName)
	case "essay":
		scanAndCheckTyped[pendingEssay](ctx, w, query, typeName)
	case "comment":
		scanAndCheckTyped[pendingComment](ctx, w, query, typeName)
	}
}

func scanAndCheckTyped[T reviewable](ctx context.Context, w *ModerationWorker, query string, typeName string) {
	var items []T
	if err := w.db.SelectContext(ctx, &items, query); err != nil {
		logger.L().Error("moderation_worker_scan_failed",
			zap.String("type", typeName),
			zap.Error(err),
		)
		return
	}
	if len(items) == 0 {
		return
	}

	logger.L().Info("moderation_worker_scanning",
		zap.String("type", typeName),
		zap.Int("count", len(items)),
	)

	consecutiveFails := 0
	for i, item := range items {
		if ctx.Err() != nil {
			return
		}

		err := w.checkItem(ctx, item)

		if errors.Is(err, ErrRateLimited) {
			logger.L().Warn("moderation_worker_rate_limited",
				zap.String("type", typeName),
				zap.Int("remaining", len(items)-i-1),
			)
			return
		}

		if err != nil {
			consecutiveFails++
			if consecutiveFails >= maxConsecutiveFails {
				logger.L().Warn("moderation_worker_too_many_fails",
					zap.String("type", typeName),
					zap.Int("consecutive", consecutiveFails),
				)
				return
			}
		} else {
			consecutiveFails = 0
		}

		if i < len(items)-1 {
			select {
			case <-time.After(requestInterval):
			case <-ctx.Done():
				return
			}
		}
	}
}

// ---- 通用审核处理 ----

func (w *ModerationWorker) checkItem(ctx context.Context, item reviewable) error {
	m := item.meta(w)

	checkCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	result, err := w.ai.Check(checkCtx, m.checkText)
	if err != nil {
		logger.L().Warn("moderation_worker_ai_check_failed",
			zap.String("type", m.contentType),
			zap.String("id", m.contentID.String()),
			zap.Error(err),
		)
		return err
	}

	switch result.Decision {
	case "approve":
		return w.handleApprove(ctx, m)
	case "review":
		return w.handleReview(ctx, m, result.Reason)
	default:
		return w.handleReject(ctx, m, result.Reason, result.Labels)
	}
}

func (w *ModerationWorker) handleApprove(ctx context.Context, m reviewMeta) error {
	_, err := w.db.ExecContext(ctx,
		`INSERT INTO reviews (content_type, content_id, title, excerpt, author_name, author_avatar, status, ai_decision, reviewed_by, reviewed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'approved', 'approve', 'ai', NOW())`,
		m.contentType, m.contentID, m.title, m.excerpt, m.authorName, m.authorAvatar)
	if err != nil {
		logger.L().Error("moderation_worker_insert_review_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
	}
	return nil
}

func (w *ModerationWorker) handleReview(ctx context.Context, m reviewMeta, reason string) error {
	logger.L().Warn("moderation_worker_needs_review",
		zap.String("type", m.contentType),
		zap.String("id", m.contentID.String()),
		zap.String("reason", reason),
	)

	tx, err := w.db.BeginTxx(ctx, nil)
	if err != nil {
		logger.L().Error("moderation_worker_tx_begin_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
		return nil
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		`INSERT INTO reviews (content_type, content_id, title, excerpt, author_name, author_avatar, status, ai_decision, reject_reason, reviewed_by)
		 VALUES ($1, $2, $3, $4, $5, $6, 'pending', 'review', $7, 'ai')`,
		m.contentType, m.contentID, m.title, m.excerpt, m.authorName, m.authorAvatar, reason)
	if err != nil {
		logger.L().Error("moderation_worker_insert_review_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
		return nil
	}

	if _, err = tx.ExecContext(ctx, m.hideSQL, m.contentID); err != nil {
		logger.L().Error("moderation_worker_hide_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
		return nil
	}

	if err = tx.Commit(); err != nil {
		logger.L().Error("moderation_worker_tx_commit_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
	} else {
		warnCacheInvalidate(m.cache.InvalidateAll(ctx))
	}
	return nil
}

func (w *ModerationWorker) handleReject(ctx context.Context, m reviewMeta, reason string, labels []string) error {
	logger.L().Warn("moderation_worker_content_rejected",
		zap.String("type", m.contentType),
		zap.String("id", m.contentID.String()),
		zap.String("reason", reason),
		zap.Strings("labels", labels),
	)

	tx, err := w.db.BeginTxx(ctx, nil)
	if err != nil {
		logger.L().Error("moderation_worker_tx_begin_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
		return nil
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx,
		`INSERT INTO reviews (content_type, content_id, title, excerpt, author_name, author_avatar, status, ai_decision, reject_reason, reviewed_by, reviewed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, 'rejected', 'reject', $7, 'ai', NOW())`,
		m.contentType, m.contentID, m.title, m.excerpt, m.authorName, m.authorAvatar, reason)
	if err != nil {
		logger.L().Error("moderation_worker_insert_review_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
		return nil
	}

	if _, err = tx.ExecContext(ctx, m.deleteSQL, m.contentID); err != nil {
		logger.L().Error("moderation_worker_delete_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
		return nil
	}

	if err = tx.Commit(); err != nil {
		logger.L().Error("moderation_worker_tx_commit_failed",
			zap.String("type", m.contentType),
			zap.Error(err),
		)
	} else {
		logger.L().Info("moderation_worker_auto_deleted",
			zap.String("type", m.contentType),
			zap.String("id", m.contentID.String()),
			zap.String("reason", reason),
		)
		warnCacheInvalidate(m.cache.InvalidateAll(ctx))
	}
	return nil
}

// ---- 工具函数 ----

func truncateStr(s string, n int) string {
	runes := []rune(s)
	if len(runes) <= n {
		return s
	}
	return string(runes[:n]) + "…"
}

func warnCacheInvalidate(err error) {
	if err != nil {
		logger.L().Warn("cache_invalidation_failed", zap.Error(err))
	}
}

package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
)

type likeRepo struct {
	db *sqlx.DB
}

func NewLikeRepo(db *sqlx.DB) repository.LikeRepository {
	return &likeRepo{db: db}
}

// Toggle 在同一事务中原子切换点赞状态，并更新目标表的 like_count。
// 迁移 000002 已将多态 likes 表拆分为 post_likes 和 essay_likes，此处分别处理。
func (r *likeRepo) Toggle(ctx context.Context, userID, targetID uuid.UUID, targetType repository.TargetType) (bool, int, error) {
	tx, err := r.db.BeginTxx(ctx, nil)
	if err != nil {
		return false, 0, errs.Wrap(errs.CodeInternal, "开启事务失败", err)
	}
	defer tx.Rollback()

	var deleteSQL, insertSQL, updateReturningSQL string
	switch targetType {
	case repository.TargetPost:
		deleteSQL = `DELETE FROM post_likes WHERE user_id=$1 AND post_id=$2`
		insertSQL = `INSERT INTO post_likes (user_id, post_id, created_at) VALUES ($1, $2, NOW())`
		updateReturningSQL = `UPDATE posts SET like_count = GREATEST(like_count + $1, 0) WHERE id = $2 RETURNING like_count`
	case repository.TargetEssay:
		deleteSQL = `DELETE FROM essay_likes WHERE user_id=$1 AND essay_id=$2`
		insertSQL = `INSERT INTO essay_likes (user_id, essay_id, created_at) VALUES ($1, $2, NOW())`
		updateReturningSQL = `UPDATE essays SET like_count = GREATEST(like_count + $1, 0) WHERE id = $2 RETURNING like_count`
	default:
		return false, 0, errs.Validation("不支持的点赞目标类型")
	}

	result, err := tx.ExecContext(ctx, deleteSQL, userID, targetID)
	if err != nil {
		return false, 0, errs.Wrap(errs.CodeInternal, "切换点赞失败", err)
	}

	deleted, _ := result.RowsAffected()
	liked := deleted == 0

	if liked {
		if _, err = tx.ExecContext(ctx, insertSQL, userID, targetID); err != nil {
			return false, 0, errs.Wrap(errs.CodeInternal, "点赞失败", err)
		}
	}

	delta := 1
	if !liked {
		delta = -1
	}

	var likeCount int
	if err := tx.QueryRowContext(ctx, updateReturningSQL, delta, targetID).Scan(&likeCount); err != nil {
		return false, 0, errs.Wrap(errs.CodeInternal, "更新点赞数失败", err)
	}

	if err := tx.Commit(); err != nil {
		return false, 0, errs.Wrap(errs.CodeInternal, "提交事务失败", err)
	}

	return liked, likeCount, nil
}

// Exists 查询指定用户是否已对目标点赞
func (r *likeRepo) Exists(ctx context.Context, userID, targetID uuid.UUID, targetType repository.TargetType) (bool, error) {
	var query string
	switch targetType {
	case repository.TargetPost:
		query = `SELECT EXISTS(SELECT 1 FROM post_likes WHERE user_id=$1 AND post_id=$2)`
	case repository.TargetEssay:
		query = `SELECT EXISTS(SELECT 1 FROM essay_likes WHERE user_id=$1 AND essay_id=$2)`
	default:
		return false, errs.Validation("不支持的点赞目标类型")
	}

	var exists bool
	err := r.db.GetContext(ctx, &exists, query, userID, targetID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return false, errs.Wrap(errs.CodeInternal, "查询点赞状态失败", err)
	}
	return exists, nil
}

// ListByUser 获取用户点赞过的目标 ID 列表
func (r *likeRepo) ListByUser(ctx context.Context, userID uuid.UUID, targetType repository.TargetType) ([]uuid.UUID, error) {
	var query string
	switch targetType {
	case repository.TargetPost:
		query = `SELECT post_id FROM post_likes WHERE user_id=$1 ORDER BY created_at DESC`
	case repository.TargetEssay:
		query = `SELECT essay_id FROM essay_likes WHERE user_id=$1 ORDER BY created_at DESC`
	default:
		return nil, errs.Validation("不支持的点赞目标类型")
	}

	var ids []uuid.UUID
	if err := r.db.SelectContext(ctx, &ids, query, userID); err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询点赞列表失败", err)
	}
	return ids, nil
}

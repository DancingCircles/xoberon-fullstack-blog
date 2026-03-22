package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
)

type viewRepo struct {
	db *sqlx.DB
}

func NewViewRepo(db *sqlx.DB) repository.ViewRepository {
	return &viewRepo{db: db}
}

func (r *viewRepo) Upsert(ctx context.Context, userID, postID uuid.UUID) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO user_post_views (user_id, post_id, viewed_at)
		 VALUES ($1, $2, NOW())
		 ON CONFLICT (user_id, post_id)
		 DO UPDATE SET viewed_at = NOW()`,
		userID, postID,
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "记录阅读失败", err)
	}
	return nil
}

func (r *viewRepo) ListRecentPostIDs(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	err := r.db.SelectContext(ctx, &ids,
		`SELECT post_id FROM user_post_views
		 WHERE user_id = $1
		 ORDER BY viewed_at DESC
		 LIMIT $2`,
		userID, limit,
	)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询阅读记录失败", err)
	}
	return ids, nil
}

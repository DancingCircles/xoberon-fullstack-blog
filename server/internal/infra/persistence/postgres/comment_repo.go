package postgres

import (
	"context"
	"database/sql"
	"errors"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
)

type commentRepo struct {
	db *sqlx.DB
}

func NewCommentRepo(db *sqlx.DB) repository.CommentRepository {
	return &commentRepo{db: db}
}

const commentSelectBase = `
	SELECT c.id, c.post_id, c.author_id, c.content, c.review_status, c.created_at,
	       u.name AS author_name, u.avatar AS author_avatar
	FROM comments c
	JOIN users u ON u.id = c.author_id`

func (r *commentRepo) Save(ctx context.Context, comment *entity.Comment) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO comments (id, post_id, author_id, content, review_status, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		comment.ID(), comment.PostID(), comment.AuthorID(),
		comment.Content(), comment.ReviewStatus(), comment.CreatedAt(),
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "保存评论失败", err)
	}
	return nil
}

func (r *commentRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Comment, error) {
	var row commentRow
	err := r.db.GetContext(ctx, &row, commentSelectBase+` WHERE c.id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("评论不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询评论失败", err)
	}
	return row.toEntity(), nil
}

func (r *commentRepo) ListByPost(ctx context.Context, postID uuid.UUID, page, size int) ([]*entity.Comment, error) {
	if page < 1 {
		page = 1
	}
	if size <= 0 || size > 100 {
		size = 20
	}
	var rows []commentRow
	err := r.db.SelectContext(ctx, &rows,
		commentSelectBase+` WHERE c.post_id = $1 AND c.review_status = 'published' ORDER BY c.created_at ASC LIMIT $2 OFFSET $3`,
		postID, size, (page-1)*size,
	)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询评论列表失败", err)
	}

	comments := make([]*entity.Comment, len(rows))
	for i := range rows {
		comments[i] = rows[i].toEntity()
	}
	return comments, nil
}

func (r *commentRepo) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM comments WHERE id = $1`, id)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "删除评论失败", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errs.NotFound("评论不存在")
	}
	return nil
}

func (r *commentRepo) CountByPost(ctx context.Context, postID uuid.UUID) (int64, error) {
	var count int64
	err := r.db.GetContext(ctx, &count,
		`SELECT COUNT(*) FROM comments WHERE post_id = $1 AND review_status = 'published'`, postID)
	if err != nil {
		return 0, errs.Wrap(errs.CodeInternal, "统计评论失败", err)
	}
	return count, nil
}

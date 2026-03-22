package postgres

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
)

type essayRepo struct {
	db *sqlx.DB
}

func NewEssayRepo(db *sqlx.DB) repository.EssayRepository {
	return &essayRepo{db: db}
}

const essaySelectBase = `
	SELECT e.id, e.author_id, e.title, e.excerpt, e.content, e.like_count,
	       e.review_status, e.created_at, e.updated_at,
	       u.name AS author_name, u.avatar AS author_avatar, u.handle AS author_handle
	FROM essays e
	JOIN users u ON u.id = e.author_id`

func (r *essayRepo) Save(ctx context.Context, essay *entity.Essay) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO essays (id, author_id, title, excerpt, content, like_count, review_status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		essay.ID(), essay.AuthorID(), essay.Title(), essay.Excerpt(),
		essay.Content(), essay.LikeCount(), essay.ReviewStatus(), essay.CreatedAt(), essay.UpdatedAt(),
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "保存随笔失败", err)
	}
	return nil
}

func (r *essayRepo) Update(ctx context.Context, essay *entity.Essay) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE essays SET title=$1, excerpt=$2, content=$3, updated_at=$4 WHERE id=$5`,
		essay.Title(), essay.Excerpt(), essay.Content(), essay.UpdatedAt(), essay.ID(),
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "更新随笔失败", err)
	}
	return nil
}

func (r *essayRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Essay, error) {
	var row essayRow
	err := r.db.GetContext(ctx, &row, essaySelectBase+` WHERE e.id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("随笔不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询随笔失败", err)
	}
	return row.toEntity(), nil
}

func (r *essayRepo) List(ctx context.Context, filter repository.EssayFilter, page, size int) ([]*entity.Essay, int64, error) {
	where := "WHERE e.review_status != 'hidden'"
	args := []interface{}{}
	argIdx := 1

	if filter.AuthorID != nil {
		where += fmt.Sprintf(" AND e.author_id = $%d", argIdx)
		args = append(args, *filter.AuthorID)
		argIdx++
	}

	var kwPatIdx int
	if filter.Keyword != nil {
		escaped := escapeLike(*filter.Keyword)
		kwPatIdx = argIdx
		args = append(args, "%"+escaped+"%")
		argIdx++
		where += fmt.Sprintf(
			" AND (e.title ILIKE $%d ESCAPE '\\' OR e.excerpt ILIKE $%d ESCAPE '\\' OR e.content ILIKE $%d ESCAPE '\\')",
			kwPatIdx, kwPatIdx, kwPatIdx,
		)
	}

	// COUNT
	var total int64
	countSQL := "SELECT COUNT(*) FROM essays e " + where
	if err := r.db.GetContext(ctx, &total, countSQL, args...); err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "统计随笔失败", err)
	}

	// SELECT — keyword 搜索时按加权相关性排序
	var orderBy string
	if filter.Keyword != nil {
		orderBy = fmt.Sprintf(
			` ORDER BY (CASE WHEN e.title ILIKE $%d ESCAPE '\\' THEN 3 ELSE 0 END + CASE WHEN e.excerpt ILIKE $%d ESCAPE '\\' THEN 2 ELSE 0 END + CASE WHEN e.content ILIKE $%d ESCAPE '\\' THEN 1 ELSE 0 END) DESC, e.created_at DESC`,
			kwPatIdx, kwPatIdx, kwPatIdx,
		)
	} else {
		orderBy = " ORDER BY e.created_at DESC"
	}

	listSQL := essaySelectBase + " " + where + orderBy + fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, size, (page-1)*size)

	var rows []essayRow
	if err := r.db.SelectContext(ctx, &rows, listSQL, args...); err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "查询随笔列表失败", err)
	}

	essays := make([]*entity.Essay, len(rows))
	for i := range rows {
		essays[i] = rows[i].toEntity()
	}
	return essays, total, nil
}

func (r *essayRepo) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM essays WHERE id = $1`, id)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "删除随笔失败", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errs.NotFound("随笔不存在")
	}
	return nil
}

func (r *essayRepo) UpdateLikeCount(ctx context.Context, id uuid.UUID, delta int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE essays SET like_count = GREATEST(like_count + $1, 0) WHERE id = $2`,
		delta, id,
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "更新点赞数失败", err)
	}
	return nil
}

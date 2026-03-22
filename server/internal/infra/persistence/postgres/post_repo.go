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

type postRepo struct {
	db *sqlx.DB
}

func NewPostRepo(db *sqlx.DB) repository.PostRepository {
	return &postRepo{db: db}
}

const postSelectBase = `
	SELECT p.id, p.author_id, p.title, p.slug, p.excerpt, p.content,
	       p.category, p.tags, p.like_count, p.read_time_minutes,
	       p.review_status, p.created_at, p.updated_at,
	       u.name AS author_name, u.avatar AS author_avatar, u.handle AS author_handle
	FROM posts p
	JOIN users u ON u.id = p.author_id`

func (r *postRepo) Save(ctx context.Context, post *entity.Post) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO posts (id, author_id, title, slug, excerpt, content, category, tags, like_count, read_time_minutes, review_status, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		post.ID(), post.AuthorID(), post.Title(), post.Slug(),
		post.Excerpt(), post.Content(), post.Category(),
		StringArray(post.Tags()), post.LikeCount(), post.ReadTime(),
		post.ReviewStatus(), post.CreatedAt(), post.UpdatedAt(),
	)
	if err != nil {
		if isUniqueViolation(err) {
			return errs.Conflict("文章 slug 已存在")
		}
		return errs.Wrap(errs.CodeInternal, "保存文章失败", err)
	}
	return nil
}

func (r *postRepo) Update(ctx context.Context, post *entity.Post) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE posts SET title=$1, slug=$2, excerpt=$3, content=$4, category=$5,
		 tags=$6, read_time_minutes=$7, updated_at=$8
		 WHERE id=$9`,
		post.Title(), post.Slug(), post.Excerpt(), post.Content(),
		post.Category(), StringArray(post.Tags()), post.ReadTime(),
		post.UpdatedAt(), post.ID(),
	)
	if err != nil {
		if isUniqueViolation(err) {
			return errs.Conflict("文章 slug 已存在")
		}
		return errs.Wrap(errs.CodeInternal, "更新文章失败", err)
	}
	return nil
}

func (r *postRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Post, error) {
	var row postRow
	err := r.db.GetContext(ctx, &row, postSelectBase+` WHERE p.id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("文章不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询文章失败", err)
	}
	return row.toEntity(), nil
}

func (r *postRepo) FindBySlug(ctx context.Context, slug string) (*entity.Post, error) {
	var row postRow
	err := r.db.GetContext(ctx, &row, postSelectBase+` WHERE p.slug = $1`, slug)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("文章不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询文章失败", err)
	}
	return row.toEntity(), nil
}

func (r *postRepo) List(ctx context.Context, filter repository.PostFilter, page, size int) ([]*entity.Post, int64, error) {
	// 动态构建 WHERE 子句（公开列表不返回已隐藏帖子）
	where := "WHERE p.review_status != 'hidden'"
	args := []interface{}{}
	argIdx := 1

	if filter.Category != nil {
		where += buildArg(&argIdx, " AND p.category = ", &args, *filter.Category)
	}
	if filter.AuthorID != nil {
		where += buildArg(&argIdx, " AND p.author_id = ", &args, *filter.AuthorID)
	}
	if filter.Tag != nil {
		where += fmt.Sprintf(" AND $%d = ANY(p.tags)", argIdx)
		args = append(args, *filter.Tag)
		argIdx++
	}
	// keyword 搜索：ILIKE 模式参数索引 + 原始 keyword 参数索引（标签精确匹配用）
	var kwPatIdx, kwRawIdx int
	if filter.Keyword != nil {
		escaped := escapeLike(*filter.Keyword)
		kwPatIdx = argIdx
		args = append(args, "%"+escaped+"%")
		argIdx++
		kwRawIdx = argIdx
		args = append(args, *filter.Keyword)
		argIdx++
		where += fmt.Sprintf(
			" AND (p.title ILIKE $%d ESCAPE '\\' OR p.excerpt ILIKE $%d ESCAPE '\\' OR p.content ILIKE $%d ESCAPE '\\' OR EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE lower(t) = lower($%d)))",
			kwPatIdx, kwPatIdx, kwPatIdx, kwRawIdx,
		)
	}

	// COUNT
	var total int64
	countSQL := "SELECT COUNT(*) FROM posts p " + where
	if err := r.db.GetContext(ctx, &total, countSQL, args...); err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "统计文章失败", err)
	}

	// SELECT — keyword 搜索时按加权相关性排序，否则按创建时间倒序
	var orderBy string
	if filter.Keyword != nil {
		orderBy = fmt.Sprintf(
			` ORDER BY (CASE WHEN p.title ILIKE $%d ESCAPE '\\' THEN 4 ELSE 0 END + CASE WHEN EXISTS (SELECT 1 FROM unnest(p.tags) t WHERE lower(t) = lower($%d)) THEN 3 ELSE 0 END + CASE WHEN p.excerpt ILIKE $%d ESCAPE '\\' THEN 2 ELSE 0 END + CASE WHEN p.content ILIKE $%d ESCAPE '\\' THEN 1 ELSE 0 END) DESC, p.created_at DESC`,
			kwPatIdx, kwRawIdx, kwPatIdx, kwPatIdx,
		)
	} else {
		orderBy = " ORDER BY p.created_at DESC"
	}
	listSQL := postSelectBase + " " + where + orderBy + fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, size, (page-1)*size)

	var rows []postRow
	if err := r.db.SelectContext(ctx, &rows, listSQL, args...); err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "查询文章列表失败", err)
	}

	posts := make([]*entity.Post, len(rows))
	for i := range rows {
		posts[i] = rows[i].toEntity()
	}
	return posts, total, nil
}

func (r *postRepo) Delete(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM posts WHERE id = $1`, id)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "删除文章失败", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errs.NotFound("文章不存在")
	}
	return nil
}

func (r *postRepo) UpdateLikeCount(ctx context.Context, id uuid.UUID, delta int) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE posts SET like_count = GREATEST(like_count + $1, 0) WHERE id = $2`,
		delta, id,
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "更新点赞数失败", err)
	}
	return nil
}

func (r *postRepo) ListForRecommendation(ctx context.Context, excludeIDs []uuid.UUID, limit int) ([]*entity.Post, error) {
	q := postSelectBase + " WHERE p.review_status != 'hidden'"
	args := []interface{}{}
	argIdx := 1

	if len(excludeIDs) > 0 {
		q += fmt.Sprintf(" AND p.id != ALL($%d)", argIdx)
		args = append(args, UUIDArray(excludeIDs))
		argIdx++
	}

	q += fmt.Sprintf(" ORDER BY p.created_at DESC LIMIT $%d", argIdx)
	args = append(args, limit)

	var rows []postRow
	if err := r.db.SelectContext(ctx, &rows, q, args...); err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询推荐候选失败", err)
	}

	posts := make([]*entity.Post, len(rows))
	for i := range rows {
		posts[i] = rows[i].toEntity()
	}
	return posts, nil
}

func (r *postRepo) ListAllSlugs(ctx context.Context) ([]string, error) {
	var slugs []string
	if err := r.db.SelectContext(ctx, &slugs, `SELECT slug FROM posts`); err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询全量 slug 失败", err)
	}
	return slugs, nil
}

func (r *postRepo) UpdateReviewStatus(ctx context.Context, id uuid.UUID, status string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE posts SET review_status = $1 WHERE id = $2`, status, id)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "更新审核状态失败", err)
	}
	return nil
}

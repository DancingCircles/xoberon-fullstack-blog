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

const userSelectSafe = `id, username, email, name, handle, avatar, bio, role, created_at, updated_at`
const userSelectAll = `id, username, email, password, name, handle, avatar, bio, role, created_at, updated_at`

type userRepo struct {
	db *sqlx.DB
}

func NewUserRepo(db *sqlx.DB) repository.UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Save(ctx context.Context, user *entity.User) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO users (id, username, email, password, name, handle, avatar, bio, role, created_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		user.ID(), user.Username(), user.Email().String(), user.PasswordHash(),
		user.Name(), user.Handle(), user.Avatar(), user.Bio(), user.Role().String(),
		user.CreatedAt(), user.UpdatedAt(),
	)
	if err != nil {
		if isUniqueViolation(err) {
			switch uniqueViolationField(err) {
			case "username":
				return errs.Conflict("用户名已存在")
			case "email":
				return errs.Conflict("邮箱已被注册")
			case "handle":
				return errs.Conflict("Handle 已存在")
			default:
				return errs.Conflict("用户名或邮箱已存在")
			}
		}
		return errs.Wrap(errs.CodeInternal, "保存用户失败", err)
	}
	return nil
}

func (r *userRepo) Update(ctx context.Context, user *entity.User) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET name=$1, handle=$2, avatar=$3, bio=$4, role=$5, updated_at=$6
		 WHERE id=$7`,
		user.Name(), user.Handle(), user.Avatar(), user.Bio(),
		user.Role().String(), user.UpdatedAt(), user.ID(),
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "更新用户失败", err)
	}
	return nil
}

func (r *userRepo) UpdatePassword(ctx context.Context, id uuid.UUID, hash string) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE users SET password=$1, updated_at=NOW() WHERE id=$2`,
		hash, id,
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "更新密码失败", err)
	}
	return nil
}

func (r *userRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	var row userRow
	err := r.db.GetContext(ctx, &row, `SELECT `+userSelectSafe+` FROM users WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("用户不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询用户失败", err)
	}
	return row.toEntity(), nil
}

func (r *userRepo) FindByIDWithPassword(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	var row userRow
	err := r.db.GetContext(ctx, &row, `SELECT `+userSelectAll+` FROM users WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("用户不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询用户失败", err)
	}
	return row.toEntity(), nil
}

func (r *userRepo) FindByUsername(ctx context.Context, username string) (*entity.User, error) {
	var row userRow
	err := r.db.GetContext(ctx, &row, `SELECT `+userSelectAll+` FROM users WHERE username = $1`, username)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("用户不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询用户失败", err)
	}
	return row.toEntity(), nil
}

func (r *userRepo) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	var row userRow
	err := r.db.GetContext(ctx, &row, `SELECT `+userSelectSafe+` FROM users WHERE email = $1`, email)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("用户不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询用户失败", err)
	}
	return row.toEntity(), nil
}

func (r *userRepo) FindByHandle(ctx context.Context, handle string) (*entity.User, error) {
	var row userRow
	err := r.db.GetContext(ctx, &row, `SELECT `+userSelectSafe+` FROM users WHERE handle = $1`, handle)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("用户不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询用户失败", err)
	}
	return row.toEntity(), nil
}

func (r *userRepo) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var exists bool
	err := r.db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM users WHERE username = $1)`, username)
	return exists, err
}

func (r *userRepo) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	var exists bool
	err := r.db.GetContext(ctx, &exists, `SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)`, email)
	return exists, err
}

func (r *userRepo) List(ctx context.Context, page, size int) ([]*entity.User, int64, error) {
	var total int64
	if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM users`); err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "统计用户失败", err)
	}

	var rows []userRow
	err := r.db.SelectContext(ctx, &rows,
		`SELECT `+userSelectSafe+` FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		size, (page-1)*size,
	)
	if err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "查询用户列表失败", err)
	}

	users := make([]*entity.User, len(rows))
	for i := range rows {
		users[i] = rows[i].toEntity()
	}
	return users, total, nil
}

func (r *userRepo) ListWithCounts(ctx context.Context, page, size int) ([]repository.UserWithCounts, int64, error) {
	var total int64
	if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM users`); err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "统计用户失败", err)
	}

	var rows []adminUserRow
	err := r.db.SelectContext(ctx, &rows,
		`SELECT u.id, u.username, u.email, u.name, u.handle, u.avatar, u.bio, u.role,
		        u.created_at, u.updated_at,
		        COALESCE(pc.cnt, 0) AS post_count,
		        COALESCE(ec.cnt, 0) AS essay_count
		 FROM users u
		 LEFT JOIN (SELECT author_id, COUNT(*) AS cnt FROM posts GROUP BY author_id) pc ON pc.author_id = u.id
		 LEFT JOIN (SELECT author_id, COUNT(*) AS cnt FROM essays GROUP BY author_id) ec ON ec.author_id = u.id
		 ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`,
		size, (page-1)*size,
	)
	if err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "查询用户列表失败", err)
	}

	result := make([]repository.UserWithCounts, len(rows))
	for i := range rows {
		result[i] = rows[i].toWithCounts()
	}
	return result, total, nil
}

func (r *userRepo) Search(ctx context.Context, query string) ([]*entity.User, error) {
	var rows []userRow
	escaped := escapeLike(query)
	err := r.db.SelectContext(ctx, &rows,
		`SELECT `+userSelectSafe+` FROM users
		 WHERE name ILIKE $1 ESCAPE '\' OR handle ILIKE $1 ESCAPE '\' OR bio ILIKE $1 ESCAPE '\'
		 ORDER BY GREATEST(similarity(name, $2), similarity(handle, $2)) DESC, created_at DESC
		 LIMIT 50`,
		"%"+escaped+"%", query,
	)
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "搜索用户失败", err)
	}

	users := make([]*entity.User, len(rows))
	for i := range rows {
		users[i] = rows[i].toEntity()
	}
	return users, nil
}

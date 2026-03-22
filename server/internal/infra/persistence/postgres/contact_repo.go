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

type contactRepo struct {
	db *sqlx.DB
}

func NewContactRepo(db *sqlx.DB) repository.ContactRepository {
	return &contactRepo{db: db}
}

func (r *contactRepo) Save(ctx context.Context, contact *entity.Contact) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO contacts (id, name, email, message, is_read, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		contact.ID(), contact.Name(), contact.Email().String(),
		contact.Message(), contact.IsRead(), contact.CreatedAt(),
	)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "保存联系消息失败", err)
	}
	return nil
}

func (r *contactRepo) FindByID(ctx context.Context, id uuid.UUID) (*entity.Contact, error) {
	var row contactRow
	err := r.db.GetContext(ctx, &row, `SELECT * FROM contacts WHERE id = $1`, id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errs.NotFound("消息不存在")
	}
	if err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "查询消息失败", err)
	}
	return row.toEntity(), nil
}

func (r *contactRepo) List(ctx context.Context, page, size int) ([]*entity.Contact, int64, error) {
	var total int64
	if err := r.db.GetContext(ctx, &total, `SELECT COUNT(*) FROM contacts`); err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "统计消息失败", err)
	}

	var rows []contactRow
	err := r.db.SelectContext(ctx, &rows,
		`SELECT * FROM contacts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		size, (page-1)*size,
	)
	if err != nil {
		return nil, 0, errs.Wrap(errs.CodeInternal, "查询消息列表失败", err)
	}

	contacts := make([]*entity.Contact, len(rows))
	for i := range rows {
		contacts[i] = rows[i].toEntity()
	}
	return contacts, total, nil
}

func (r *contactRepo) MarkRead(ctx context.Context, id uuid.UUID) error {
	result, err := r.db.ExecContext(ctx, `UPDATE contacts SET is_read = true WHERE id = $1`, id)
	if err != nil {
		return errs.Wrap(errs.CodeInternal, "标记已读失败", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return errs.NotFound("消息不存在")
	}
	return nil
}

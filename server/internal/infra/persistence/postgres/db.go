package postgres

import (
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/jackc/pgx/v5/stdlib"

	"xoberon-server/internal/infra/config"
)

// NewDB 建立 PostgreSQL 连接池
func NewDB(cfg config.DBConfig) (*sqlx.DB, error) {
	db, err := sqlx.Connect("pgx", cfg.DSN())
	if err != nil {
		return nil, fmt.Errorf("连接 PostgreSQL 失败: %w", err)
	}

	db.SetMaxOpenConns(cfg.MaxOpenConns)
	db.SetMaxIdleConns(cfg.MaxIdleConns)
	db.SetConnMaxLifetime(cfg.ConnMaxLifetime)
	db.SetConnMaxIdleTime(cfg.ConnMaxIdleTime)

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("PostgreSQL ping 失败: %w", err)
	}

	return db, nil
}

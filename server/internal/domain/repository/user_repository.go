package repository

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
)

// UserWithCounts 用户 + 文章/随笔统计（管理后台列表专用）
type UserWithCounts struct {
	User       *entity.User
	PostCount  int64
	EssayCount int64
}

type UserRepository interface {
	Save(ctx context.Context, user *entity.User) error
	// Update 更新用户非敏感字段（name/handle/avatar/bio/role），不触碰 password
	Update(ctx context.Context, user *entity.User) error
	UpdatePassword(ctx context.Context, id uuid.UUID, hash string) error
	FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error)
	FindByIDWithPassword(ctx context.Context, id uuid.UUID) (*entity.User, error)
	FindByUsername(ctx context.Context, username string) (*entity.User, error)
	FindByEmail(ctx context.Context, email string) (*entity.User, error)
	FindByHandle(ctx context.Context, handle string) (*entity.User, error)
	Search(ctx context.Context, query string) ([]*entity.User, error)
	ExistsByUsername(ctx context.Context, username string) (bool, error)
	ExistsByEmail(ctx context.Context, email string) (bool, error)
	List(ctx context.Context, page, size int) ([]*entity.User, int64, error)
	ListWithCounts(ctx context.Context, page, size int) ([]UserWithCounts, int64, error)
}

package mocks

import (
	"context"

	"github.com/google/uuid"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

// ---- PostRepository ----

type MockPostRepository struct{ mock.Mock }

func (m *MockPostRepository) Save(ctx context.Context, post *entity.Post) error {
	return m.Called(ctx, post).Error(0)
}
func (m *MockPostRepository) Update(ctx context.Context, post *entity.Post) error {
	return m.Called(ctx, post).Error(0)
}
func (m *MockPostRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.Post, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.(*entity.Post), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockPostRepository) FindBySlug(ctx context.Context, slug string) (*entity.Post, error) {
	args := m.Called(ctx, slug)
	if v := args.Get(0); v != nil {
		return v.(*entity.Post), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockPostRepository) List(ctx context.Context, filter repository.PostFilter, page, size int) ([]*entity.Post, int64, error) {
	args := m.Called(ctx, filter, page, size)
	if v := args.Get(0); v != nil {
		return v.([]*entity.Post), args.Get(1).(int64), args.Error(2)
	}
	return nil, args.Get(1).(int64), args.Error(2)
}
func (m *MockPostRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
func (m *MockPostRepository) UpdateLikeCount(ctx context.Context, id uuid.UUID, delta int) error {
	return m.Called(ctx, id, delta).Error(0)
}
func (m *MockPostRepository) UpdateReviewStatus(ctx context.Context, id uuid.UUID, status string) error {
	return m.Called(ctx, id, status).Error(0)
}
func (m *MockPostRepository) ListAllSlugs(ctx context.Context) ([]string, error) {
	args := m.Called(ctx)
	if v := args.Get(0); v != nil {
		return v.([]string), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockPostRepository) ListForRecommendation(ctx context.Context, excludeIDs []uuid.UUID, limit int) ([]*entity.Post, error) {
	args := m.Called(ctx, excludeIDs, limit)
	if v := args.Get(0); v != nil {
		return v.([]*entity.Post), args.Error(1)
	}
	return nil, args.Error(1)
}

// ---- UserRepository ----

type MockUserRepository struct{ mock.Mock }

func (m *MockUserRepository) Save(ctx context.Context, user *entity.User) error {
	return m.Called(ctx, user).Error(0)
}
func (m *MockUserRepository) Update(ctx context.Context, user *entity.User) error {
	return m.Called(ctx, user).Error(0)
}
func (m *MockUserRepository) UpdatePassword(ctx context.Context, id uuid.UUID, hash string) error {
	return m.Called(ctx, id, hash).Error(0)
}
func (m *MockUserRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.(*entity.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockUserRepository) FindByIDWithPassword(ctx context.Context, id uuid.UUID) (*entity.User, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.(*entity.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockUserRepository) FindByUsername(ctx context.Context, username string) (*entity.User, error) {
	args := m.Called(ctx, username)
	if v := args.Get(0); v != nil {
		return v.(*entity.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockUserRepository) FindByEmail(ctx context.Context, email string) (*entity.User, error) {
	args := m.Called(ctx, email)
	if v := args.Get(0); v != nil {
		return v.(*entity.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockUserRepository) FindByHandle(ctx context.Context, handle string) (*entity.User, error) {
	args := m.Called(ctx, handle)
	if v := args.Get(0); v != nil {
		return v.(*entity.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockUserRepository) Search(ctx context.Context, query string) ([]*entity.User, error) {
	args := m.Called(ctx, query)
	if v := args.Get(0); v != nil {
		return v.([]*entity.User), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockUserRepository) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	args := m.Called(ctx, username)
	return args.Bool(0), args.Error(1)
}
func (m *MockUserRepository) ExistsByEmail(ctx context.Context, email string) (bool, error) {
	args := m.Called(ctx, email)
	return args.Bool(0), args.Error(1)
}
func (m *MockUserRepository) List(ctx context.Context, page, size int) ([]*entity.User, int64, error) {
	args := m.Called(ctx, page, size)
	if v := args.Get(0); v != nil {
		return v.([]*entity.User), args.Get(1).(int64), args.Error(2)
	}
	return nil, args.Get(1).(int64), args.Error(2)
}
func (m *MockUserRepository) ListWithCounts(ctx context.Context, page, size int) ([]repository.UserWithCounts, int64, error) {
	args := m.Called(ctx, page, size)
	if v := args.Get(0); v != nil {
		return v.([]repository.UserWithCounts), args.Get(1).(int64), args.Error(2)
	}
	return nil, args.Get(1).(int64), args.Error(2)
}

// ---- EssayRepository ----

type MockEssayRepository struct{ mock.Mock }

func (m *MockEssayRepository) Save(ctx context.Context, essay *entity.Essay) error {
	return m.Called(ctx, essay).Error(0)
}
func (m *MockEssayRepository) Update(ctx context.Context, essay *entity.Essay) error {
	return m.Called(ctx, essay).Error(0)
}
func (m *MockEssayRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.Essay, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.(*entity.Essay), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockEssayRepository) List(ctx context.Context, filter repository.EssayFilter, page, size int) ([]*entity.Essay, int64, error) {
	args := m.Called(ctx, filter, page, size)
	if v := args.Get(0); v != nil {
		return v.([]*entity.Essay), args.Get(1).(int64), args.Error(2)
	}
	return nil, args.Get(1).(int64), args.Error(2)
}
func (m *MockEssayRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
func (m *MockEssayRepository) UpdateLikeCount(ctx context.Context, id uuid.UUID, delta int) error {
	return m.Called(ctx, id, delta).Error(0)
}

// ---- CommentRepository ----

type MockCommentRepository struct{ mock.Mock }

func (m *MockCommentRepository) Save(ctx context.Context, comment *entity.Comment) error {
	return m.Called(ctx, comment).Error(0)
}
func (m *MockCommentRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.Comment, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.(*entity.Comment), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockCommentRepository) ListByPost(ctx context.Context, postID uuid.UUID, page, size int) ([]*entity.Comment, error) {
	args := m.Called(ctx, postID, page, size)
	if v := args.Get(0); v != nil {
		return v.([]*entity.Comment), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockCommentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}
func (m *MockCommentRepository) CountByPost(ctx context.Context, postID uuid.UUID) (int64, error) {
	args := m.Called(ctx, postID)
	return args.Get(0).(int64), args.Error(1)
}

// ---- ContactRepository ----

type MockContactRepository struct{ mock.Mock }

func (m *MockContactRepository) Save(ctx context.Context, contact *entity.Contact) error {
	return m.Called(ctx, contact).Error(0)
}
func (m *MockContactRepository) FindByID(ctx context.Context, id uuid.UUID) (*entity.Contact, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.(*entity.Contact), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockContactRepository) List(ctx context.Context, page, size int) ([]*entity.Contact, int64, error) {
	args := m.Called(ctx, page, size)
	if v := args.Get(0); v != nil {
		return v.([]*entity.Contact), args.Get(1).(int64), args.Error(2)
	}
	return nil, args.Get(1).(int64), args.Error(2)
}
func (m *MockContactRepository) MarkRead(ctx context.Context, id uuid.UUID) error {
	return m.Called(ctx, id).Error(0)
}

// ---- LikeRepository ----

type MockLikeRepository struct{ mock.Mock }

func (m *MockLikeRepository) Toggle(ctx context.Context, userID, targetID uuid.UUID, targetType repository.TargetType) (bool, int, error) {
	args := m.Called(ctx, userID, targetID, targetType)
	return args.Bool(0), args.Int(1), args.Error(2)
}
func (m *MockLikeRepository) Exists(ctx context.Context, userID, targetID uuid.UUID, targetType repository.TargetType) (bool, error) {
	args := m.Called(ctx, userID, targetID, targetType)
	return args.Bool(0), args.Error(1)
}
func (m *MockLikeRepository) ListByUser(ctx context.Context, userID uuid.UUID, targetType repository.TargetType) ([]uuid.UUID, error) {
	args := m.Called(ctx, userID, targetType)
	if v := args.Get(0); v != nil {
		return v.([]uuid.UUID), args.Error(1)
	}
	return nil, args.Error(1)
}

// ---- ViewRepository ----

type MockViewRepository struct{ mock.Mock }

func (m *MockViewRepository) Upsert(ctx context.Context, userID, postID uuid.UUID) error {
	return m.Called(ctx, userID, postID).Error(0)
}
func (m *MockViewRepository) ListRecentPostIDs(ctx context.Context, userID uuid.UUID, limit int) ([]uuid.UUID, error) {
	args := m.Called(ctx, userID, limit)
	if v := args.Get(0); v != nil {
		return v.([]uuid.UUID), args.Error(1)
	}
	return nil, args.Error(1)
}

package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"
)

// ---- PostCachePort ----

type MockPostCache struct{ mock.Mock }

func (m *MockPostCache) GetDetail(ctx context.Context, slug string) ([]byte, error) {
	args := m.Called(ctx, slug)
	if v := args.Get(0); v != nil {
		return v.([]byte), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockPostCache) GetList(ctx context.Context, key string) ([]byte, error) {
	args := m.Called(ctx, key)
	if v := args.Get(0); v != nil {
		return v.([]byte), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockPostCache) SetDetail(ctx context.Context, slug string, data interface{}) error {
	return m.Called(ctx, slug, data).Error(0)
}
func (m *MockPostCache) SetList(ctx context.Context, key string, data interface{}) error {
	return m.Called(ctx, key, data).Error(0)
}
func (m *MockPostCache) SetNullMarker(ctx context.Context, slug string) error {
	return m.Called(ctx, slug).Error(0)
}
func (m *MockPostCache) InvalidatePost(ctx context.Context, slug string) error {
	return m.Called(ctx, slug).Error(0)
}
func (m *MockPostCache) InvalidateAll(ctx context.Context) error {
	return m.Called(ctx).Error(0)
}

// ---- EssayCachePort ----

type MockEssayCache struct{ mock.Mock }

func (m *MockEssayCache) GetDetail(ctx context.Context, id string) ([]byte, error) {
	args := m.Called(ctx, id)
	if v := args.Get(0); v != nil {
		return v.([]byte), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockEssayCache) GetList(ctx context.Context, key string) ([]byte, error) {
	args := m.Called(ctx, key)
	if v := args.Get(0); v != nil {
		return v.([]byte), args.Error(1)
	}
	return nil, args.Error(1)
}
func (m *MockEssayCache) SetDetail(ctx context.Context, id string, data interface{}) error {
	return m.Called(ctx, id, data).Error(0)
}
func (m *MockEssayCache) SetList(ctx context.Context, key string, data interface{}) error {
	return m.Called(ctx, key, data).Error(0)
}
func (m *MockEssayCache) SetNullMarker(ctx context.Context, id string) error {
	return m.Called(ctx, id).Error(0)
}
func (m *MockEssayCache) InvalidateEssay(ctx context.Context, id string) error {
	return m.Called(ctx, id).Error(0)
}
func (m *MockEssayCache) InvalidateAll(ctx context.Context) error {
	return m.Called(ctx).Error(0)
}

package mocks

import (
	"context"
	"time"

	"github.com/stretchr/testify/mock"
)

// ---- TokenBlacklist ----

type MockTokenBlacklist struct{ mock.Mock }

func (m *MockTokenBlacklist) Revoke(ctx context.Context, jti string, ttl time.Duration) error {
	return m.Called(ctx, jti, ttl).Error(0)
}
func (m *MockTokenBlacklist) IsRevoked(ctx context.Context, jti string) (bool, error) {
	args := m.Called(ctx, jti)
	return args.Bool(0), args.Error(1)
}

// ---- LoginLimiter ----

type MockLoginLimiter struct{ mock.Mock }

func (m *MockLoginLimiter) Check(ctx context.Context, username string) (bool, error) {
	args := m.Called(ctx, username)
	return args.Bool(0), args.Error(1)
}
func (m *MockLoginLimiter) RecordFailure(ctx context.Context, username string) error {
	return m.Called(ctx, username).Error(0)
}
func (m *MockLoginLimiter) Reset(ctx context.Context, username string) error {
	return m.Called(ctx, username).Error(0)
}

// ---- CaptchaGenerator ----

type MockCaptchaGenerator struct{ mock.Mock }

func (m *MockCaptchaGenerator) Generate() (string, string, error) {
	args := m.Called()
	return args.String(0), args.String(1), args.Error(2)
}

func (m *MockCaptchaGenerator) Verify(id, code string) bool {
	return m.Called(id, code).Bool(0)
}

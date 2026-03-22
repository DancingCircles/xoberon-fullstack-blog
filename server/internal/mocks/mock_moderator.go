package mocks

import (
	"context"

	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/service"
)

type MockContentModerator struct{ mock.Mock }

func (m *MockContentModerator) Check(ctx context.Context, text string) (*service.ModerationResult, error) {
	args := m.Called(ctx, text)
	if v := args.Get(0); v != nil {
		return v.(*service.ModerationResult), args.Error(1)
	}
	return nil, args.Error(1)
}

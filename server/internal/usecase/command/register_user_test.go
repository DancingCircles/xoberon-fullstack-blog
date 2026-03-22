package command_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/infra/auth"
	"xoberon-server/internal/infra/config"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func newTestJWT() *auth.JWTManager {
	return auth.NewJWTManager(config.JWTConfig{
		Secret:            "test-secret-key-must-be-at-least-32-bytes-long!!",
		AccessExpiration:  1 * time.Hour,
		RefreshExpiration: 24 * time.Hour,
	})
}

func TestRegisterUser_Success(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	userRepo.On("Save", mock.Anything, mock.Anything).Return(nil)

	h := command.NewRegisterHandler(userRepo, newTestJWT())
	result, err := h.Handle(context.Background(), command.RegisterCommand{
		Username: "newuser",
		Email:    "new@example.com",
		Password: "StrongPass1",
		Name:     "X",
	})

	assert.NoError(t, err)
	assert.NotEmpty(t, result.Token)
	assert.NotNil(t, result.User)
}

func TestRegisterUser_UsernameConflict(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	userRepo.On("Save", mock.Anything, mock.Anything).Return(errs.Conflict("用户名已存在"))

	h := command.NewRegisterHandler(userRepo, newTestJWT())
	_, err := h.Handle(context.Background(), command.RegisterCommand{
		Username: "existing",
		Email:    "new@example.com",
		Password: "StrongPass1",
		Name:     "X",
	})

	assert.Error(t, err)
	var ae *errs.AppError
	assert.True(t, errors.As(err, &ae) && ae.Code() == errs.CodeConflict)
}

func TestRegisterUser_InvalidEmail(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)

	h := command.NewRegisterHandler(userRepo, newTestJWT())
	_, err := h.Handle(context.Background(), command.RegisterCommand{
		Username: "testuser",
		Email:    "not-an-email",
		Password: "StrongPass1",
		Name:     "X",
	})

	assert.Error(t, err)
}

func TestRegisterUser_WeakPassword(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)

	h := command.NewRegisterHandler(userRepo, newTestJWT())
	_, err := h.Handle(context.Background(), command.RegisterCommand{
		Username: "testuser",
		Email:    "test@example.com",
		Password: "123",
		Name:     "X",
	})

	assert.Error(t, err)
}

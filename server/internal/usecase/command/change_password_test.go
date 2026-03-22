package command_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestChangePassword_Success(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	userID := uuid.New()
	userWithOldHash, _ := entity.NewUser("testcp", "cp@example.com", "OldPass123", "X")
	userWithOldHash = entity.ReconstructUser(userID, "testuser", "test@example.com", userWithOldHash.PasswordHash(), "X", "@testuser", "/avatars/1.png", "", "user", time.Now(), time.Now())

	userRepo.On("FindByIDWithPassword", mock.Anything, userID).Return(userWithOldHash, nil)
	userRepo.On("UpdatePassword", mock.Anything, userID, mock.Anything).Return(nil)

	h := command.NewChangePasswordHandler(userRepo)
	err := h.Handle(context.Background(), command.ChangePasswordCommand{UserID: userID, OldPassword: "OldPass123", NewPassword: "NewPass456"})

	assert.NoError(t, err)
}

func TestChangePassword_WrongOldPassword(t *testing.T) {
	userRepo := new(mocks.MockUserRepository)
	userID := uuid.New()
	user, _ := entity.NewUser("testcp2", "cp2@example.com", "CorrectPass1", "X")
	user = entity.ReconstructUser(userID, "testuser", "test@example.com", user.PasswordHash(), "X", "@testuser", "/avatars/1.png", "", "user", time.Now(), time.Now())

	userRepo.On("FindByIDWithPassword", mock.Anything, userID).Return(user, nil)

	h := command.NewChangePasswordHandler(userRepo)
	err := h.Handle(context.Background(), command.ChangePasswordCommand{UserID: userID, OldPassword: "WrongPass1", NewPassword: "NewPass456"})

	assert.Error(t, err)
	var ae *errs.AppError
	require.True(t, errors.As(err, &ae))
	assert.Equal(t, errs.CodeUnauthorized, ae.Code())
}

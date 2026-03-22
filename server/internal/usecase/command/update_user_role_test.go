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

func TestUpdateUserRole_Success(t *testing.T) {
	users := new(mocks.MockUserRepository)
	targetID := uuid.New()
	now := time.Now()
	user := entity.ReconstructUser(targetID, "testuser", "test@example.com", "$2a$12$LJ3m4ys3Bz4IihWyXDw2xeqH7VlBsJEv8JsdO7YYu5FJdNJuGHpai", "X", "@testuser", "/avatars/1.png", "", "user", now, now)

	users.On("FindByID", mock.Anything, targetID).Return(user, nil)
	users.On("Update", mock.Anything, mock.Anything).Return(nil)

	h := command.NewUpdateUserRoleHandler(users)
	got, err := h.Handle(context.Background(), command.UpdateUserRoleCommand{TargetUserID: targetID, NewRole: "admin"})

	require.NoError(t, err)
	assert.NotNil(t, got)
	assert.True(t, got.Role().IsAdmin())
}

func TestUpdateUserRole_InvalidRole(t *testing.T) {
	users := new(mocks.MockUserRepository)
	targetID := uuid.New()

	h := command.NewUpdateUserRoleHandler(users)
	got, err := h.Handle(context.Background(), command.UpdateUserRoleCommand{TargetUserID: targetID, NewRole: "superuser"})

	assert.Error(t, err)
	assert.Nil(t, got)
	var ae *errs.AppError
	require.True(t, errors.As(err, &ae))
	assert.Equal(t, errs.CodeValidation, ae.Code())
}

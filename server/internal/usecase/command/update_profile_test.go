package command_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestUpdateProfile_Success(t *testing.T) {
	users := new(mocks.MockUserRepository)
	userID := uuid.New()
	now := time.Now()
	user := entity.ReconstructUser(userID, "testuser", "test@example.com", "$2a$12$LJ3m4ys3Bz4IihWyXDw2xeqH7VlBsJEv8JsdO7YYu5FJdNJuGHpai", "X", "@testuser", "/avatars/1.png", "", "user", now, now)

	users.On("FindByID", mock.Anything, userID).Return(user, nil)
	users.On("Update", mock.Anything, mock.Anything).Return(nil)

	h := command.NewUpdateProfileHandler(users)
	got, err := h.Handle(context.Background(), command.UpdateProfileCommand{UserID: userID, Name: "X Updated", Bio: "bio", Avatar: "/avatars/2.png"})

	require.NoError(t, err)
	assert.NotNil(t, got)
	assert.Equal(t, "X Updated", got.Name())
	assert.Equal(t, "bio", got.Bio())
	assert.Equal(t, "/avatars/2.png", got.Avatar())
}

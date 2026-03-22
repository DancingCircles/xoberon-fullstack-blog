package query

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/mocks"
)

func TestGetUserProfile_Success(t *testing.T) {
	mockUsers := new(mocks.MockUserRepository)
	mockPosts := new(mocks.MockPostRepository)
	mockEssays := new(mocks.MockEssayRepository)

	userID := uuid.New()
	user := entity.ReconstructUser(
		userID, "xuser", "x@example.com", "hashedpw",
		"X", "x-handle", "", "bio text", "user",
		time.Now(), time.Now(),
	)

	mockUsers.On("FindByHandle", mock.Anything, "x-handle").Return(user, nil)
	mockPosts.On("List", mock.Anything, mock.Anything, 1, 1).Return(nil, int64(5), nil)
	mockEssays.On("List", mock.Anything, mock.Anything, 1, 1).Return(nil, int64(3), nil)

	h := NewGetUserProfileHandler(mockUsers, mockPosts, mockEssays)
	result, err := h.Handle(context.Background(), "x-handle")

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "X", result.User.Name())
	assert.Equal(t, int64(5), result.PostCount)
	assert.Equal(t, int64(3), result.EssayCount)
}

func TestGetUserProfile_NotFound(t *testing.T) {
	mockUsers := new(mocks.MockUserRepository)
	mockPosts := new(mocks.MockPostRepository)
	mockEssays := new(mocks.MockEssayRepository)

	mockUsers.On("FindByHandle", mock.Anything, "unknown").Return(nil, errs.NotFound("用户不存在"))

	h := NewGetUserProfileHandler(mockUsers, mockPosts, mockEssays)
	result, err := h.Handle(context.Background(), "unknown")

	assert.Nil(t, result)
	assert.Error(t, err)
}

package query

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/mocks"
)

func TestSearchUsers_Success(t *testing.T) {
	mockRepo := new(mocks.MockUserRepository)

	user := entity.ReconstructUser(
		uuid.New(), "xuser", "x@example.com", "hash",
		"X", "x-handle", "", "", "user",
		time.Now(), time.Now(),
	)

	mockRepo.On("Search", mock.Anything, "x").Return([]*entity.User{user}, nil)

	h := NewSearchUsersHandler(mockRepo)
	users, err := h.Handle(context.Background(), "x")

	assert.NoError(t, err)
	assert.Len(t, users, 1)
	assert.Equal(t, "X", users[0].Name())
}

func TestSearchUsers_EmptyQuery(t *testing.T) {
	mockRepo := new(mocks.MockUserRepository)

	h := NewSearchUsersHandler(mockRepo)
	users, err := h.Handle(context.Background(), "")

	assert.NoError(t, err)
	assert.Empty(t, users)
	mockRepo.AssertNotCalled(t, "Search")
}

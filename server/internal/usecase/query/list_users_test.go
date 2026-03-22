package query

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/mocks"
)

func TestListUsers_Success(t *testing.T) {
	mockRepo := new(mocks.MockUserRepository)

	user := entity.ReconstructUser(
		uuid.New(), "xuser", "x@example.com", "hash",
		"X", "x-handle", "", "", "user",
		time.Now(), time.Now(),
	)

	mockRepo.On("List", mock.Anything, 1, 10).Return([]*entity.User{user}, int64(1), nil)

	h := NewListUsersHandler(mockRepo)
	users, total, err := h.Handle(context.Background(), ListUsersQuery{Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, users, 1)
}

func TestListUsers_HandleWithCounts(t *testing.T) {
	mockRepo := new(mocks.MockUserRepository)

	user := entity.ReconstructUser(
		uuid.New(), "xuser", "x@example.com", "hash",
		"X", "x-handle", "", "", "admin",
		time.Now(), time.Now(),
	)
	uwc := repository.UserWithCounts{User: user, PostCount: 10, EssayCount: 5}

	mockRepo.On("ListWithCounts", mock.Anything, 1, 10).Return([]repository.UserWithCounts{uwc}, int64(1), nil)

	h := NewListUsersHandler(mockRepo)
	results, total, err := h.HandleWithCounts(context.Background(), ListUsersQuery{Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, results, 1)
	assert.Equal(t, int64(10), results[0].PostCount)
	assert.Equal(t, int64(5), results[0].EssayCount)
}

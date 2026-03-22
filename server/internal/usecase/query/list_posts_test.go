package query

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/mocks"
)

func TestListPosts_Success(t *testing.T) {
	mockRepo := new(mocks.MockPostRepository)
	mockCache := new(mocks.MockPostCache)

	post, _ := entity.NewPost(uuid.New(), "Test Title", strings.Repeat("test content ", 10), "Tech", []string{"go"})

	mockCache.On("GetList", mock.Anything, mock.Anything).Return(nil, nil)
	mockRepo.On("List", mock.Anything, mock.Anything, 1, 10).Return([]*entity.Post{post}, int64(1), nil)
	mockCache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	h := NewListPostsHandler(mockRepo, mockCache)
	posts, total, err := h.Handle(context.Background(), ListPostsQuery{Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, posts, 1)
	assert.Equal(t, "Test Title", posts[0].Title())
	mockRepo.AssertExpectations(t)
	mockCache.AssertExpectations(t)
}

func TestListPosts_EmptyResult(t *testing.T) {
	mockRepo := new(mocks.MockPostRepository)
	mockCache := new(mocks.MockPostCache)

	mockCache.On("GetList", mock.Anything, mock.Anything).Return(nil, nil)
	mockRepo.On("List", mock.Anything, mock.Anything, 1, 10).Return([]*entity.Post{}, int64(0), nil)
	mockCache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	h := NewListPostsHandler(mockRepo, mockCache)
	posts, total, err := h.Handle(context.Background(), ListPostsQuery{Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, posts)
}

func TestListPosts_WithCategory(t *testing.T) {
	mockRepo := new(mocks.MockPostRepository)
	mockCache := new(mocks.MockPostCache)
	cat := "Design"

	post, _ := entity.NewPost(uuid.New(), "Design Post", strings.Repeat("content here ", 10), "Design", nil)

	mockCache.On("GetList", mock.Anything, mock.Anything).Return(nil, nil)
	mockRepo.On("List", mock.Anything, mock.Anything, 1, 10).Return([]*entity.Post{post}, int64(1), nil)
	mockCache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	h := NewListPostsHandler(mockRepo, mockCache)
	posts, total, err := h.Handle(context.Background(), ListPostsQuery{Category: &cat, Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, posts, 1)
}

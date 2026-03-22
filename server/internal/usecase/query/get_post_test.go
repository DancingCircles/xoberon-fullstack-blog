package query

import (
	"context"
	"strings"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/mocks"
	"xoberon-server/pkg/bloom"
)

func TestGetPost_Success(t *testing.T) {
	mockPosts := new(mocks.MockPostRepository)
	mockComments := new(mocks.MockCommentRepository)
	mockCache := new(mocks.MockPostCache)
	bf := bloom.New(1000, 0.01)

	authorID := uuid.New()
	post, _ := entity.NewPost(authorID, "Test Post", strings.Repeat("content body ", 10), "Tech", []string{"go"})
	bf.Add(post.Slug())

	comment := entity.ReconstructComment(uuid.New(), post.ID(), uuid.New(), "Great post!", "X", "", "published", post.CreatedAt())

	mockCache.On("GetDetail", mock.Anything, post.Slug()).Return(nil, nil)
	mockPosts.On("FindBySlug", mock.Anything, post.Slug()).Return(post, nil)
	mockComments.On("ListByPost", mock.Anything, post.ID(), 1, 50).Return([]*entity.Comment{comment}, nil)
	mockCache.On("SetDetail", mock.Anything, post.Slug(), mock.Anything).Return(nil)

	h := NewGetPostHandler(mockPosts, mockComments, mockCache, bf)
	result, err := h.Handle(context.Background(), post.Slug())

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Test Post", result.Post.Title())
	assert.Len(t, result.Comments, 1)
	mockPosts.AssertExpectations(t)
	mockComments.AssertExpectations(t)
}

func TestGetPost_NotInBloom(t *testing.T) {
	bf := bloom.New(1000, 0.01)
	h := NewGetPostHandler(nil, nil, nil, bf)

	result, err := h.Handle(context.Background(), "non-existent-slug")

	assert.Nil(t, result)
	assert.Error(t, err)
	appErr, ok := err.(*errs.AppError)
	assert.True(t, ok)
	assert.Equal(t, errs.CodeNotFound, appErr.Code())
}

func TestGetPost_NotFound(t *testing.T) {
	mockPosts := new(mocks.MockPostRepository)
	mockComments := new(mocks.MockCommentRepository)
	mockCache := new(mocks.MockPostCache)
	bf := bloom.New(1000, 0.01)
	bf.Add("some-slug")

	mockCache.On("GetDetail", mock.Anything, "some-slug").Return(nil, nil)
	mockPosts.On("FindBySlug", mock.Anything, "some-slug").Return(nil, errs.NotFound("文章不存在"))
	mockCache.On("SetNullMarker", mock.Anything, "some-slug").Return(nil)

	h := NewGetPostHandler(mockPosts, mockComments, mockCache, bf)
	result, err := h.Handle(context.Background(), "some-slug")

	assert.Nil(t, result)
	assert.Error(t, err)
}

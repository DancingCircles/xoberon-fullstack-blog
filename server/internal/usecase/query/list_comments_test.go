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

func TestListComments_Success(t *testing.T) {
	mockRepo := new(mocks.MockCommentRepository)

	postID := uuid.New()
	comment := entity.ReconstructComment(
		uuid.New(), postID, uuid.New(),
		"Test comment", "X", "", "published",
		time.Now(),
	)

	mockRepo.On("ListByPost", mock.Anything, postID, 1, 20).Return([]*entity.Comment{comment}, nil)
	mockRepo.On("CountByPost", mock.Anything, postID).Return(int64(1), nil)

	h := NewListCommentsByPostHandler(mockRepo)
	comments, total, err := h.Handle(context.Background(), ListCommentsByPostQuery{PostID: postID, Page: 1, PageSize: 20})

	assert.NoError(t, err)
	assert.Len(t, comments, 1)
	assert.Equal(t, int64(1), total)
	assert.Equal(t, "Test comment", comments[0].Content())
}

func TestListComments_Empty(t *testing.T) {
	mockRepo := new(mocks.MockCommentRepository)
	postID := uuid.New()

	mockRepo.On("ListByPost", mock.Anything, postID, 1, 20).Return([]*entity.Comment{}, nil)
	mockRepo.On("CountByPost", mock.Anything, postID).Return(int64(0), nil)

	h := NewListCommentsByPostHandler(mockRepo)
	comments, total, err := h.Handle(context.Background(), ListCommentsByPostQuery{PostID: postID, Page: 1, PageSize: 20})

	assert.NoError(t, err)
	assert.Empty(t, comments)
	assert.Zero(t, total)
}

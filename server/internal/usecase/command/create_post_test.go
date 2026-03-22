package command_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
	"xoberon-server/pkg/bloom"
)

func newBloom() *bloom.SlugFilter {
	return bloom.New(1000, 0.01)
}

func TestCreatePost_Success(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)
	bf := newBloom()

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	postRepo.On("Save", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidateAll", mock.Anything).Return(nil)
	postRepo.On("FindByID", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("not critical"))

	authorID := uuid.New()

	h := command.NewCreatePostHandler(postRepo, cache, bf, moderator)
	post, err := h.Handle(context.Background(), command.CreatePostCommand{
		AuthorID: authorID,
		Title:    "Test Title",
		Content:  "This is test content that is long enough to pass validation for the post entity creation.",
		Category: "Tech",
		Tags:     []string{"go"},
	})

	assert.NoError(t, err)
	assert.NotNil(t, post)
}

func TestCreatePost_EmptyTitle(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)
	bf := newBloom()

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)

	h := command.NewCreatePostHandler(postRepo, cache, bf, moderator)
	_, err := h.Handle(context.Background(), command.CreatePostCommand{
		AuthorID: uuid.New(),
		Title:    "",
		Content:  "This is test content that is long enough.",
		Category: "Tech",
	})

	assert.Error(t, err)
}

func TestCreatePost_ModerationReject(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)
	bf := newBloom()

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{
		Decision: service.DecisionReject,
		Reason:   "inappropriate content",
	}, nil)

	h := command.NewCreatePostHandler(postRepo, cache, bf, moderator)
	_, err := h.Handle(context.Background(), command.CreatePostCommand{
		AuthorID: uuid.New(),
		Title:    "Bad Post",
		Content:  "This is inappropriate content that should be rejected by moderator.",
		Category: "Tech",
	})

	assert.Error(t, err)
}

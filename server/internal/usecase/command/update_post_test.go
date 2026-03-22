package command_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestUpdatePost_Success(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)

	authorID := uuid.New()
	postID := uuid.New()
	existingPost := entity.ReconstructPost(
		postID, authorID,
		"Old Title", "old-title", "Old excerpt...",
		"Old content that is long enough to pass validation for the post entity.",
		"Tech", []string{"go"}, 0, 1,
		"X", "/avatars/1.png", "@testuser", "published",
		time.Now(), time.Now(),
	)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	postRepo.On("FindByID", mock.Anything, postID).Return(existingPost, nil)
	postRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidatePost", mock.Anything, mock.Anything).Return(nil)

	role, _ := valueobject.NewRole("user")
	h := command.NewUpdatePostHandler(postRepo, cache, moderator)
	post, err := h.Handle(context.Background(), command.UpdatePostCommand{
		PostID:   postID,
		EditorID: authorID,
		Role:     role,
		Title:    "New Title",
		Content:  "New content that is long enough to pass validation for the post entity update.",
		Category: "Tech",
		Tags:     []string{"go", "test"},
	})

	assert.NoError(t, err)
	assert.NotNil(t, post)
}

func TestUpdatePost_NotFound(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	postRepo.On("FindByID", mock.Anything, mock.Anything).Return(nil, errs.NotFound("文章不存在"))

	role, _ := valueobject.NewRole("user")
	h := command.NewUpdatePostHandler(postRepo, cache, moderator)
	_, err := h.Handle(context.Background(), command.UpdatePostCommand{
		PostID:   uuid.New(),
		EditorID: uuid.New(),
		Role:     role,
		Title:    "Title",
		Content:  "Content that is long enough to pass validation for posts.",
		Category: "Tech",
	})

	assert.Error(t, err)
	assert.True(t, errs.IsNotFound(err))
}

func TestUpdatePost_NotAuthor(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)

	authorID := uuid.New()
	postID := uuid.New()
	existingPost := entity.ReconstructPost(
		postID, authorID,
		"Title", "title", "Excerpt...",
		"Content that is long enough to pass validation for the post entity.",
		"Tech", []string{}, 0, 1,
		"X", "/avatars/1.png", "@testuser", "published",
		time.Now(), time.Now(),
	)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	postRepo.On("FindByID", mock.Anything, postID).Return(existingPost, nil)

	role, _ := valueobject.NewRole("user")
	h := command.NewUpdatePostHandler(postRepo, cache, moderator)
	_, err := h.Handle(context.Background(), command.UpdatePostCommand{
		PostID:   postID,
		EditorID: uuid.New(),
		Role:     role,
		Title:    "New Title",
		Content:  "New content that is long enough to pass validation for posts.",
		Category: "Tech",
	})

	assert.Error(t, err)
	var ae *errs.AppError
	assert.True(t, errors.As(err, &ae) && ae.Code() == errs.CodeForbidden)
}

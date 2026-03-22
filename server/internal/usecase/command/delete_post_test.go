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
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)


func TestDeletePost_Success(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	bf := newBloom()

	authorID := uuid.New()
	postID := uuid.New()
	existingPost := entity.ReconstructPost(
		postID, authorID,
		"Title", "title", "Excerpt...",
		"Content long enough for test",
		"Tech", []string{}, 0, 1,
		"X", "/avatars/1.png", "@testuser", "published",
		time.Now(), time.Now(),
	)

	postRepo.On("FindByID", mock.Anything, postID).Return(existingPost, nil)
	postRepo.On("Delete", mock.Anything, postID).Return(nil)
	cache.On("InvalidatePost", mock.Anything, mock.Anything).Return(nil)
	postRepo.On("ListAllSlugs", mock.Anything).Return([]string{}, nil)

	role, _ := valueobject.NewRole("user")
	h := command.NewDeletePostHandler(postRepo, cache, bf)
	err := h.Handle(context.Background(), command.DeletePostCommand{
		PostID: postID,
		UserID: authorID,
		Role:   role,
	})

	assert.NoError(t, err)
}

func TestDeletePost_NotFound(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	bf := newBloom()

	postRepo.On("FindByID", mock.Anything, mock.Anything).Return(nil, errs.NotFound("文章不存在"))

	role, _ := valueobject.NewRole("user")
	h := command.NewDeletePostHandler(postRepo, cache, bf)
	err := h.Handle(context.Background(), command.DeletePostCommand{
		PostID: uuid.New(),
		UserID: uuid.New(),
		Role:   role,
	})

	assert.Error(t, err)
	assert.True(t, errs.IsNotFound(err))
}

func TestDeletePost_NotAuthor(t *testing.T) {
	postRepo := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	bf := newBloom()

	authorID := uuid.New()
	postID := uuid.New()
	existingPost := entity.ReconstructPost(
		postID, authorID,
		"Title", "title", "Excerpt...",
		"Content long enough for test",
		"Tech", []string{}, 0, 1,
		"X", "/avatars/1.png", "@testuser", "published",
		time.Now(), time.Now(),
	)

	postRepo.On("FindByID", mock.Anything, postID).Return(existingPost, nil)

	role, _ := valueobject.NewRole("user")
	h := command.NewDeletePostHandler(postRepo, cache, bf)
	err := h.Handle(context.Background(), command.DeletePostCommand{
		PostID: postID,
		UserID: uuid.New(),
		Role:   role,
	})

	assert.Error(t, err)
	var ae *errs.AppError
	assert.True(t, errors.As(err, &ae) && ae.Code() == errs.CodeForbidden)
}

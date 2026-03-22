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
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/service"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestCreateComment_Success(t *testing.T) {
	comments := new(mocks.MockCommentRepository)
	posts := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)

	postID := uuid.New()
	authorID := uuid.New()
	content := "test comment"
	post := entity.ReconstructPost(
		postID, authorID, "title", "title-slug", "excerpt", "content", "Tech", nil,
		0, 1, "X", "/avatars/1.png", "@x", "published", time.Now(), time.Now(),
	)
	comment, _ := entity.NewComment(postID, authorID, content)

	posts.On("FindByID", mock.Anything, postID).Return(post, nil)
	moderator.On("Check", mock.Anything, content).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	comments.On("Save", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidatePost", mock.Anything, "title-slug").Return(nil)
	comments.On("FindByID", mock.Anything, mock.Anything).Return(comment, nil)

	h := command.NewCreateCommentHandler(comments, posts, cache, moderator)
	got, err := h.Handle(context.Background(), command.CreateCommentCommand{PostID: postID, AuthorID: authorID, Content: content})

	require.NoError(t, err)
	assert.NotNil(t, got)
	assert.Equal(t, content, got.Content())
}

func TestCreateComment_PostNotFound(t *testing.T) {
	comments := new(mocks.MockCommentRepository)
	posts := new(mocks.MockPostRepository)
	cache := new(mocks.MockPostCache)
	moderator := new(mocks.MockContentModerator)

	postID := uuid.New()
	authorID := uuid.New()

	posts.On("FindByID", mock.Anything, postID).Return(nil, errs.NotFound("post not found"))

	h := command.NewCreateCommentHandler(comments, posts, cache, moderator)
	got, err := h.Handle(context.Background(), command.CreateCommentCommand{PostID: postID, AuthorID: authorID, Content: "test"})

	assert.Error(t, err)
	assert.Nil(t, got)
	assert.True(t, errs.IsNotFound(err))
}

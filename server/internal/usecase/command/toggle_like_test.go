package command_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestToggleLike_Like(t *testing.T) {
	likes := new(mocks.MockLikeRepository)
	userID := uuid.New()
	targetID := uuid.New()

	likes.On("Toggle", mock.Anything, userID, targetID, repository.TargetPost).Return(true, 5, nil)

	h := command.NewToggleLikeHandler(likes)
	got, err := h.Handle(context.Background(), command.ToggleLikeCommand{UserID: userID, TargetID: targetID, TargetType: repository.TargetPost})

	assert.NoError(t, err)
	assert.NotNil(t, got)
	assert.True(t, got.Liked)
	assert.Equal(t, 5, got.LikeCount)
}

func TestToggleLike_Unlike(t *testing.T) {
	likes := new(mocks.MockLikeRepository)
	userID := uuid.New()
	targetID := uuid.New()

	likes.On("Toggle", mock.Anything, userID, targetID, repository.TargetEssay).Return(false, 4, nil)

	h := command.NewToggleLikeHandler(likes)
	got, err := h.Handle(context.Background(), command.ToggleLikeCommand{UserID: userID, TargetID: targetID, TargetType: repository.TargetEssay})

	assert.NoError(t, err)
	assert.NotNil(t, got)
	assert.False(t, got.Liked)
	assert.Equal(t, 4, got.LikeCount)
}

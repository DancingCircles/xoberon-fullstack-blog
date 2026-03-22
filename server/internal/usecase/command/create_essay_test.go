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
)

func TestCreateEssay_Success(t *testing.T) {
	essayRepo := new(mocks.MockEssayRepository)
	cache := new(mocks.MockEssayCache)
	moderator := new(mocks.MockContentModerator)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	essayRepo.On("Save", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidateAll", mock.Anything).Return(nil)
	essayRepo.On("FindByID", mock.Anything, mock.Anything).Return(nil, fmt.Errorf("not critical"))

	h := command.NewCreateEssayHandler(essayRepo, cache, moderator)
	essay, err := h.Handle(context.Background(), command.CreateEssayCommand{
		AuthorID: uuid.New(),
		Title:    "Test Essay",
		Excerpt:  "A short excerpt",
		Content:  "This is essay content that is long enough to pass validation.",
	})

	assert.NoError(t, err)
	assert.NotNil(t, essay)
}

func TestCreateEssay_EmptyTitle(t *testing.T) {
	essayRepo := new(mocks.MockEssayRepository)
	cache := new(mocks.MockEssayCache)
	moderator := new(mocks.MockContentModerator)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)

	h := command.NewCreateEssayHandler(essayRepo, cache, moderator)
	_, err := h.Handle(context.Background(), command.CreateEssayCommand{
		AuthorID: uuid.New(),
		Title:    "",
		Content:  "Some content here.",
	})

	assert.Error(t, err)
}

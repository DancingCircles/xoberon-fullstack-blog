package command_test

import (
	"context"
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

func TestUpdateEssay_Success(t *testing.T) {
	essayRepo := new(mocks.MockEssayRepository)
	cache := new(mocks.MockEssayCache)
	moderator := new(mocks.MockContentModerator)

	authorID := uuid.New()
	essayID := uuid.New()
	existingEssay := entity.ReconstructEssay(
		essayID, authorID,
		"Old Title", "Old excerpt", "Old content long enough for test",
		0, "X", "/avatars/1.png", "@testuser", "published",
		time.Now(), time.Now(),
	)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	essayRepo.On("FindByID", mock.Anything, essayID).Return(existingEssay, nil)
	essayRepo.On("Update", mock.Anything, mock.Anything).Return(nil)
	cache.On("InvalidateEssay", mock.Anything, mock.Anything).Return(nil)

	role, _ := valueobject.NewRole("user")
	h := command.NewUpdateEssayHandler(essayRepo, cache, moderator)
	essay, err := h.Handle(context.Background(), command.UpdateEssayCommand{
		EssayID:    essayID,
		EditorID:   authorID,
		EditorRole: role,
		Title:      "New Title",
		Excerpt:    "New excerpt",
		Content:    "New content that is long enough to pass validation for essays.",
	})

	assert.NoError(t, err)
	assert.NotNil(t, essay)
}

func TestUpdateEssay_NotFound(t *testing.T) {
	essayRepo := new(mocks.MockEssayRepository)
	cache := new(mocks.MockEssayCache)
	moderator := new(mocks.MockContentModerator)

	moderator.On("Check", mock.Anything, mock.Anything).Return(&service.ModerationResult{Decision: service.DecisionApprove}, nil)
	essayRepo.On("FindByID", mock.Anything, mock.Anything).Return(nil, errs.NotFound("随笔不存在"))

	role, _ := valueobject.NewRole("user")
	h := command.NewUpdateEssayHandler(essayRepo, cache, moderator)
	_, err := h.Handle(context.Background(), command.UpdateEssayCommand{
		EssayID:    uuid.New(),
		EditorID:   uuid.New(),
		EditorRole: role,
		Title:      "Title",
		Content:    "Content long enough for validation.",
	})

	assert.Error(t, err)
	assert.True(t, errs.IsNotFound(err))
}

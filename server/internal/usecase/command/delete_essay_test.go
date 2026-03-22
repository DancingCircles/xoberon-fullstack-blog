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
	"xoberon-server/internal/domain/valueobject"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestDeleteEssay_Success(t *testing.T) {
	essayRepo := new(mocks.MockEssayRepository)
	cache := new(mocks.MockEssayCache)

	authorID := uuid.New()
	essayID := uuid.New()
	existingEssay := entity.ReconstructEssay(
		essayID, authorID,
		"Title", "Excerpt", "Content long enough for test",
		0, "X", "/avatars/1.png", "@testuser", "published",
		time.Now(), time.Now(),
	)

	essayRepo.On("FindByID", mock.Anything, essayID).Return(existingEssay, nil)
	essayRepo.On("Delete", mock.Anything, essayID).Return(nil)
	cache.On("InvalidateEssay", mock.Anything, mock.Anything).Return(nil)

	role, _ := valueobject.NewRole("user")
	h := command.NewDeleteEssayHandler(essayRepo, cache)
	err := h.Handle(context.Background(), command.DeleteEssayCommand{
		EssayID:       essayID,
		RequesterID:   authorID,
		RequesterRole: role,
	})

	assert.NoError(t, err)
}

func TestDeleteEssay_NotFound(t *testing.T) {
	essayRepo := new(mocks.MockEssayRepository)
	cache := new(mocks.MockEssayCache)

	essayRepo.On("FindByID", mock.Anything, mock.Anything).Return(nil, errs.NotFound("随笔不存在"))

	role, _ := valueobject.NewRole("user")
	h := command.NewDeleteEssayHandler(essayRepo, cache)
	err := h.Handle(context.Background(), command.DeleteEssayCommand{
		EssayID:       uuid.New(),
		RequesterID:   uuid.New(),
		RequesterRole: role,
	})

	assert.Error(t, err)
	assert.True(t, errs.IsNotFound(err))
}

package query

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/mocks"
)

func TestGetEssay_Success(t *testing.T) {
	mockRepo := new(mocks.MockEssayRepository)
	mockCache := new(mocks.MockEssayCache)

	essayID := uuid.New()
	essay := entity.ReconstructEssay(
		essayID, uuid.New(),
		"Test Essay", "excerpt", "content body", 5,
		"X", "", "x", "published",
		time.Now(), time.Now(),
	)

	mockCache.On("GetDetail", mock.Anything, essayID.String()).Return(nil, nil)
	mockRepo.On("FindByID", mock.Anything, essayID).Return(essay, nil)
	mockCache.On("SetDetail", mock.Anything, essayID.String(), mock.Anything).Return(nil)

	h := NewGetEssayHandler(mockRepo, mockCache)
	result, err := h.Handle(context.Background(), essayID)

	assert.NoError(t, err)
	assert.NotNil(t, result)
	assert.Equal(t, "Test Essay", result.Title())
	assert.Equal(t, 5, result.LikeCount())
}

func TestGetEssay_NotFound(t *testing.T) {
	mockRepo := new(mocks.MockEssayRepository)
	mockCache := new(mocks.MockEssayCache)

	essayID := uuid.New()

	mockCache.On("GetDetail", mock.Anything, essayID.String()).Return(nil, nil)
	mockRepo.On("FindByID", mock.Anything, essayID).Return(nil, errs.NotFound("随笔不存在"))
	mockCache.On("SetNullMarker", mock.Anything, essayID.String()).Return(nil)

	h := NewGetEssayHandler(mockRepo, mockCache)
	result, err := h.Handle(context.Background(), essayID)

	assert.Nil(t, result)
	assert.Error(t, err)
	appErr, ok := err.(*errs.AppError)
	assert.True(t, ok)
	assert.Equal(t, errs.CodeNotFound, appErr.Code())
}

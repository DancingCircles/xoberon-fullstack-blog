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

func TestListEssays_Success(t *testing.T) {
	mockRepo := new(mocks.MockEssayRepository)
	mockCache := new(mocks.MockEssayCache)

	essay := entity.ReconstructEssay(
		uuid.New(), uuid.New(),
		"Test Essay", "excerpt", "essay content body", 0,
		"X", "", "x", "published",
		time.Now(), time.Now(),
	)

	mockCache.On("GetList", mock.Anything, mock.Anything).Return(nil, nil)
	mockRepo.On("List", mock.Anything, mock.Anything, 1, 10).Return([]*entity.Essay{essay}, int64(1), nil)
	mockCache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	h := NewListEssaysHandler(mockRepo, mockCache)
	essays, total, err := h.Handle(context.Background(), ListEssaysQuery{Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, essays, 1)
	assert.Equal(t, "Test Essay", essays[0].Title())
}

func TestListEssays_EmptyResult(t *testing.T) {
	mockRepo := new(mocks.MockEssayRepository)
	mockCache := new(mocks.MockEssayCache)

	mockCache.On("GetList", mock.Anything, mock.Anything).Return(nil, nil)
	mockRepo.On("List", mock.Anything, mock.Anything, 1, 10).Return([]*entity.Essay{}, int64(0), nil)
	mockCache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	h := NewListEssaysHandler(mockRepo, mockCache)
	essays, total, err := h.Handle(context.Background(), ListEssaysQuery{Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(0), total)
	assert.Empty(t, essays)
}

func TestListEssays_WithKeyword(t *testing.T) {
	mockRepo := new(mocks.MockEssayRepository)
	mockCache := new(mocks.MockEssayCache)
	kw := "golang"

	essay := entity.ReconstructEssay(
		uuid.New(), uuid.New(),
		"Golang Essay", "go excerpt", "golang content", 3,
		"X", "", "x", "published",
		time.Now(), time.Now(),
	)

	mockCache.On("GetList", mock.Anything, mock.Anything).Return(nil, nil)
	mockRepo.On("List", mock.Anything, mock.Anything, 1, 10).Return([]*entity.Essay{essay}, int64(1), nil)
	mockCache.On("SetList", mock.Anything, mock.Anything, mock.Anything).Return(nil)

	h := NewListEssaysHandler(mockRepo, mockCache)
	essays, total, err := h.Handle(context.Background(), ListEssaysQuery{Keyword: &kw, Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, essays, 1)
}

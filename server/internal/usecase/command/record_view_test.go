package command_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestRecordView_Success(t *testing.T) {
	views := new(mocks.MockViewRepository)
	posts := new(mocks.MockPostRepository)
	userID := uuid.New()
	postID := uuid.New()

	post := entity.ReconstructPost(postID, uuid.New(), "title", "slug", "excerpt", "content", "Tech", nil, 0, 1, "X", "/a.png", "@x", "published", time.Now(), time.Now())
	posts.On("FindByID", mock.Anything, postID).Return(post, nil)
	views.On("Upsert", mock.Anything, userID, postID).Return(nil)

	h := command.NewRecordViewHandler(views, posts)
	err := h.Handle(context.Background(), command.RecordViewCommand{UserID: userID, PostID: postID})

	assert.NoError(t, err)
}

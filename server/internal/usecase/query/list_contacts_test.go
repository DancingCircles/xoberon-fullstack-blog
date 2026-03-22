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

func TestListContacts_Success(t *testing.T) {
	mockRepo := new(mocks.MockContactRepository)

	contact := entity.ReconstructContact(
		uuid.New(), "X", "x@example.com", "Hello!", false, time.Now(),
	)

	mockRepo.On("List", mock.Anything, 1, 10).Return([]*entity.Contact{contact}, int64(1), nil)

	h := NewListContactsHandler(mockRepo)
	contacts, total, err := h.Handle(context.Background(), ListContactsQuery{Page: 1, PageSize: 10})

	assert.NoError(t, err)
	assert.Equal(t, int64(1), total)
	assert.Len(t, contacts, 1)
}

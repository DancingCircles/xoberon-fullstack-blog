package command_test

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestMarkContactRead_Success(t *testing.T) {
	contacts := new(mocks.MockContactRepository)
	contactID := uuid.New()

	contacts.On("MarkRead", mock.Anything, contactID).Return(nil)

	h := command.NewMarkContactReadHandler(contacts)
	err := h.Handle(context.Background(), command.MarkContactReadCommand{ContactID: contactID})

	assert.NoError(t, err)
}

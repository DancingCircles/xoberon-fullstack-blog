package command_test

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"

	"xoberon-server/internal/mocks"
	"xoberon-server/internal/usecase/command"
)

func TestSubmitContact_Success(t *testing.T) {
	contacts := new(mocks.MockContactRepository)

	contacts.On("Save", mock.Anything, mock.Anything).Return(nil)

	h := command.NewSubmitContactHandler(contacts)
	err := h.Handle(context.Background(), command.SubmitContactCommand{Name: "X", Email: "x@example.com", Message: "Hello"})

	assert.NoError(t, err)
}

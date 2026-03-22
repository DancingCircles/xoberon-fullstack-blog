package command

import (
	"context"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type SubmitContactCommand struct {
	Name    string
	Email   string
	Message string
}

type SubmitContactHandler struct {
	contacts repository.ContactRepository
}

func NewSubmitContactHandler(contacts repository.ContactRepository) *SubmitContactHandler {
	return &SubmitContactHandler{contacts: contacts}
}

func (h *SubmitContactHandler) Handle(ctx context.Context, cmd SubmitContactCommand) error {
	contact, err := entity.NewContact(cmd.Name, cmd.Email, cmd.Message)
	if err != nil {
		return err
	}

	return h.contacts.Save(ctx, contact)
}

package command

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/repository"
)

type MarkContactReadCommand struct {
	ContactID uuid.UUID
}

type MarkContactReadHandler struct {
	contacts repository.ContactRepository
}

func NewMarkContactReadHandler(contacts repository.ContactRepository) *MarkContactReadHandler {
	return &MarkContactReadHandler{contacts: contacts}
}

func (h *MarkContactReadHandler) Handle(ctx context.Context, cmd MarkContactReadCommand) error {
	return h.contacts.MarkRead(ctx, cmd.ContactID)
}

package query

import (
	"context"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type ListContactsQuery struct {
	Page     int
	PageSize int
}

type ListContactsHandler struct {
	contacts repository.ContactRepository
}

func NewListContactsHandler(contacts repository.ContactRepository) *ListContactsHandler {
	return &ListContactsHandler{contacts: contacts}
}

func (h *ListContactsHandler) Handle(ctx context.Context, q ListContactsQuery) ([]*entity.Contact, int64, error) {
	return h.contacts.List(ctx, q.Page, q.PageSize)
}

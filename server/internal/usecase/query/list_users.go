package query

import (
	"context"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type ListUsersQuery struct {
	Page     int
	PageSize int
}

type ListUsersHandler struct {
	users repository.UserRepository
}

func NewListUsersHandler(users repository.UserRepository) *ListUsersHandler {
	return &ListUsersHandler{users: users}
}

func (h *ListUsersHandler) Handle(ctx context.Context, q ListUsersQuery) ([]*entity.User, int64, error) {
	return h.users.List(ctx, q.Page, q.PageSize)
}

func (h *ListUsersHandler) HandleWithCounts(ctx context.Context, q ListUsersQuery) ([]repository.UserWithCounts, int64, error) {
	return h.users.ListWithCounts(ctx, q.Page, q.PageSize)
}

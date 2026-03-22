package query

import (
	"context"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type SearchUsersHandler struct {
	users repository.UserRepository
}

func NewSearchUsersHandler(users repository.UserRepository) *SearchUsersHandler {
	return &SearchUsersHandler{users: users}
}

func (h *SearchUsersHandler) Handle(ctx context.Context, query string) ([]*entity.User, error) {
	if query == "" {
		return []*entity.User{}, nil
	}
	return h.users.Search(ctx, query)
}

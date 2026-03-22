package query

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type UserProfileResult struct {
	User       *entity.User
	PostCount  int64
	EssayCount int64
}

type GetUserProfileHandler struct {
	users  repository.UserRepository
	posts  repository.PostRepository
	essays repository.EssayRepository
}

func NewGetUserProfileHandler(
	users repository.UserRepository,
	posts repository.PostRepository,
	essays repository.EssayRepository,
) *GetUserProfileHandler {
	return &GetUserProfileHandler{users: users, posts: posts, essays: essays}
}

func (h *GetUserProfileHandler) Handle(ctx context.Context, handle string) (*UserProfileResult, error) {
	user, err := h.users.FindByHandle(ctx, handle)
	if err != nil {
		return nil, err
	}

	filter := repository.PostFilter{AuthorID: &[]uuid.UUID{user.ID()}[0]}
	_, postCount, err := h.posts.List(ctx, filter, 1, 1)
	if err != nil {
		return nil, err
	}

	essayFilter := repository.EssayFilter{AuthorID: &[]uuid.UUID{user.ID()}[0]}
	_, essayCount, err := h.essays.List(ctx, essayFilter, 1, 1)
	if err != nil {
		return nil, err
	}

	return &UserProfileResult{
		User:       user,
		PostCount:  postCount,
		EssayCount: essayCount,
	}, nil
}

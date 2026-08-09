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

	return h.profileForUser(ctx, user)
}

func (h *GetUserProfileHandler) HandleByID(ctx context.Context, id uuid.UUID) (*UserProfileResult, error) {
	user, err := h.users.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	return h.profileForUser(ctx, user)
}

func (h *GetUserProfileHandler) profileForUser(ctx context.Context, user *entity.User) (*UserProfileResult, error) {
	userID := user.ID()
	filter := repository.PostFilter{AuthorID: &userID}
	_, postCount, err := h.posts.List(ctx, filter, 1, 1)
	if err != nil {
		return nil, err
	}

	essayFilter := repository.EssayFilter{AuthorID: &userID}
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

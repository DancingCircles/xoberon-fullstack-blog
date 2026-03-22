package command

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/repository"
)

type UpdateProfileCommand struct {
	UserID uuid.UUID
	Name   string
	Bio    string
	Avatar string
}

type UpdateProfileHandler struct {
	users repository.UserRepository
}

func NewUpdateProfileHandler(users repository.UserRepository) *UpdateProfileHandler {
	return &UpdateProfileHandler{users: users}
}

func (h *UpdateProfileHandler) Handle(ctx context.Context, cmd UpdateProfileCommand) (*entity.User, error) {
	user, err := h.users.FindByID(ctx, cmd.UserID)
	if err != nil {
		return nil, err
	}

	if err := user.UpdateProfile(cmd.Name, cmd.Bio, cmd.Avatar); err != nil {
		return nil, err
	}

	if err := h.users.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

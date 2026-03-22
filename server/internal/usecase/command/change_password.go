package command

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/repository"
)

type ChangePasswordCommand struct {
	UserID      uuid.UUID
	OldPassword string
	NewPassword string
}

type ChangePasswordHandler struct {
	userRepo repository.UserRepository
}

func NewChangePasswordHandler(userRepo repository.UserRepository) *ChangePasswordHandler {
	return &ChangePasswordHandler{userRepo: userRepo}
}

func (h *ChangePasswordHandler) Handle(ctx context.Context, cmd ChangePasswordCommand) error {
	user, err := h.userRepo.FindByIDWithPassword(ctx, cmd.UserID)
	if err != nil {
		return err
	}

	if err := user.ChangePassword(cmd.OldPassword, cmd.NewPassword); err != nil {
		return err
	}

	return h.userRepo.UpdatePassword(ctx, cmd.UserID, user.PasswordHash())
}

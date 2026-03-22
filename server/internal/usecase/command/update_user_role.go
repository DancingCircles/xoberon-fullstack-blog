package command

import (
	"context"

	"github.com/google/uuid"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/domain/valueobject"
)

type UpdateUserRoleCommand struct {
	TargetUserID uuid.UUID
	NewRole      string
}

type UpdateUserRoleHandler struct {
	users repository.UserRepository
}

func NewUpdateUserRoleHandler(users repository.UserRepository) *UpdateUserRoleHandler {
	return &UpdateUserRoleHandler{users: users}
}

func (h *UpdateUserRoleHandler) Handle(ctx context.Context, cmd UpdateUserRoleCommand) (*entity.User, error) {
	role, err := valueobject.NewRole(cmd.NewRole)
	if err != nil {
		return nil, errs.Validationf("无效的角色值：%s，有效值为 user 或 admin", cmd.NewRole)
	}

	user, err := h.users.FindByID(ctx, cmd.TargetUserID)
	if err != nil {
		return nil, err
	}

	user.PromoteTo(role)

	if err := h.users.Update(ctx, user); err != nil {
		return nil, errs.Wrap(errs.CodeInternal, "更新用户角色失败", err)
	}

	return user, nil
}

package command

import (
	"context"

	"xoberon-server/internal/domain/entity"
	"xoberon-server/internal/domain/errs"
	"xoberon-server/internal/domain/repository"
	"xoberon-server/internal/infra/auth"
)

type RegisterCommand struct {
	Username string
	Email    string
	Password string
	Name     string
}

type RegisterResult struct {
	Token string
	User  *entity.User
}

type RegisterHandler struct {
	users repository.UserRepository
	jwt   *auth.JWTManager
}

func NewRegisterHandler(users repository.UserRepository, jwt *auth.JWTManager) *RegisterHandler {
	return &RegisterHandler{users: users, jwt: jwt}
}

func (h *RegisterHandler) Handle(ctx context.Context, cmd RegisterCommand) (*RegisterResult, error) {
	user, err := entity.NewUser(cmd.Username, cmd.Email, cmd.Password, cmd.Name)
	if err != nil {
		return nil, err
	}

	if err := h.users.Save(ctx, user); err != nil {
		if appErr, ok := err.(*errs.AppError); ok && appErr.Code() == errs.CodeConflict {
			return nil, errs.Conflict("注册信息无效，请检查后重试")
		}
		return nil, err
	}

	token, err := h.jwt.GenerateAccessToken(user.ID(), user.Username(), user.Role().String())
	if err != nil {
		return nil, err
	}

	return &RegisterResult{Token: token, User: user}, nil
}
